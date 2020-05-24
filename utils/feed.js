const RSS = require('rss')
const axios = require('axios')

const logger = require('./logger')

const clog = new logger({ head: 'feed', level: 'debug' })

function newFeed({ title, description, site_url, feed_url }) {
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
let feed = newFeed({})

const config = {
  isclose: false,
  iftttid: ''
}

function addItem(title = 'elecV2P notification', description =  '通知内容', url = 'https://github.com/elecV2/unique/' + new Date().getTime()) {
  if (/test/i.test(title)) return
  clog.notify('添加 item', title, description)
  feed.item({
    title,
    description,
    url,
    guid: String(new Date().getTime()),
    author: 'elecV2P',
    date: Date()
  })
  if (config.iftttid) {
    clog.notify('ifttt webhook trigger:', title, description)
    axios.post('https://maker.ifttt.com/trigger/elecV2P/with/key/' + config.iftttid, {value1: title, value2: description, value3: url}).then(res=>{
      clog.debug(res.data)
    }).catch(e=>{
      clog.error(e)
    })
  }
}

function xml() {
  if (config.isclose) {
    return ''
  }
  return feed.xml()
}

function clear() {
  feed = newFeed({})
  clog.notify('feed 内容已清空')
}

module.exports = {
  newFeed,
  addItem,
  xml,
  config,
  clear
}