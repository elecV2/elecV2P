const ws = require('ws')

const { isAuthReq } = require('./validate')
const { nStatus, euid, sType, sString, sJson, sHash } = require('./string')
const { logger, LOGFILE } = require('./logger')
const { now } = require('./time')
const clog = new logger({ head: 'webSocket', level: 'debug' })

const { CONFIG, CONFIG_Port } = require('../config')

// 服务器 websocket 发送/接收 数据
const wsSer = {
  recver: new Map(),     // recver id UA/IP/TM, alias client
  recverlists: new Map(),       // 客户端 recverlists
  send(data, target = ''){
    wsSend(data, target)
  },
  recv(msg, ip){
    clog.debug('receive message from:', ip, msg)
  },
  getReadyTarget(recver = '', target = '') {
    if (this.recverlists.size === 0) {
      return new Set()
    }
    const target_list = this.recverlists.get(recver) || this.recverlists.get('minishell') || new Set()
    if (target === '') {
      return target_list
    }
    if (target_list.has(target)) {
      return new Set([target])
    } else {
      return new Set()
    }
  },
}

const wsobs = {
  send() {
    if (!wsSer.recverlists.get('elecV2Pstatus')?.size) {
      this.stop()
      return
    }
    wsSend({
      type: 'elecV2Pstatus',
      data: {
        clients: wsobs.WSS.clients.size,
        memoryusage: nStatus(),
        clientsinfo: sJson(wsSer.recver),
      }
    })
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
      this.intval = null
    }
    clog.debug('elecV2Pstatus data send stopped')
  }
}

wsSer.send.func = (type, target = '') => {
  return (data) => {
    wsSend({type, data}, target)
  }
}

wsSer.recv.ready = (recver, target = '') => {
  // 客户端 recver 准备接收数据
  if (wsSer.recverlists.has(recver)) {
    const recver_set = wsSer.recverlists.get(recver)
    if (!recver_set.has(target)) {
      recver_set.add(target)
    }
  } else {
    wsSer.recverlists.set(recver, new Set([target]))
  }
  clog.debug('client:', target, 'recver:', recver, 'is ready')
  if (recver === 'elecV2Pstatus') {
    wsobs.send()
  }
}

wsSer.recv.stopsendstatus = (flag, target) => {
  const estatus = wsSer.recverlists.get('elecV2Pstatus')
  if (flag) {
    estatus?.delete(target)
    if (estatus?.size === 0) {
      wsobs.stop()
    }
  } else {
    estatus?.add(target)
    wsobs.send()
  }
}

function wsSend(data, target = ''){
  const target_list = wsSer.getReadyTarget(data.type, target)
  if (target_list.size === 0) {
    clog.debug('client recver:', data.type, 'not ready yet')
    return
  }
  const debug_ws = CONFIG.debug?.websocket
  if (wsobs.WSS) {
    const data_str = sString(data)
    const state_open = ws.OPEN
    wsobs.WSS.clients.forEach(client=>{
      if (client.readyState === state_open && target_list.has(client.id)) {
        client.send(data_str)
        if (debug_ws) {
          clog.debug('send data to client:', client.id, 'type:', data.type)
        }
      }
    })
  } else if (debug_ws) {
    clog.debug('no websocket clients yet, cant send data:', data)
  }
}

function websocketSer({ server, path }) {
  wsobs.WSS = new ws.Server({ server, path })
  clog.notify('websocket on path:', path)

  wsobs.WSS.on('connection', (ws, req)=>{
    ws.ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).replace(/^::ffff:/, '')
    if (isAuthReq(req)) {
      LOGFILE.put('access.log', `${ws.ip} is connected`, 'access notify')
    } else {
      clog.notify(ws.ip, 'try to access elecV2P websocket server')
      LOGFILE.put('access.log', `${ws.ip} trying to connect elecV2P`, 'access notify')
      ws.close(4003, `have no permission. IP: ${ws.ip} is recorded`)
      return
    }

    // 初始化 ID 及其他信息同步
    ws.id = euid()
    clog.notify(ws.ip, 'connected, set id:', ws.id)
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        id: ws.id,
        userid: sHash(CONFIG.wbrtoken),
        vernum: CONFIG_Port.vernum,
        version: CONFIG_Port.version,
        secunset: !CONFIG.SECURITY,
        glogslicebegin: CONFIG.glogslicebegin,
      }
    }));
    wsSer.recver.set(ws.id, {
      IP: ws.ip,
      UA: req.headers['user-agent'],
      TM: now()
    })
    // 同步状态信息到所有客户端
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
      clog.notify(ws.ip, 'disconnected', 'id:', ws.id, 'reason:', ev)
      LOGFILE.put('access.log', `${ws.ip} is disconnected`, 'access notify')
      wsSer.recver.delete(ws.id)
      if(!wsobs.WSS.clients || wsobs.WSS.clients.size <= 0) {
        clog.notify('all clients disconnected now')
        wsobs.stop()
        wsSer.recverlists.clear()
      } else {
        wsSer.recverlists.forEach(recvers=>{
          recvers.delete(ws.id)
        })
        wsobs.send()
      }
    })
  })

  wsobs.WSS.on('error', e=>{
    wsobs.WSS = null
    clog.error('websocket error', e)
  })
}

// 待优化
// - Send 指定同一路径的单个接收端
const sseSer = {
  clients: new Map(),
  Send(sid, data) {
    if (!this.clients.has(sid)) {
      clog.error('sse connection', sid, 'not ready yet');
      return;
    }
    const resset = this.clients.get(sid);
    if (data === 'end') {
      resset.forEach(res=>res.end());
      return;
    }
    resset.forEach(res=>res.write('data: ' + sString(data) + '\n\n'));
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