const fs = require('fs')
const http = require('http')
const path = require('path')
const express = require('express')
const compression = require('compression')

const { CONFIG, CONFIG_Port } = require('./config')

const { crtHost } = require('./func')
const { isAuthReq, logger, websocketSer } = require('./utils')
const clog = new logger({ head: 'webServer' })

const { wbefss, wbconfig, wbfeed, wbcrt, wbjs, wbtask, wblogs, wbstore, wbdata, wblist, wbhook, wbrpc, wbrun, wbeapp } = require('./webser')

async function newServer(app) {
  if (CONFIG?.webUI?.tls?.enable) {
    let host = CONFIG.webUI.tls.host
    if (!host) {
      host = '127.0.0.1'
    }
    try {
      if (!(fs.existsSync(`rootCA/${host}.key`) && fs.existsSync(`rootCA/${host}.crt`))) {
        await crtHost(host)
      }
      clog.notify('enable TLS for webUI, HOST:', host)
      return require('https').createServer({
        key: fs.readFileSync(`rootCA/${host}.key`),
        cert: fs.readFileSync(`rootCA/${host}.crt`)
      }, app)
    } catch(error) {
      clog.error('fail to enable TLS for webUI, reason:', error)
    }
  }
  return http.createServer(app)
}

module.exports = () => {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.set('json spaces', 2)
  app.use((req, res, next)=>{
    if (isAuthReq(req, res)) {
      if (CONFIG.cors?.enable && CONFIG.cors?.origin) {
        res.set({ 'Access-Control-Allow-Origin': CONFIG.cors.origin})
      }
      next()
    } else {
      res.status(403).send(`<p>You have no permission to access.</p><p>IP: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress} is recorded.</p><br><p>Powered BY elecV2P: <a href='https://github.com/elecV2/elecV2P'>https://github.com/elecV2/elecV2P</a></p>`)
    }
  })
  wbrpc(app)

  app.use(compression())
  const ONEMONTH = 60 * 1000 * 60 * 24 * 30                // 页面缓存时间
  app.use(express.static(path.resolve(__dirname, 'web/dist'), { maxAge: ONEMONTH }))

  app.use(express.text({ type: 'text/*' }))
  app.use(express.raw())
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
  wbrun(app)
  wbeapp(app)

  app.use((req, res, next) => {
    res.status(404).send(`<p>404</p><br><a href="/">BACK TO HOME</a><br><p><span>Powered BY </span><a target="_blank" href="https://github.com/elecV2/elecV2P">elecV2P</a></p>`)
  })

  newServer(app).then(server=>{
    server.on('clientError', (err, socket) => {
      clog.error('elecV2P clientError', err)
      socket.end('HTTP/1.1 400 Bad Request\r\n')
    })

    server.listen(CONFIG_Port.webst, ()=>{
      clog.notify('elecV2P', 'v' + CONFIG.version, 'started on port', CONFIG_Port.webst);
    })

    websocketSer({ server, path: '/elecV2P' })
  }).catch(err=>{
    clog.error('elecV2P new server error:', err)
  })
}