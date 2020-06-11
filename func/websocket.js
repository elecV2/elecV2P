const ws = require('ws')

const { logger } = require('../utils')
const clog = new logger({head: 'webSocket', level: 'debug'})

const CONFIG_WS = {
  webskPort: 8005,
  webskPath: '/elecV2P'
}

const wsSer = {
  send(data){
    wsSend(data)
  },
  recv(msg){
    clog.info('receive message:', msg)
  }
}

wsSer.recv.task = data => {
  clog.info('a task message')
}

wsSer.send.func = type => {
  return (data) => {
    wsSend({type, data})
  }
}

let wss
function wsSend(obj){
  if (typeof(obj) == "object") {
    obj = JSON.stringify(obj)
  }
  if (wss) {
    clog.debug('send client msg:', obj)
    wss.clients.forEach(client=>{
      if (client.readyState === ws.OPEN) {
        client.send(obj)
      }
    })
  } else {
    // clog.info('websocket 已断开，无法发送数据：', obj)
  }
}

function websocketSer({ port, path }) {
  wss = new ws.Server({ port, path })
  clog.notify('websocket on port:', port, 'path:', path)
  
  wss.on('connection', (ws, req)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'new connection')
    let interval = setInterval(()=>{wsSend({ ping: 'ping' })}, 50e3)
    ws.on('message', msg=>{
      try {
        var recvdata = JSON.parse(msg)
      } catch {
        var recvdata = msg
        // clog.info('receive message:', msg)
      }
      if (recvdata && recvdata.type && wsSer.recv[recvdata.type]) {
        wsSer.recv[recvdata.type](recvdata.data)
      } else {
        wsSer.recv(msg)
      }
    })

    ws.on("close", ev=>{
      clearInterval(interval)
      clog.info('disconnected SOCKET - PORT : ' + port + ', reason: ' + ev)
    })
  })


  wss.on('error', e=>{
    clog.error('websocket error', e)
  })
}

module.exports = { websocketSer, wsSer, CONFIG_WS }