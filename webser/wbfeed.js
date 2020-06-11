const { logger, CONFIG_FEED, feedXml, feedClear } = require('../utils')
const clog = new logger({ head: 'wbfeed' })

module.exports = app=>{
  app.get("/feed", (req, res)=>{
    res.set('Content-Type', 'text/xml')
    res.end(feedXml())
  })

  app.put("/feed", (req, res)=>{
    let data = req.body.data
    switch(req.body.type){
      case "op":
        CONFIG_FEED.enable = data
        clog.notify(`feed 已 ${ data ? '开启' : '关闭' }`)
        res.end(`feed 已 ${ data ? '开启' : '关闭' }`)
        break
      case "clear":
        feedClear()
        clog.notify('feed 已清空')
        res.end('feed 已清空')
        break
      case "ifttt":
        CONFIG_FEED.iftttid = data
        clog.notify(`ifttt webhook 功能已 ${ data ? '开启' : '关闭' }`)
        res.end(`ifttt webhook 功能已 ${ data ? '开启' : '关闭' }`)
        break
      case "merge":
        CONFIG_FEED.ismerge = data.feedmerge
        CONFIG_FEED.mergetime = data.mergetime
        CONFIG_FEED.mergenum = data.mergenum
        clog.notify(`feed 通知已 ${ data.feedmerge ? '合并' : '取消合并' }`)
        res.end(`feed 通知已 ${ data.feedmerge ? '合并' : '取消合并' }`)
        break
      default:{
        res.end('feed put 未知操作')
      }
    }
  })
}