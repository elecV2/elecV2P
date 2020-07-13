const fs = require('fs')
const path = require('path')
const http = require('http')
const express = require('express')
const compression = require('compression')

const { CONFIG_RUNJS } = require('./runjs/runJSFile')
const { websocketSer } = require('./func/websocket')

const { logger, CONFIG_FEED, errStack, isJson, setGlog } = require('./utils')
const clog = new logger({ head: 'webServer' })

const { wbconfig, wbfeed, wbcrt, wbjs, wbtask, wblogs, wbstore, wbdata, wblist, wbhook } = require('./webser')

const CONFIG = function() {
  // config 初始化

  const config = {
    path: path.join(__dirname, 'runjs', 'Lists', 'config.json'),
    gloglevel: 'info',
    wbrtoken: 'a8c259b2-67fe-4c64-8700-7bfdf1f55cb3',    // webhook token（建议修改）
  }
  if (fs.existsSync(config.path)) {
    let saveconfig = fs.readFileSync(config.path, "utf8")
    if (isJson(saveconfig)) {
      Object.assign(config, JSON.parse(saveconfig))
      Object.assign(CONFIG_FEED, config.CONFIG_FEED)
      Object.assign(CONFIG_RUNJS, config.CONFIG_RUNJS)
    }
    if (config.gloglevel != 'info') setGlog(config.gloglevel)
  }

  return config
}();

module.exports = (CONFIG_Port) => {
  const app = express()
  app.use(compression())
  app.use(express.json())

  const ONEMONTH = 60 * 1000 * 60 * 24 * 30                // 页面缓存时间

  app.use(express.static(__dirname + '/web/dist', { maxAge: ONEMONTH }))

  wbconfig(app, CONFIG)
  wbfeed(app)
  wbcrt(app)
  wbjs(app, CONFIG)
  wbtask(app)
  wblogs(app)
  wbstore(app)
  wbdata(app, CONFIG_Port)
  wblist(app)
  wbhook(app, CONFIG)

  app.use((req, res, next) => {
    res.end("404")
    next()
  })

  const server = http.createServer(app)

  const webstPort = process.env.PORT || CONFIG_Port.webst || 80

  server.listen(webstPort, ()=>{
    clog.notify("elecV2P manage on port", webstPort)
  })

  websocketSer({ server, path: '/elecV2P' })
}