const { logger, CONFIG_FEED, feedPush, feedXml, feedClear, list } = require('../utils')
const clog = new logger({ head: 'wbfeed' })

const { CONFIG } = require('../config')

module.exports = app => {
  app.get(['/feed', '/rss'], (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get feed")
    res.set('Content-Type', 'text/xml')
    res.send(feedXml())
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
        clog.notify(`acquiescent notification is ${ data.enable ? 'open' : 'close' }`)
        res.json({
          rescode: 0,
          message: `acquiescent notification is ${ data.enable ? 'open' : 'close' }`
        })
        break
      case "clear":
        feedClear()
        res.json({
          rescode: 0,
          message: 'FEED/RSS content is reset'
        })
        bSave = false
        break
      case "ifttt":
        CONFIG_FEED.iftttid = data
        clog.notify(`IFTTT notification is ${ data.enable ? 'open' : 'close' }`)
        res.json({
          rescode: 0,
          message: `IFTTT notification is ${ data.enable ? 'open' : 'close' }`
        })
        break
      case "barkkey":
        CONFIG_FEED.barkkey = data
        clog.notify(`BARK notification is ${ data.enable ? 'open' : 'close' }`)
        res.json({
          rescode: 0,
          message: `BARK notification is ${ data.enable ? 'open' : 'close' }`
        })
        break
      case "custnotify":
        CONFIG_FEED.custnotify = data
        clog.notify(`custnotify is ${ data.enable ? 'open' : 'close' }`)
        res.json({
          rescode: 0,
          message: `custnotify is ${ data.enable ? 'open' : 'close' }`
        })
        break
      case "runjs":
        CONFIG_FEED.runjs = data
        clog.notify(`notify trigger runJS is ${ data.enable ? 'enabled' : 'disabled' }`)
        res.json({
          rescode: 0,
          message: `notify trigger runJS is ${ data.enable ? 'enabled' : 'disabled' }`
        })
        break
      case "merge":
        CONFIG_FEED.merge = data.merge
        CONFIG_FEED.rss.enable = data.rssenable
        message = `FEED is ${ data.rssenable ? 'open' : 'close' }` + `\nacquiescent notification is ${ data.merge.enable ? 'merged' : 'not merged' }`
        clog.notify(message)
        res.json({ rescode: 0, message })
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
        res.json({
          rescode: 0,
          message: message.trim()
        })
        bSave = false
        break
      default:{
        clog.error('FEED PUT unknow operation', req.body.type)
        res.json({
          rescode: -1,
          message: 'FEED PUT unknow operation ' + req.body.type
        })
        bSave = false
      }
    }
    if (bSave) {
      CONFIG.CONFIG_FEED = CONFIG_FEED
      list.put('config.json', JSON.stringify(CONFIG, null, 2))
      clog.info('current config save to', CONFIG.path)
    }
  })
}