const qs = require('qs')
const RSS = require('rss')

const { message } = require('./websocket')
const { eAxios: axios } = require('./eaxios')
const { now } = require('./time')
const { sType, sString, sJson, bEmpty } = require('./string')
const { logger } = require('./logger')
const clog = new logger({ head: 'utilsFeed', level: 'debug' })

const { CONFIG } = require('../config')

const CONFIG_FEED = {
  enable: true,              // 关闭/开启 FEED
  homepage: 'https://github.com/elecV2/elecV2P',  // FEED 主页。
  iftttid: {enable: true, key: ''},               // 关闭/开启 IFTTT 通知
  barkkey: {enable: false, key: ''},              // 关闭/开启 BARK 通知
  custnotify: {
    enable: false,
    url: '',
    type: 'GET',
    data: ''
  },
  merge: {
    enable: true,              // 是否合并一定时间内的通知
    gaptime: 60,               // 合并多少时间内的通知，单位：秒
    number: 10,                // 最大合并通知条数
    andor: false,              // 上面两项的逻辑。 true: 同时满足，false: 满足任一项
  },
  maxbLength: 1200,            // 通知主体最大长度。（超过后会分段发送）
  webmessage: {
    enable: false,             // 是否在网页前端显示通知
  }
}

if (CONFIG.CONFIG_FEED) {
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
  if (bEmpty(url)) return
  if (sType(url) === 'object') {
    return Object.keys(url).length ? (url.url || url["open-url"] || url["media-url"] || url.openUrl || url.mediaUrl) : undefined
  }
  if (sType(url) === 'string') return url.trim()
}

function iftttPush(title, description, url) {
  if (CONFIG_FEED.iftttid && CONFIG_FEED.iftttid.enable && CONFIG_FEED.iftttid.key) {
    if (bEmpty(title)) {
      title = 'elecV2P 通知'
    } else {
      title = sString(title).trim()
    }
    if (bEmpty(description)) {
      description = 'a empty message.\n没有任何通知内容。'
    } else {
      description = sString(description).trim()
    }
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
      if (e.response) clog.error('iftttPush error:', e.response.data)
      else clog.error('iftttPush error:', e.message)
    })
  } else {
    clog.debug('IFTTT not available yet, skip IFTTT push')
  }
}

function barkPush(title, description, url) {
  if (CONFIG_FEED.barkkey && CONFIG_FEED.barkkey.enable && CONFIG_FEED.barkkey.key) {
    if (bEmpty(title)) {
      title = 'elecV2P 通知'
    } else {
      title = sString(title).trim()
    }
    if (bEmpty(description)) {
      description = 'a empty message.\n没有任何通知内容。'
    } else {
      description = sString(description).trim()
    }
    let pushurl = ''
    if (CONFIG_FEED.barkkey.key.startsWith('http')) {
      pushurl = CONFIG_FEED.barkkey.key
      if (pushurl.endsWith('/') === false) pushurl += '/'
    } else {
      pushurl = `https://api.day.app/${CONFIG_FEED.barkkey.key}/`
    }
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
      if (e.response) clog.error('barkPush error:', e.response.data)
      else clog.error('barkPush error:', e.message)
    })
  } else {
    clog.debug('bark not available yet, skip push bark notifications.')
  }
}

function custPush(title, description, url) {
  if (CONFIG_FEED.custnotify && CONFIG_FEED.custnotify.enable && CONFIG_FEED.custnotify.url) {
    if (bEmpty(title)) {
      title = 'elecV2P 通知'
    } else {
      title = sString(title).trim()
    }
    if (bEmpty(description)) {
      description = 'a empty message.\n没有任何通知内容。'
    } else {
      description = sString(description)
    }
    let req = {
      url: CONFIG_FEED.custnotify.url,
      headers: {},
      method: CONFIG_FEED.custnotify.type,
      data: sString(CONFIG_FEED.custnotify.data)
    }
    url = formUrl(url)
    req.url = req.url.replaceAll('$title$', title)
    req.url = req.url.replaceAll('$body$', description)
    req.url = req.url.replaceAll('$url$', sString(url))
    if (req.type === 'GET') {
      req.data = null
    } else {
      req.data = req.data.replaceAll('$title$', title)
      req.data = req.data.replaceAll('$body$', description)
      req.data = req.data.replaceAll('$url$', sString(url))
      let tmprdata = sJson(req.data)
      if (tmprdata) {
        req.headers['Content-Type'] = 'application/json; charset=UTF-8'
        req.data = tmprdata
      } else {
        req.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    }
    clog.notify('custnotify push:', title, description, url)
    clog.debug('custnotify request', req)
    axios(req).then(res=>{
      clog.debug('custnotify result:', res.data)
    }).catch(e=>{
      if (e.response) clog.error('custnotify push error:', e.response.data)
      else clog.error('custnotify push error:', e.message)
    })
  } else {
    clog.debug('custnotify push not available yet, skip custnotify push.')
  }
}

function feedPush(title, description, url) {
  if (bEmpty(title)) {
    title = 'elecV2P 通知'
  } else {
    title = sString(title).trim()
  }
  if (bEmpty(description)) {
    description = 'a empty message.\n没有任何通知内容。'
  } else {
    description = sString(description).trim()
  }
  url = formUrl(url)
  if (CONFIG_FEED.webmessage && CONFIG_FEED.webmessage.enable) {
    message.success(`${title}\n${description}\n${url || ''}`, 10)
  }
  if (CONFIG_FEED.enable) {
    const date = new Date()
    const guid = date.getTime() - date.getTimezoneOffset()*60*1000
    clog.notify('add feed item', title, description)
    feed.item({
      title: title, description,
      url: url || CONFIG_FEED.homepage + '/feed/?new=' + guid,
      guid, author: 'elecV2P',
      date: guid,
    })
  }
  if (CONFIG_FEED.maxbLength > 0 && description.length > CONFIG_FEED.maxbLength) {
    let pieces = Math.ceil(description.length / CONFIG_FEED.maxbLength)
    for (let i=0; i<pieces; i++) {
      let pdes = description.slice(i*CONFIG_FEED.maxbLength, (i+1)*CONFIG_FEED.maxbLength)
      iftttPush(`${title} ${i+1}`, pdes, url)
      barkPush(`${title} ${i+1}`, pdes, url)
      custPush(`${title} ${i+1}`, pdes, url)
    }
  } else {
    iftttPush(title, description, url)
    barkPush(title, description, url)
    custPush(title, description, url)
  }
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

module.exports = { CONFIG_FEED, feedAddItem, iftttPush, barkPush, custPush, feedPush, feedXml, feedClear }