const fs = require('fs')
const http = require('http')
const path = require('path')
const express = require('express')
const compression = require('compression')

const { CONFIG, CONFIG_Port } = require('./config')

const { crtHost } = require('./func')
const { isAuthReq, logger, websocketSer, htmlTemplate } = require('./utils')
const clog = new logger({ head: 'webServer' })

const { wbefss, wbconfig, wbfeed, wbcrt, wbjs, wbtask, wblogs, wbstore, wbdata, wblist, wbhook, wbrpc, wbrun, wbeapp } = require('./webser')

async function newServer(app) {
  if (CONFIG.webUI.tls?.enable) {
    const host = CONFIG.webUI.tls.host || '127.0.0.1'
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
  app.use(express.urlencoded({ extended: true }))
  app.set('json spaces', 2)
  app.use((req, res, next)=>{
    if (isAuthReq(req, res)) {
      res.set({ 'Access-Control-Allow-Origin': '*' })
      next()
    } else {
      res.status(403).send(htmlTemplate(`<p style="margin-top: 0;padding-top: 160px;">You have no permission to access.</p>
<p>IP: ${req.headers['x-forwarded-for'] || req.connection.remoteAddress} is recorded.</p>
<form method="${req.method}"><label>TOKEN: <input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="width: 460px;max-width: 98%;color: #003153B8;" name="token"></label><input style="color: #FAFAFD;background: #003153B8;cursor: pointer;" type="submit" value="⏵"><br><label><input name="cookie" type="checkbox" value="long" style="width: 24px;vertical-align: middle;cursor: pointer;">cookie=long (365 days)</label></form><br>
<p>Powered BY elecV2P: <a href='https://github.com/elecV2/elecV2P'>https://github.com/elecV2/elecV2P</a></p>`, '<style type="text/css">input{height: 36px;line-height: 36px;box-sizing: border-box;border: none;font-size: 22px;border-radius: 1em;margin: 0 3px;padding: 0px 8px;text-align: center;}</style>')
      )
    }
  })
  wbrpc(app)

  app.use(compression())
  app.use(express.static(path.resolve(__dirname, 'web/dist')))

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
    res.status(404).send(htmlTemplate(`<h3 style="margin-top: 0;padding: 140px 1em 0;white-space: pre-wrap;word-break: break-all;">${req.method}    ${req.originalUrl}</h3>
<h1>404, Not Found</h1><br>
<nav><a href="/">HOME</a><a href="/efss/">EFSS</a><a href="/logs/">LOGS</a></nav><br>
<p><span>Powered BY </span><a target="_blank" href="https://github.com/elecV2/elecV2P">elecV2P</a></p>
<p><span>TG Channel </span><a target="_blank" href="https://t.me/elecV2">@elecV2</a></p>`, '<style type="text/css">nav{display: flex;justify-content: space-around;font-size: 26px;}</style>', '404, oops... - elecV2P'))
  })

  newServer(app).then(server=>{
    server.on('clientError', (err, socket) => {
      clog.error('elecV2P clientError', err)
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'+err.message)
    })

    server.listen(CONFIG_Port.webst, ()=>{
      clog.notify('elecV2P', 'v' + CONFIG_Port.version, 'started on port', CONFIG_Port.webst);
    })

    websocketSer({ server, path: '/elecV2P' })
  }).catch(err=>{
    clog.error('elecV2P new server error:', err)
  })
}