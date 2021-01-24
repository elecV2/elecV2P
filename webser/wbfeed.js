const { logger, CONFIG_FEED, feedXml, feedClear } = require('../utils')
const clog = new logger({ head: 'wbfeed' })

module.exports = app => {
  app.get(['/feed', '/rss'], (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get feed")
    res.set('Content-Type', 'text/xml')
    res.end(feedXml())
  })

  app.put("/feed", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "put feed")
    let data = req.body.data
    switch(req.body.type){
      case "op":
        CONFIG_FEED.enable = data
        clog.notify(`FEED 已 ${ data ? '开启' : '关闭' }`)
        res.end(`FEED 已 ${ data ? '开启' : '关闭' }`)
        break
      case "clear":
        feedClear()
        res.end('FEED 已清空')
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
      case "merge":
        CONFIG_FEED.merge = data
        clog.notify(`FEED 通知合并功能已 ${ data.enable ? '开启' : '取消' }`)
        res.end(`FEED 通知合并功能已 ${ data.enable ? '开启' : '取消' }`)
        break
      default:{
        clog.error('FEED PUT 未知操作', req.body.type)
        res.end('FEED PUT 未知操作 ' + req.body.type)
      }
    }
  })
}