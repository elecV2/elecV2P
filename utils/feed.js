const RSS = require('rss')
const axios = require('axios')

const { now } = require('./time')

const { logger } = require('./logger')
const clog = new logger({ head: 'utilsFeed', level: 'debug' })

const { CONFIG } = require('../config')

const CONFIG_FEED = {
  enable: true,              // 关闭/开启 feed
  homepage: 'https://github.com/elecV2/elecV2P',              // feed 主页。
  iftttid: '',               // 关闭/开启 ifttt 通知
  ismerge: true,             // 是否合并一定时间内的通知
  mergetime: 60,             // 合并多少时间内的通知，单位：秒
  mergenum: 10,              // 最大合并通知条数
  andor: false,              // 上面两项的逻辑。 true: 同时满足，false: 满足任一项
}

if (CONFIG.CONFIG_FEED) {
  Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
} else {
  CONFIG.CONFIG_FEED = CONFIG_FEED
}

function feedNew({ title = 'elecV2P notification', description = 'elecV2P 运行记录通知', ttl = 10 }) {
  // clog.notify(title, '生成新的 feed')
  return new RSS({
    title,
    description,
    site_url: CONFIG_FEED.homepage,
    feed_url: CONFIG_FEED.homepage + '/feed',
    docs: 'https://github.com/elecV2/elecV2P-dei/tree/master/docs/07-feed&notify.md',
    language: 'zh-CN',
    ttl,
  })
}
let feed = feedNew({})

function iftttPush(title, description, url) {
  if (CONFIG_FEED.iftttid) {
    const body = {
      value1: title
    }
    if (description) body.value2 = description
    if (url) body.value3 = url.url || url["open-url"] || url["media-url"] || url
    clog.notify('ifttt webhook trigger, send data:', body)
    axios.post('https://maker.ifttt.com/trigger/elecV2P/with/key/' + CONFIG_FEED.iftttid, body).then(res=>{
      clog.debug('iftttPush result:', res.data)
    }).catch(e=>{
      clog.error(e)
    })
  } else {
    clog.notify('Have no IFTTT id yet, skip IFTTT push')
  }
}

function feedPush(title, description, url) {
  if (title === undefined) return
  const date = new Date()
  const guid = String(date.getTime())
  url = url ? url.url || url["open-url"] || url["media-url"] || url : url
  clog.notify('添加 item', title, description)
  feed.item({
    title,
    description,
    url: url || CONFIG_FEED.homepage + '/feed/?new=' + guid,
    guid,
    author: 'elecV2P',
    date: String(date)
  })
  iftttPush(title, description, url)
}

const mergefeed = {
  content: [],               // 合并通知的内容
  push(){
    feedPush('elecV2P 合并通知 ' + this.content.length, this.content.join('\n'))
    this.content = []
    this.timefulled = false
    if (this.setTime) {
      clearTimeout(this.setTime)
      delete this.setTime
    }
  }
}

function feedAddItem(title = 'elecV2P notification', description =  '通知内容', url = CONFIG_FEED.homepage + '/feed/?new=' + new Date().getTime()) {
  if (/test/.test(title)) return
  if (CONFIG_FEED.ismerge) {
    mergefeed.content.push(title + ' - ' + now() + '\n' + description + '\n')
    if (!(mergefeed.timefulled || mergefeed.setTime)) {
      mergefeed.setTime = setTimeout(()=>{
        if (!CONFIG_FEED.andor || mergefeed.content.length >= Number(CONFIG_FEED.mergenum)) {
          mergefeed.push()
        } else {
          mergefeed.timefulled = true
        }
      }, Number(CONFIG_FEED.mergetime)*1000)
    }
    if ((!CONFIG_FEED.andor || mergefeed.timefulled) && mergefeed.content.length >= Number(CONFIG_FEED.mergenum)) {
      mergefeed.push()
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

module.exports = { CONFIG_FEED, feedAddItem, iftttPush, feedPush, feedXml, feedClear }