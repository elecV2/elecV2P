const RSS = require('rss')

const { now } = require('./time')

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

function addItem(title, description, url) {
  // clog.info('添加 item', title)
  feed.item({
    title:  title || 'elecV2P notification',
    description: description || '通知内容',
    url: url || 'https://github.com/elecV2',
    author: 'elecV2P',
    date: Date()
  })
}

let isclose = false

function xml() {
  if (isclose) {
    return ''
  }
  return feed.xml()
}

function clear() {
  feed = newFeed({})
}

function close() {
  isclose = true
}

function open() {
  isclose = false
}

module.exports = {
  newFeed,
  addItem,
  xml,
  clear,
  close,
  open
}