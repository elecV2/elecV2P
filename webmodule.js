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

  wbfeed(app)
  wbcrt(app)
  wbjsfile(app)
  wbtask(app)
  wblogs(app)
  wbstore(app)
  wbdata(app, proxyPort, webifPort)
  wblist(app)

  app.get("/test", (req, res)=>{
    clog.debug("do some test")
  })

  app.use((req, res, next) => {
    res.end("404")
    next()
  })

  return app
}

module.exports = webser