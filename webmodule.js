const fs = require('fs')
const path = require('path')
const express = require('express')
const compression = require('compression')

const { logger, CONFIG_FEED } = require('./utils')
const clog = new logger({ head: 'webServer' })

const CONFIG = function() {
  // config 初始化
  let config = {
    path: path.join(__dirname, 'runjs', 'Lists', 'config.json'),
    gloglevel: 'info',
    wbrtoken: 'a8c259b2-67fe-4c64-8700-7bfdf1f55cb3',    // 远程运行 JS token（建议修改）
    CONFIG_FEED,
  }
  if (fs.existsSync(config.path)) {
    try {
      Object.assign(config, JSON.parse(fs.readFileSync(config.path), "utf8"))
      Object.assign(CONFIG_FEED, config.CONFIG_FEED)
      if(config.gloglevel != 'info') clog.setlevel(config.gloglevel, true)
    } catch(e) {
      clog.error(path, '配置文件无法解析', e)
    }
  }

  return config
}();

const { JSLISTS } = require('./runjs')

const { wbfeed, wbcrt, wbjsfile, wbtask, wblogs, wbstore, wbdata, wblist } = require('./webser')

function webser({ webstPort, proxyPort, webifPort }) {
  const app = express()
  app.use(compression())
  app.use(express.json())

  const ONEMONTH = 60 * 1000 * 60 * 24 * 30                // 页面缓存时间

  app.use(express.static(__dirname + '/web/dist', { maxAge: ONEMONTH }))

  app.listen(webstPort, ()=>{
    clog.notify("elecV2P manage on port", webstPort)
  })

  app.get("/initdata", (req, res)=>{
    res.end(JSON.stringify({
      config: CONFIG,
      jslists: JSLISTS,
    }))
  })

  app.get("/config", (req, res)=>{
    res.end(JSON.stringify({
      gloglevel: CONFIG.gloglevel,
      feedenable: CONFIG_FEED.enable,
      iftttid: CONFIG_FEED.iftttid,
      feedmerge: CONFIG_FEED.ismerge,
      mergetime: CONFIG_FEED.mergetime,
      mergenum: CONFIG_FEED.mergenum,
      wbrtoken: CONFIG.wbrtoken,
    }))
  })

  app.put("/config", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " put config " + req.body.type)
    switch(req.body.type){
      case "config":
        Object.assign(CONFIG, req.body.data)
        Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
        fs.writeFileSync(CONFIG.path, JSON.stringify(CONFIG))
        res.end("当前配置 已保存至 " + CONFIG.path)
        break
      case "gloglevel":
        try {
          CONFIG.gloglevel = req.body.data
          clog.setlevel(CONFIG.gloglevel, true)
          res.end('日志级别设置为：' + CONFIG.gloglevel)
        } catch(e) {
          res.end('日志级别设置失败 ' + e)
          clog.error('日志级别设置失败 ' + e)
        }
        break
      case "wbrtoken":
        CONFIG.wbrtoken = req.body.data
        clog.info('web runjs token 设置为：', CONFIG.wbrtoken)
        res.end('设置成功')
        break
      default:{
        res.end("data put error")
      }
    }
  })

  wbfeed(app)
  wbcrt(app)
  wbjsfile(app, CONFIG)
  wbtask(app)
  wblogs(app)
  wbstore(app)
  wbdata(app, proxyPort, webifPort)
  wblist(app)

  app.use((req, res, next) => {
    res.end("404")
    next()
  })

  return app
}

module.exports = webser