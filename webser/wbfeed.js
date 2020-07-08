const { logger, CONFIG_FEED, feedXml, feedClear } = require('../utils')
const clog = new logger({ head: 'wbfeed' })

module.exports = app => {
  app.get("/feed", (req, res)=>{
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
        clog.notify(`feed 已 ${ data ? '开启' : '关闭' }`)
        res.end(`feed 已 ${ data ? '开启' : '关闭' }`)
        break
      case "clear":
        feedClear()
        res.end('feed 已清空')
        break
      case "ifttt":
        CONFIG_FEED.iftttid = data
        clog.notify(`ifttt webhook 功能已 ${ data ? '开启' : '关闭' }`)
        res.end(`ifttt webhook 功能已 ${ data ? '开启' : '关闭' }`)
        break
      case "merge":
        Object.assign(CONFIG_FEED, data)
        clog.notify(`feed 通知合并功能已 ${ data.enable ? '开启' : '取消' }`)
        res.end(`feed 通知合并功能已 ${ data.enable ? '开启' : '取消' }`)
        break
      default:{
        res.end('feed put 未知操作')
      }
    }
  })
}