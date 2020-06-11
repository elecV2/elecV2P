const RSS = require('rss')
const axios = require('axios')

const { now } = require('./time')

const logger = require('./logger')
const clog = new logger({ head: 'feed', level: 'debug' })

function feedNew({ title, description, site_url, feed_url }) {
  // clog.notify(title, '生成新的 feed')
  return new RSS({
    title: title || 'elecV2P notification',
    description: description || 'elecV2P 运行记录通知',
    site_url: site_url || 'https://github.com/elecV2',
    feed_url: feed_url || 'https://github.com/elecV2',
    docs: 'https://github.com/elecV2',
    language: 'zh-CN',
    ttl: 10
  })
}
let feed = feedNew({})

const CONFIG_FEED = {
  enable: true,              // 关闭/开启 feed
  iftttid: '',               // 关闭/开启 ifttt 通知
  ismerge: true,             // 是否合并一定时间内的通知
  mergetime: 60,             // 合并多少时间内的通知，单位：秒
  mergenum: 10,              // 最大合并通知条数。与合并时间，先满足先执行
}

function iftttPush(title, description, url) {
  if (CONFIG_FEED.iftttid) {
    clog.notify('ifttt webhook trigger:', title, description)
    axios.post('https://maker.ifttt.com/trigger/elecV2P/with/key/' + CONFIG_FEED.iftttid, { value1: title, value2: description, value3: url }).then(res=>{
      clog.debug(res.data)
    }).catch(e=>{
      clog.error(e)
    })
  }
}

function feedPush(title, description, url) {
  if (!title || !description) return
  clog.notify('添加 item', title, description)
  feed.item({
    title,
    description,
    url,
    guid: String(new Date().getTime()),
    author: 'elecV2P',
    date: Date()
  })
  iftttPush(title, description, url)
}

const mergefeed = {
  content: [],               // 合并通知的内容
}

function feedAddItem(title = 'elecV2P notification', description =  '通知内容', url = 'https://github.com/elecV2/elecV2P/' + new Date().getTime()) {
  if (/test/.test(title)) return
  if (CONFIG_FEED.ismerge) {
    mergefeed.content.push(title + ' - ' + now() + '\n' + description + '\n')
    if (mergefeed.setTime) {
      if (mergefeed.content.length >= CONFIG_FEED.mergenum) {
        feedPush('elecV2P 合并通知 ' + mergefeed.content.length, mergefeed.content.join('\n'))
        clearTimeout(mergefeed.setTime)
        delete mergefeed.setTime
        mergefeed.content = []
      }
    } else {
      mergefeed.setTime = setTimeout(()=>{
        feedPush('elecV2P 合并通知 ' + mergefeed.content.length, mergefeed.content.join('\n'), 'https://github.com/elecV2/elecV2P')
        delete mergefeed.setTime
        mergefeed.content = []
      }, CONFIG_FEED.mergetime*1000)
    }
  } else {
    feedPush(title, description, url)
  }
}

function feedXml() {
  if (CONFIG_FEED.enable) {
    return feed.xml()
  }
  return ''
}

function feedClear() {
  feed = feedNew({})
  clog.notify('feed 内容已清空')
}

module.exports = { CONFIG_FEED, feedAddItem, feedNew, feedPush, feedXml, feedClear }