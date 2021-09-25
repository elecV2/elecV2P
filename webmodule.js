const http = require('http')
const path = require('path')
const express = require('express')
const compression = require('compression')

const { CONFIG, CONFIG_Port } = require('./config')

const { isAuthReq, logger, LOGFILE, websocketSer } = require('./utils')
const clog = new logger({ head: 'webServer', level: 'debug' })

const { wbefss, wbconfig, wbfeed, wbcrt, wbjs, wbtask, wblogs, wbstore, wbdata, wblist, wbhook, wbrpc } = require('./webser')

module.exports = () => {
  const app = express()
  app.use(compression())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.text({ type: 'text/*' }))
  app.use(express.raw())
  app.set('json spaces', 2)

  app.use((req, res, next)=>{
    if (isAuthReq(req)) {
      next()
    } else {
      let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
      res.status(403).send(`<p>You have no permission to access.</p><p>IP: ${ipAddress} is recorded.</p><br><p>Powered BY elecV2P: <a href='https://github.com/elecV2/elecV2P'>https://github.com/elecV2/elecV2P</a></p>`)
      clog.notify(ipAddress, 'trying to access elecV2P')
      LOGFILE.put('access.log', `${ipAddress} trying to access elecV2P`, 'access notify')
    }
  })

  const ONEMONTH = 60 * 1000 * 60 * 24 * 30                // 页面缓存时间
  app.use(express.static(path.resolve(__dirname, 'web/dist'), { maxAge: ONEMONTH }))

  wbrpc(app)
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
  wbefss(app)

  app.use((req, res, next) => {
    res.status(404).send(`<p>404</p><br><a href="/">BACK TO HOME</a><br><p><span>Powered BY</span><a target="_blank" href="https://github.com/elecV2/elecV2P">elecV2P</a></p>`)
  })

  const server = http.createServer(app)

  server.on('clientError', (err, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\n')
  })

  const webstPort = process.env.PORT || CONFIG_Port.webst || 80

  server.listen(webstPort, ()=>{
    clog.notify('elecV2P', 'v' + CONFIG.version, 'started on port', webstPort)
  })

  websocketSer({ server, path: '/elecV2P' })
}