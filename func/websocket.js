const ws = require('ws')

const { logger, nStatus } = require('../utils')
const clog = new logger({head: 'webSocket', level: 'debug'})

const CONFIG_WS = {
  $wss: '',
  webskPort: 8005,
  webskPath: '/elecV2P'
}

const wsSer = {
  // 服务器 websocket 发送/接收 数据
  send(data){
    wsSend(data)
  },
  recv(msg){
    clog.info('receive message:', msg)
  }
}

wsSer.send.func = type => {
  return (data) => {
    wsSend({type, data})
  }
}

wsSer.recv.task = data => {
  clog.info('a task message')
}

function wsSend(obj){
  if (typeof(obj) == "object") {
    obj = JSON.stringify(obj)
  }
  if (CONFIG_WS.$wss) {
    clog.debug('send client msg:', obj)
    CONFIG_WS.$wss.clients.forEach(client=>{
      if (client.readyState === ws.OPEN) {
        client.send(obj)
      }
    })
  } else {
    // clog.info('websocket 已断开，无法发送数据：', obj)
  }
}

function websocketSer({ port, path }) {
  CONFIG_WS.$wss = new ws.Server({ port, path })
  clog.notify('websocket on port:', port, 'path:', path)
  
  CONFIG_WS.$wss.on('connection', (ws, req)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'new connection')
    
    let interval = setInterval(()=>{
      wsSend({ type: 'elecV2Pstatus', data: { clients: CONFIG_WS.$wss.clients.size, memoryusage: nStatus() }})
    }, 2e3)

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

  CONFIG_WS.$wss.on('error', e=>{
    clog.error('websocket error', e)
  })
}

module.exports = { websocketSer, wsSer, CONFIG_WS }