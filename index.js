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

let eProxy = null
if (CONFIG.anyproxy.enable === false) {
  clog.info('anyproxy not enabled yet')
} else {
  eProxy = new eproxy(aProxyOptions)
  eProxy.start()
}

// anyproxy 临时设置
CONFIG_Port.anyproxy = { ...CONFIG.anyproxy }

// websocket 快速打开/关闭 anyproxy
wsSer.recv.eproxy = (op)=>{
  switch(op) {
    case 'new':
    case 'start':
      if (eProxy === null) {
        eProxy = new eproxy(aProxyOptions)
        eProxy.start()
        message.success('anyproxy started')
      } else {
        clog.info('anyproxy already started')
        message.error('anyproxy already started')
      }
      CONFIG_Port.anyproxy.enable = true
      break
    case 'delete':
    case 'close':
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
    default:{
      clog.error('unknow operation on anyproxy')
      message.error('unknow operation on anyproxy')
    }
  }
}

// checkupdate
if (CONFIG.init && CONFIG.init.checkupdate === false) {
  delete CONFIG.newversion
} else {
  checkupdate().then(body=>{
    if (body.updateversion) {
      clog.notify(`elecV2P v${body.updateversion} is available`)
    }
  })
}