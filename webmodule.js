const http = require('http')
const path = require('path')
const express = require('express')
const compression = require('compression')

const { CONFIG, CONFIG_Port } = require('./config')

const { logger, websocketSer, UUID } = require('./utils')
const clog = new logger({ head: 'webServer', level: 'debug' })

if (!CONFIG.wbrtoken) {
  CONFIG.wbrtoken = UUID()
}

const { wbefss, wbconfig, wbfeed, wbcrt, wbjs, wbtask, wblogs, wbstore, wbdata, wblist, wbhook } = require('./webser')

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
      if (token === undefined) {
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
    let blacklist = CONFIG.SECURITY.blacklist || []
    let whitelist = CONFIG.SECURITY.whitelist || []

    if (ipAddress.substr(0, 7) == "::ffff:") {
      ipAddress = ipAddress.substr(7)
    }
    if (whitelist.indexOf(ipAddress) !== -1 || (blacklist.indexOf('*') === -1 && blacklist.indexOf(ipAddress) === -1)) {
      next()
    } else {
      clog.error(ipAddress, 'trying to access elecV2P')
      res.writeHead(403, { 'Content-Type': 'text/html;charset=utf-8' })
      res.end(`You don't have permission to access.<br>IP: ${ipAddress} is recorded.<br><br>Powered BY elecV2P: <a href='https://github.com/elecV2/elecV2P'>https://github.com/elecV2/elecV2P</a>`)
    }
  })

  const ONEMONTH = 60 * 1000 * 60 * 24 * 30                // 页面缓存时间

  app.use(express.static(path.resolve(__dirname, 'web/dist'), { maxAge: ONEMONTH }))

  wbefss(app)

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
    res.writeHead(404, { 'Content-Type': 'text/html;charset=utf-8' })
    res.end(`404<br><br><a href="/">BACK TO HOME</a><br><br><br>Powered BY <a target="_blank" href="https://github.com/elecV2/elecV2P">elecV2P</a>`)
  })

  const server = http.createServer(app)

  server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n')
  })

  const webstPort = process.env.PORT || CONFIG_Port.webst || 80

  server.listen(webstPort, ()=>{
    clog.notify("elecV2P", 'v' + CONFIG.version, "started on port", webstPort)
  })

  websocketSer({ server, path: '/elecV2P' })
}