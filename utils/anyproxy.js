const anyproxy = require('anyproxy')

const { logger } = require('./logger')
const clog = new logger({ head: 'anyproxy' })

module.exports = (eoption = {}) => {
  if (eoption.rootCA) {
    if (require('../func/crt.js').rootCrtSync() === false) {
      anyproxy.utils.certMgr.generateRootCA((error, keyPath)=>{
        if(error){
          clog.error(error)
        } else {
          clog.notify('a new rootCA is generated at', keyPath, '. please install and trust it, to make MITM work')
        }
      })
    }
  }

  const options = {
    port: 8001,
    webInterface: {
      enable: true,
      webPort: 8002
    },
    // throttle: 1000,               // 限速: k/s
    forceProxyHttps: false,
    wsIntercept: false,
    silent: false
  }
  const proxyServer = new anyproxy.ProxyServer({...options, ...eoption})

  proxyServer.on('ready', ()=>{
    clog.notify('elecV2P is ready')
  })

  proxyServer.on('error', (e)=>{
    clog.err(e.stack || e)
  })

  return proxyServer
}