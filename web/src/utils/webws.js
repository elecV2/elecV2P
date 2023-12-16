 /**
 * elecV2P 客户端 websocket 模块
 */

import { sTime, logHead } from './string.js'
import { store, wsOffline } from './api.js'
import { t as $t } from '../i18n/lang'
import { CONFIG } from './config'

const WEBWS = {
  address: CONFIG.base_url.replace('http', 'ws') + '/elecV2P',
  trynum: 0,                // 尝试连接的次数
  trying: false,            // 正在尝试连接中，但还没连接上
  reconnectnum: 5,          // websocket 断开后尝试重连的最大次数，防止无限循环
  reconnectgap: 10,         // 重连时间间隔。单位： 秒
  wsrecv: {                 // 接收板/单元
    connected: false,
    add(recver, cb){
      if (!(recver && typeof(cb) === 'function')) {
        console.error('websocket recver and a callbak function is expect')
        return
      }
      if (this.lists[recver]) {
        this.lists[recver].push(cb)
      } else {
        this.lists[recver] = [cb]
        if (this.id) {
          readySend(recver)
        }
      }
      if (!this.connected) {
        return 'websocket ' + $t('disconnected')
      }
    },
    dispatch(recver, data){
      if (this.lists.minishell) {
        this.lists.minishell.forEach(cb=>cb({ type: recver, data }))
      }
      if (recver !== 'minishell' && this.lists[recver]) {
        this.lists[recver].forEach(cb=>cb(data))
      } else if (!this.lists.minishell) {
        console.debug('there are no recver', recver, 'to render data', data)
      }
    },
    lists: { },
    connect(){
      newWebsocket()
    }
  },
  upstatus(info){
    if (this.wsrecv.lists['elecV2Pstatus']) {
      this.wsrecv.lists['elecV2Pstatus'].forEach(cb=>cb({ clients: info }))
    }
  }
}

function readySend(recver) {
  if (WEBWS.wsrecv.send) {
    // 通知服务器 recver 已准备好接收数据
    WEBWS.wsrecv.send('ready', recver)
  } else {
    const sendwait = {
      times: 5,
      gap: 3
    }
    sendwait.tmpInt = setInterval(()=>{
      if (WEBWS.wsrecv.send) {
        WEBWS.wsrecv.send('ready', recver)
        clearInterval(sendwait.tmpInt)
        delete sendwait.tmpInt
      } else if (sendwait.times <= 0) {
        console.debug('wsrecv no send method yet')
        clearInterval(sendwait.tmpInt)
        delete sendwait.tmpInt
      } else {
        sendwait.times--
      }
    }, sendwait.gap * 1000)
  }
}

function reconnect() {
  if (WEBWS.trynum >= WEBWS.reconnectnum) {
    let errmsg = '连接失败，请检查网络后尝试刷新页面'
    console.error(`[${logHead('websocket error')}][${sTime(null, 1)}] websocket ${errmsg}`)
    WEBWS.upstatus(errmsg)
    WEBWS.wsrecv.dispatch('tasklog', `[${logHead('websocket error')}][${sTime(null, 1)}] \x1b[31mwebsocket ${errmsg}`)
    WEBWS.wsrecv.dispatch('jsmanage', `[${logHead('websocket error')}][${sTime(null, 1)}] \x1b[31mwebsocket ${errmsg}`)
    return
  }
  wsOffline()
  const regap = WEBWS.reconnectgap * WEBWS.trynum + 5
  console.log(`[${logHead('websocket info')}][${sTime(null, 1)}] 客户端将在 ${regap} 秒后尝试第 ${WEBWS.trynum + 1}/${WEBWS.reconnectnum} 次重连`)
  WEBWS.upstatus(`${ $t('disconnected') }，${ regap } 秒后尝试第 ${WEBWS.trynum + 1}/${WEBWS.reconnectnum} 次重连 ${sTime().split(' ').pop()}`)
  WEBWS.wsrecv.dispatch('tasklog', `[${logHead('websocket error')}][${sTime(null, 1)}] \x1b[31mwebsocket ${ $t('disconnected') }，将在 ${regap} 秒后尝试重连（如果不是手动断开或网络问题，可能是某个脚本运行出错，导致 elecV2P 重启，请根据 errors.log 和当前时间，找到相应脚本进行修改）`);
  WEBWS.wsrecv.dispatch('jsmanage', `[${logHead('websocket error')}][${sTime(null, 1)}] \x1b[31mwebsocket ${ $t('disconnected') }，将在 ${regap} 秒后尝试重连（如果不是手动断开或网络问题，可能是某个脚本运行出错，导致 elecV2P 重启，请根据 errors.log 和当前时间，找到相应脚本进行修改）`);
  setTimeout(()=>{
    newWebsocket()
  }, regap * 1000)
}

async function newWebsocket() {
  // 新建一个 websocket
  WEBWS.trynum++
  if (WEBWS.wsrecv.connected) {
    console.log(`[${logHead('websocket info')}][${sTime(null, 1)}] websocket ${$t('connected')}`)
    return
  }
  if (WEBWS.trying) {
    console.log(`[${logHead('websocket info')}][${sTime(null, 1)}] websocket is trying to connect...`)
    return
  }
  console.log(`[${logHead('websocket info')}][${sTime(null, 1)}] 第 ${WEBWS.trynum} 次尝试 websocket 连接中`)
  WEBWS.upstatus(`第 ${WEBWS.trynum} 次尝试连接中`)

  const webws = new WebSocket(WEBWS.address)
  WEBWS.trying = true
  webws.onopen = ()=>{
    console.log(`[${logHead('websocket info')}][${sTime(null, 1)}] WebSocket connected: ${WEBWS.address}`)
    wsOffline({off: false})
    WEBWS.trynum = 0
    WEBWS.trying = false
    WEBWS.wsrecv.connected = true
    WEBWS.upstatus($t('connected'))
    WEBWS.wsrecv.send = (type, data) => {
      webws.send(JSON.stringify({ type, data, id: WEBWS.wsrecv.id }))
    }
  }

  webws.onmessage = ms => {
    try {
      ms = JSON.parse(ms.data)
      WEBWS.wsrecv.dispatch(ms.type, ms.data)
    } catch(e) {
      console.error('websocket data error:', e)
    }
  }

  webws.onclose = close => {
    console.error('WebSocket closed', close)
    WEBWS.wsrecv.connected = false
    if (close.code === 1008 || close.code === 4003) {
      WEBWS.upstatus('无访问权限')
      WEBWS.wsrecv.dispatch('message', { type: 'error', data: [`websocket 连接失败\n${close.reason}`] })
    } else {
      WEBWS.upstatus($t('disconnected'))
      reconnect()
    }
  }

  webws.onerror = error=>{
    console.debug('WebSocket error', error)
    WEBWS.trying = false
    WEBWS.wsrecv.connected = false
  }
}

WEBWS.wsrecv.add('init', data=>{
  if (data.secunset && !store.get('secunset')) {
    WEBWS.wsrecv.dispatch('message', { type: 'success', data: [`当前 webUI 端口所有用户可访问，如部署在公网\n请务必前往 SETTING/设置 界面打开安全访问`, { url: '#setting', secd: 0 }] });
    console.log(`[${logHead('elecV2P notify')}][${sTime(null, 1)}] 当前 webUI 端口所有用户可访问，如部署在公网请务必前往 SETTING/设置 界面打开安全访问`);
    store.set('secunset', 'true');
  }
  if (!data.vernum) {
    console.error(`[${logHead('elecV2P error')}][${sTime(null, 1)}] 获取 elecV2P 后台版本号失败`);
    return;
  }
  WEBWS.wsrecv.id = data.id;
  Object.keys(WEBWS.wsrecv.lists).forEach(recver=>{
    // 重连时，ready 通知
    WEBWS.wsrecv.send('ready', recver);
    if (recver === 'jsmanage' || recver === 'tasklog') {
      WEBWS.wsrecv.lists[recver].forEach(cb=>cb(`[${logHead('websocket info')}][${sTime(null, 1)}] websocket ${ $t('connected') }`))
    }
  })
  console.log(`[${logHead('elecV2P info')}][${sTime(null, 1)}] 当前 elecV2P 后台版本 ${data.version}`);
  console.log(`[${logHead('elecV2P info')}][${sTime(null, 1)}] 当前 elecV2P webUI 版本 ${CONFIG.version}`);
  if (CONFIG.vernum < data.vernum) {
    WEBWS.wsrecv.dispatch('message', { type: 'error', data: [`当前 webUI 版本低于后台 v${data.version}，可能正在使用缓存页面\n请点击该通知或使用 ctrl+F5 刷新当前页面\n(如果此提醒一直存在可能需要手动进行升级)`, { url: 'reload' }] });
    console.log(`[${logHead('elecV2P info')}][${sTime(null, 1)}] 当前 elecV2P 后台版本 ${data.version}`);
  }
  if (data.userid) {
    console.debug(`[${logHead('elecV2P notify')}][${sTime(null, 1)}] 当前 elecV2P userid ${data.userid}`);
    store.set('userid', data.userid);
    if (store.getCache('sponsors').has(data.userid)) {
      store.setCache('bSponsor', true);
    }
  }
  if (data.glogslicebegin) {
    CONFIG.glogslicebegin = data.glogslicebegin
  }
})

newWebsocket()

export default WEBWS.wsrecv