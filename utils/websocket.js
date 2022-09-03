const ws = require('ws')

const { isAuthReq } = require('./validate')
const { nStatus, euid, sType, sString, sJson, sHash } = require('./string')
const { logger, LOGFILE } = require('./logger')
const { now } = require('./time')
const clog = new logger({ head: 'webSocket', level: 'debug' })

const { CONFIG } = require('../config')

// 服务器 websocket 发送/接收 数据
const wsSer = {
  recver: new Map(),     // recver id UA/IP/TM
  recverlists: [],       // 客户端 recverlists
  send(data, target = ''){
    wsSend(data, target)
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

wsSer.send.func = (type, target = '') => {
  return (data) => {
    wsSend({type, data}, target)
  }
}

wsSer.recv.ready = recver => {
  // 客户端 recver 准备接收数据
  if (wsSer.recverlists.indexOf(recver) === -1) {
    wsSer.recverlists.push(recver)
  }
}

wsSer.recv.stopsendstatus = flag => flag ? wsobs.stop() : wsobs.send()

function wsSend(data, target = ''){
  if (sType(data) === 'object') {
    if (wsSer.recverlists.indexOf('minishell') === -1 && wsSer.recverlists.indexOf(data.type) === -1) {
      if (CONFIG.debug?.websocket) {
        clog.debug('client recver', data.type, 'no ready yet')
      }
      return
    }
    if (data.type !== 'elecV2Pstatus' && CONFIG.debug?.websocket) {
      clog.debug(`send to ${target || 'clients'} msg:`, data)
    }
  }
  if (wsobs.WSS) {
    data = sString(data)
    wsobs.WSS.clients.forEach(client=>{
      if (target) {
        if (client.id === target) {
          clog.debug('send data to target', client.id)
          client.send(data)
        }
      } else if (client.readyState === ws.OPEN) {
        client.send(data)
      }
    })
  } else if (CONFIG.debug?.websocket) {
    clog.debug('no websocket clients yet, cant send data:', data)
  }
}

function websocketSer({ server, path }) {
  wsobs.WSS = new ws.Server({ server, path })
  clog.notify('websocket on path:', path)

  wsobs.WSS.on('connection', (ws, req)=>{
    ws.ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    if (isAuthReq(req)) {
      LOGFILE.put('access.log', `${ws.ip} is connected`, 'access notify')
    } else {
      clog.notify(ws.ip, 'try to access elecV2P websocket server')
      LOGFILE.put('access.log', `${ws.ip} trying to connect elecV2P`, 'access notify')
      ws.close(4003, `have no permission. IP: ${ws.ip} is recorded`)
      return
    }
    clog.notify(ws.ip, 'new connection')

    // 初始化 ID 及其他信息同步
    ws.id = euid()
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        id: ws.id,
        userid: sHash(CONFIG.wbrtoken),
        vernum: CONFIG.vernum,
        version: CONFIG.version,
        secunset: !CONFIG.SECURITY
      }
    }));
    wsSer.recver.set(ws.id, {
      IP: ws.ip,
      UA: req.headers['user-agent'],
      TM: now()
    })
    // 同步状态信息到所有客户端
    wsSend(JSON.stringify({
      type: 'elecV2Pstatus',
      data: {
        clients: wsobs.WSS.clients.size,
        memoryusage: nStatus(),
        clientsinfo: sJson(wsSer.recver),
      }
    }));
    // 发送当前服务器内存使用状态
    wsobs.send()

    ws.on('message', (msg) => {
      const recvdata = sJson(msg) || msg
      if (recvdata.type && wsSer.recv[recvdata.type]) {
        // 检查是否设置了特定数据处理函数
        wsSer.recv[recvdata.type](recvdata.data, recvdata.id)
      } else {
        wsSer.recv(recvdata, ws.ip)
      }
    })

    ws.on('close', ev=>{
      clog.notify(ws.ip, 'disconnected', 'reason:', ev)
      LOGFILE.put('access.log', `${ws.ip} is disconnected`, 'access notify')
      wsSer.recver.delete(ws.id)
      if(!wsobs.WSS.clients || wsobs.WSS.clients.size <= 0) {
        clog.notify('all clients disconnected now')
        wsobs.stop()
        wsSer.recverlists = []
      } else {
        wsSend(JSON.stringify({
          type: 'elecV2Pstatus',
          data: {
            clients: wsobs.WSS.clients.size,
            memoryusage: nStatus(),
            clientsinfo: sJson(wsSer.recver),
          }
        }))
      }
    })
  })

  wsobs.WSS.on('error', e=>{
    wsobs.WSS = null
    clog.error('websocket error', e)
  })
}

const sseSer = {
  clients: new Map(),
  Send(sid, data) {
    if (!sid) {
      clog.error('a sid is expect for sseSer.Send');
      return;
    }
    if (!this.clients.has(sid)) {
      clog.error('sse', sid, 'not ready yet');
      return;
    }
    let res = this.clients.get(sid);
    if (data === 'end') {
      res.end();
      return;
    }
    if (sType(data) !== 'object') {
      clog.error('a object data is expect for sseSer.Send');
      return;
    }
    res.write('data: ' + sString(data) + '\n\n');
  }
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
  websocketSer, wsSer, sseSer,
  message: new Proxy(messageSend, {
    set(target, prop){
      clog.error('forbid redefine $message method', prop)
      throw new Error('forbid redefine $message method ' + prop)
    }
  })
}