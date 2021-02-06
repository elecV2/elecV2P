const http = require('http')
const path = require('path')
const express = require('express')
const compression = require('compression')

const { CONFIG, CONFIG_Port } = require('./config')
const { websocketSer } = require('./func/websocket')

const { logger } = require('./utils/logger')
const clog = new logger({ head: 'webServer', level: 'debug' })

const { wbconfig, wbfeed, wbcrt, wbjs, wbtask, wblogs, wbstore, wbdata, wblist, wbhook, wbefss } = require('./webser')

module.exports = () => {
  const app = express()
  app.use(compression())
  app.use(express.json({ limit: '20mb' }))

  app.use((req, res, next)=>{
    if (!CONFIG.SECURITY || CONFIG.SECURITY.enable === false) {
      next()
      return
    }
    let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    if (CONFIG.wbrtoken) {
      let token = req.query.token || req.body.token
      if (!token) {
        let ref = req.get('Referer')
        if (ref) {
          ref = new URL(ref)
          token = new URLSearchParams(ref.search).get('token')
        }
      }
      if (token === CONFIG.wbrtoken) {
        clog.debug(ipAddress, 'is access elecV2P server by webhook token')
        next()
        return
      }
    }
    const blacklist = CONFIG.SECURITY.blacklist || []
    const whitelist = CONFIG.SECURITY.whitelist || []

    if (ipAddress.substr(0, 7) == "::ffff:") ipAddress = ipAddress.substr(7)
    if(whitelist.indexOf(ipAddress) !== -1 || (blacklist.indexOf('*') === -1 && blacklist.indexOf(ipAddress) === -1)) {
      next()
    } else {
      clog.error(ipAddress, 'is try to access elecV2P sever.')
      res.send('don\'t allow to access. \n\nPowered BY elecV2P: https://github.com/elecV2/elecV2P')
    }
  })

  const ONEMONTH = 60 * 1000 * 60 * 24 * 30                // 页面缓存时间

  app.use(express.static(path.resolve(__dirname, 'web/dist'), { maxAge: ONEMONTH }))

  if (CONFIG.efss) {
    wbefss(app)
  }

  wbconfig(app)
  wbfeed(app)
  wbcrt(app)
  wbjs(app)
  wbtask(app)
  wblogs(app)
  wbstore(app)
  wbdata(app)
  wblist(app)
  wbhook(app)

  app.use((req, res, next) => {
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
    res.end(`404<br>当前访问地址不存在<br><br><a href="/">返回首页</a><br><br><br><a target="_blank" href="https://github.com/elecV2/elecV2P">elecV2P 项目主页</a>`)
  })

  const server = http.createServer(app)

  const webstPort = process.env.PORT || CONFIG_Port.webst || 80

  server.listen(webstPort, ()=>{
    clog.notify("elecV2P", CONFIG.version, "on port", webstPort)
  })

  websocketSer({ server, path: '/elecV2P' })
}