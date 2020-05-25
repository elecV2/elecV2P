const ws = require('ws')

const { logger } = require('../utils')
const clog = new logger({head: 'webSocket', level: 'debug'})

const webskPort = 8005
const webskPath = '/elecV2P'
const wss = new ws.Server({ port: webskPort, path: webskPath })
clog.notify('websocket on port:', webskPort, 'path:', webskPath)

wss.on('connection', (ws, req)=>{
  clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'new connection')
  ws.on('message', msg=>{
    clog.info('receive message:', msg)
    // wsSerSend('msg from sever' + msg)
  })
})

wss.on('error', e=>{
  clog.error('websocket error', e)
})

function wsSend(obj){
  if (wss && wss.clients.length) {
    if (typeof(obj) == "object") {
      obj = JSON.stringify(obj)
    }
    clog.debug('send client msg:', obj)
    wss.clients.forEach(client=>{
      if (client.readyState === ws.OPEN) {
        client.send(obj)
      }
    })
  }
}

const wsSerSend = {
  // ws.send 转换
  logs(data){
    wsSend({type: 'logs', data})
  },
  task(data){
    wsSend({type: 'task', data})
  }
}

module.exports = { wsSerSend, webskPath, webskPort }