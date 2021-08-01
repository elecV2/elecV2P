const { logger, CONFIG_FEED, feedPush, feedXml, feedClear, list } = require('../utils')
const clog = new logger({ head: 'wbfeed' })

const { CONFIG } = require('../config')

module.exports = app => {
  app.get(['/feed', '/rss'], (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get feed")
    res.set('Content-Type', 'text/xml')
    res.end(feedXml())
  })

  app.put("/feed", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "put feed")
    let data = req.body.data
    let bSave = true, message = ''
    switch(req.body.type){
      case "op":
        CONFIG_FEED.enable = data.enable
        CONFIG_FEED.maxbLength = data.maxbLength
        CONFIG_FEED.webmessage = data.webmessage
        clog.notify(`默认通知已 ${ data.enable ? '开启' : '关闭' }`)
        res.end(`默认通知已 ${ data.enable ? '开启' : '关闭' }`)
        break
      case "clear":
        feedClear()
        res.end('FEED/RSS 输出已清空')
        bSave = false
        break
      case "ifttt":
        CONFIG_FEED.iftttid = data
        clog.notify(`IFTTT 通知功能已 ${ data.enable ? '开启' : '关闭' }`)
        res.end(`IFTTT 通知功能已 ${ data.enable ? '开启' : '关闭' }`)
        break
      case "barkkey":
        CONFIG_FEED.barkkey = data
        clog.notify(`BARK 通知功能已 ${ data.enable ? '开启' : '关闭' }`)
        res.end(`BARK 通知功能已 ${ data.enable ? '开启' : '关闭' }`)
        break
      case "custnotify":
        CONFIG_FEED.custnotify = data
        clog.notify(`自定义通知功能已 ${ data.enable ? '更新' : '关闭' }`)
        res.end(`自定义通知功能已 ${ data.enable ? '更新' : '关闭' }`)
        break
      case "runjs":
        CONFIG_FEED.runjs = data
        clog.notify(`通知触发 JS 功能已 ${ data.enable ? '更新' : '关闭' }`)
        res.end(`通知触发 JS 功能已 ${ data.enable ? '更新' : '关闭' }`)
        break
      case "merge":
        CONFIG_FEED.merge = data.merge
        CONFIG_FEED.rss.enable = data.rssenable
        message = `FEED 输出已 ${ data.rssenable ? '开启' : '关闭' }` + `\n默认通知合并已 ${ data.merge.enable ? '开启' : '取消' }`
        clog.notify(message)
        res.end(message)
        break
      case "test":
        if (CONFIG_FEED.iftttid.enable) {
          message += '\nIFTTT 通知已发送，请打开相关 APP 查看接收是否正常'
        } else {
          message += '\nIFTTT 通知方式处于关闭状态'
        }
        if (CONFIG_FEED.barkkey.enable) {
          message += '\nBARK 通知已发送，请打开相关 APP 查看接收是否正常'
        } else {
          message += '\nBARK 通知方式处于关闭状态'
        }
        if (CONFIG_FEED.custnotify.enable) {
          message += '\n自定义 通知已发送，请打开相关 APP 查看接收是否正常'
        } else {
          message += '\n自定义 通知方式处于关闭状态'
        }
        feedPush('elecV2P 测试通知', '恭喜您，该通知方式设置正常\nCongratulations! this notification is enabled', 'https://github.com/elecV2/elecV2P')
        res.end(JSON.stringify({
          rescode: 0,
          message: message.trim()
        }))
        bSave = false
        break
      default:{
        clog.error('FEED PUT 未知操作', req.body.type)
        res.end(JSON.stringify({
          rescode: -1,
          message: 'FEED PUT 未知操作 ' + req.body.type
        }))
        bSave = false
      }
    }
    if (bSave) {
      CONFIG.CONFIG_FEED = CONFIG_FEED
      list.put('config.json', JSON.stringify(CONFIG, null, 2))
      clog.info('current config save to script/Lists/config.json')
    }
  })
}