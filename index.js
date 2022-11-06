const { CONFIG, CONFIG_Port } = require('./config')

const webstser = require('./webmodule')
webstser()

const aProxyOptions = {
  port: CONFIG_Port.proxy,
  rule: require('./script/rule.js'),
  webInterface: {
    enable: true,          // 是否打开代理请求查看端口
    webPort: CONFIG_Port.webif
  },
  wsIntercept: Boolean(CONFIG.anyproxy.wsIntercept)
}

const { eproxy, wsSer, logger, message, checkupdate } = require('./utils')
const clog = new logger({ head: 'elecV2P', level: 'debug' })

// anyproxy 临时设置
CONFIG_Port.anyproxy = { ...CONFIG.anyproxy }

if (process.env.PROXYEN) {
  CONFIG_Port.anyproxy.enable = true
}

let eProxy = null
if (CONFIG_Port.anyproxy.enable === false) {
  clog.info('anyproxy not enabled yet')
} else {
  eProxy = new eproxy(aProxyOptions)
  eProxy.start()
}

// websocket 快速打开/关闭 anyproxy
wsSer.recv.eproxy = (op = '')=>{
  if (typeof op === 'object') {
    if (op.port > 0) {
      CONFIG_Port.anyproxy.port = op.port
      aProxyOptions.port = op.port
    }
    if (op.webPort > 0) {
      CONFIG_Port.anyproxy.webPort = op.webPort
      aProxyOptions.webInterface.webPort = op.webPort
    }
    op = op.op || (op.enable ? 'start' : 'close')
  }
  switch(op) {
    case 'new':
    case 'start':
    case 'enable':
      if (eProxy === null) {
        eProxy = new eproxy(aProxyOptions)
        eProxy.start()
        message.success(`anyproxy started on port ${CONFIG_Port.anyproxy.port}`)
      } else {
        clog.info('anyproxy already started')
        message.error('anyproxy already started')
      }
      CONFIG_Port.anyproxy.enable = true
      break
    case 'delete':
    case 'close':
    case 'disable':
      if (eProxy) {
        eProxy.close()
        message.success('anyproxy closed')
        eProxy = null
      } else {
        clog.info('anyproxy already closed')
        message.error('anyproxy already closed')
      }
      CONFIG_Port.anyproxy.enable = false
      break
    case 'restart':
      if (eProxy) {
        eProxy.close()
        eProxy = null
      }
      eProxy = new eproxy(aProxyOptions)
      eProxy.start()
      message.success(`anyproxy restart on port ${CONFIG_Port.anyproxy.port}`)
      CONFIG_Port.anyproxy.enable = true
      break
    default:{
      clog.error('unknow operation on anyproxy:', op)
      message.error('unknow operation on anyproxy')
    }
  }
}

// checkupdate
if (CONFIG.init?.checkupdate !== false) {
  checkupdate().then(body=>{
    if (body.updateversion) {
      clog.notify(`elecV2P v${body.updateversion} is available`)
    }
  })
}