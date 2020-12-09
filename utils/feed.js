const qs = require('qs')
const RSS = require('rss')
const axios = require('axios')

const { now } = require('./time')
const { sType, bEmpty } = require('./string')
const { logger } = require('./logger')
const clog = new logger({ head: 'utilsFeed', level: 'debug' })

const { CONFIG } = require('../config')

const CONFIG_FEED = {
  enable: true,              // 关闭/开启 FEED
  homepage: 'https://github.com/elecV2/elecV2P',  // FEED 主页。
  iftttid: {enable: true, key: ''},               // 关闭/开启 IFTTT 通知
  barkkey: {enable: false, key: ''},              // 关闭/开启 BARK 通知
  sckey:   {enable: false, key: ''},              // 关闭/开启 SERVER 酱通知
  merge: {
    enable: true,              // 是否合并一定时间内的通知
    gaptime: 60,               // 合并多少时间内的通知，单位：秒
    number: 10,                // 最大合并通知条数
    andor: false,              // 上面两项的逻辑。 true: 同时满足，false: 满足任一项
  }          
}

if (CONFIG.CONFIG_FEED) {
  // 兼容 2.8.1 之前的版本
  if (typeof CONFIG.CONFIG_FEED.iftttid === 'string') CONFIG.CONFIG_FEED.iftttid = { enable: true, key: CONFIG.CONFIG_FEED.iftttid }
  Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
} else {
  CONFIG.CONFIG_FEED = CONFIG_FEED
}

function feedNew({ title = 'elecV2P notification', description = 'elecV2P 运行记录通知', ttl = 10 }) {
  clog.debug('a new feed:', title)
  const date = new Date()
  return new RSS({
    title, description,
    site_url: CONFIG_FEED.homepage,
    feed_url: CONFIG_FEED.homepage + '/feed',
    docs: 'https://github.com/elecV2/elecV2P-dei/tree/master/docs/07-feed&notify.md',
    language: 'zh-CN', ttl,
    pubDate: date.getTime() - date.getTimezoneOffset()*60*1000
  })
}
let feed = feedNew({})

function formUrl(url) {
  if (!url) return
  if (sType(url) === 'object') {
    return Object.keys(url).length ? (url.url || url["open-url"] || url["media-url"] || url.openUrl || url.mediaUrl) : undefined
  }
  if (sType(url) === 'string') return url
}

function iftttPush(title, description, url) {
  if (CONFIG_FEED.iftttid && CONFIG_FEED.iftttid.enable && CONFIG_FEED.iftttid.key) {
    if (bEmpty(title)) title = 'elecV2P 通知'
    if (bEmpty(description)) description = 'a empty message.\n没有任何通知内容。'
    const body = {
      value1: title
    }
    if (description) body.value2 = description
    url = formUrl(url)
    if (url) body.value3 = encodeURI(url)
    clog.notify('ifttt webhook trigger, send data:', body)
    axios.post('https://maker.ifttt.com/trigger/elecV2P/with/key/' + CONFIG_FEED.iftttid.key, body).then(res=>{
      clog.debug('iftttPush result:', res.data)
    }).catch(e=>{
      if (e.response) clog.error(e.response.data)
      else clog.error(e.message)
    })
  } else {
    clog.debug('IFTTT not available yet, skip IFTTT push')
  }
}

function barkPush(title, description, url) {
  if (CONFIG_FEED.barkkey && CONFIG_FEED.barkkey.enable && CONFIG_FEED.barkkey.key) {
    if (bEmpty(title)) title = 'elecV2P 通知'
    if (bEmpty(description)) description = 'a empty message.\n没有任何通知内容。'
    let pushurl = `https://api.day.app/${CONFIG_FEED.barkkey.key}/`
    url = formUrl(url)
    if (url) {
      pushurl += '?url=' + url
    }
    clog.notify('bark notify:', title, description, url)
    axios({
      url: pushurl,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      data: `title=${encodeURI(title)}&body=${encodeURI(description)}`
    }).then(res=>{
      clog.debug('barkPush result:', res.data)
    }).catch(e=>{
      if (e.response) clog.error(e.response.data)
      else clog.error(e.message)
    })
  } else {
    clog.debug('bark not available yet, skip push bark notifications.')
  }
}

function schanPush(title, description, url) {
  if (CONFIG_FEED.sckey && CONFIG_FEED.sckey.enable && CONFIG_FEED.sckey.key) {
    if (bEmpty(title)) title = 'elecV2P 通知'
    if (bEmpty(description)) description = 'a empty message.\n没有任何通知内容。'
    const body = {
      "text": title,
      "desp": description
    }
    if (url) {
      if (url["media-url"]) body.desp += '\n![](' + url["media-url"] + ')'
      url = formUrl(url)
      body.desp += `\n[${url}](${url})`
    }
    clog.notify('server chan push:', title, description, url)
    axios({
      url: `https://sc.ftqq.com/${CONFIG_FEED.sckey.key}.send`,
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      data: qs.stringify(body)
    }).then(res=>{
      clog.debug('server chan result:', res.data)
    }).catch(e=>{
      if (e.response) clog.error(e.response.data)
      else clog.error(e.message)
    })
  } else {
    clog.debug('server chan not available yet, skip server chan push.')
  }
}

function feedPush(title, description, url) {
  if (bEmpty(title)) title = 'elecV2P 通知'
  if (bEmpty(description)) description = 'a empty message.\n没有任何通知内容。'

  if (CONFIG_FEED.enable) {
    const date = new Date()
    const guid = date.getTime() - date.getTimezoneOffset()*60*1000
    clog.notify('add feed item', title, description)
    feed.item({
      title, description,
      url: formUrl(url) || CONFIG_FEED.homepage + '/feed/?new=' + guid,
      guid, author: 'elecV2P',
      date: guid,
    })
  }
  iftttPush(title, description, url)
  barkPush(title, description, url)
  schanPush(title, description, url)
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

function feedAddItem(title = 'elecV2P notification', description =  '通知内容', url) {
  if (/test/.test(title)) return
  if (CONFIG_FEED.merge.enable) {
    mergefeed.content.push(title + ' - ' + now() + '\n' + description + '\n')
    if (!(mergefeed.timefulled || mergefeed.setTime)) {
      mergefeed.setTime = setTimeout(()=>{
        if (!CONFIG_FEED.merge.andor || mergefeed.content.length >= Number(CONFIG_FEED.merge.number)) {
          mergefeed.push()
        } else {
          mergefeed.timefulled = true
        }
      }, Number(CONFIG_FEED.merge.gaptime)*1000)
    }
    if ((!CONFIG_FEED.merge.andor || mergefeed.timefulled) && mergefeed.content.length >= Number(CONFIG_FEED.merge.number)) {
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

module.exports = { CONFIG_FEED, feedAddItem, iftttPush, barkPush, schanPush, feedPush, feedXml, feedClear }