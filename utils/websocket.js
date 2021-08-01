const ws = require('ws')

const { nStatus, euid, sType, sString, sJson } = require('./string')
const { logger } = require('./logger')
const clog = new logger({ head: 'webSocket', level: 'debug' })

const { CONFIG } = require('../config')

// 服务器 websocket 发送/接收 数据
const wsSer = {
  recverlists: [],       // 客户端 recverlists
  send(data){
    wsSend(data)
  },
  recv(msg, ip){
    clog.debug('receive message from:', ip, msg)
  }
}

const wsobs = {
  send() {
    if (this.intval) return
    this.intval = setInterval(()=>{
      if (this.WSS) {
        wsSend({ type: 'elecV2Pstatus', data: { clients: this.WSS.clients.size, memoryusage: nStatus() }})
      } else {
        this.stop()
      }
    }, 3e3)
  },
  stop() {
    if (this.intval) {
      clearInterval(this.intval)
      delete this.intval
    }
  }
}

wsSer.send.func = type => {
  return (data) => {
    wsSend({type, data})
  }
}

wsSer.recv.ready = recver => {
  // 客户端 recver 准备接收数据
  if (wsSer.recverlists.indexOf(recver) < 0) {
    wsSer.recverlists.push(recver)
  }
}

wsSer.recv.stopsendstatus = flag => flag ? wsobs.stop() : wsobs.send()

function wsSend(data, target){
  if (sType(data) === "object") {
    if (wsSer.recverlists.indexOf('minishell') === -1 && wsSer.recverlists.indexOf(data.type) === -1) {
      if (CONFIG.debug && CONFIG.debug.websocket) {
        clog.debug('client recver', data.type, 'no ready yet')
      }
      return
    }
    if (data.type !== 'elecV2Pstatus' && CONFIG.debug && CONFIG.debug.websocket) {
      clog.debug('send client msg:', data)
    }
  }
  if (wsobs.WSS) {
    data = sString(data)
    wsobs.WSS.clients.forEach(client=>{
      if (target) {
        if (client.id === target) {
          client.send(data)
        }
      } else if (client.readyState === ws.OPEN) {
        client.send(data)
      }
    })
  } else if (CONFIG.debug && CONFIG.debug.websocket) {
    clog.debug('no websocket clients yet, cant send data:', data)
  }
}

function websocketSer({ server, path }) {
  wsobs.WSS = new ws.Server({ server, path })
  clog.notify('websocket on path:', path)
  
  wsobs.WSS.on('connection', (ws, req)=>{
    ws.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    clog.notify(ws.ip, 'new connection')

    // 初始化 ID
    ws.id = euid()
    // ws.send(JSON.stringify({ type: 'euid', data: ws.id }))

    // 发送当前服务器内存使用状态
    wsobs.send()

    ws.on('message', (msg, req) => {
      const recvdata = sJson(msg) || msg
      if (recvdata.type && wsSer.recv[recvdata.type]) {
        // 检查是否设置了特定数据处理函数
        wsSer.recv[recvdata.type](recvdata.data, recvdata.euid)
      } else {
        wsSer.recv(recvdata, ws.ip)
      }
    })

    ws.on("close", ev=>{
      clog.info(ws.ip, 'disconnected', 'reason: ' + ev)
      if(!wsobs.WSS.clients || wsobs.WSS.clients.size <= 0) {
        clog.notify('all clients disconnected now')
        wsobs.stop()
        wsSer.recverlists = []
      }
    })
  })

  wsobs.WSS.on('error', e=>{
    wsobs.WSS = null
    clog.error('websocket error', e)
  })
}

const messageSend = {
  success() {
    wsSer.send({ type: 'message', data: { type: 'success', data: [...arguments] } })
  },
  error() {
    wsSer.send({ type: 'message', data: { type: 'error', data: [...arguments] } })
  },
  loading() {
    wsSer.send({ type: 'message', data: { type: 'loading', data: [...arguments] } })
  },
  close(mid) {
    wsSer.send({ type: 'message', data: { type: 'close', data: mid } })
  }
}

module.exports = {
  websocketSer, wsSer,
  message: new Proxy(messageSend, {
    set(target, prop){
      clog.error('forbid redefine $message method', prop)
      throw new Error('forbid redefine $message method ' + prop)
    }
  })
}