const fs = require('fs')

const { logger } = require('./utils')
const clog = new logger({ head: 'anyproxy' })

function anyproxy(eoption) {
  const proxy = require('anyproxy')

  if (eoption.rootCA) {
    require('./func').rootCrtSync()
  }

  if(!proxy.utils.certMgr.ifRootCAFileExists()) {
    proxy.utils.certMgr.generateRootCA((error, keyPath)=>{
      if(error){
        clog.error(error)
      } else {
        clog.notify('新的根证书已生成', keyPath, '安装并信任后，MITM 才能正常工作')
      }
    })
  }

  const options = {
    port: 8001,
    webInterface: {
      enable: true,
      port: 8002
    },
    // throttle: 1000,
    forceProxyHttps: false,
    wsIntercept: false,
    silent: false
  }
  const proxyServer = new proxy.ProxyServer({...options, ...eoption})

  proxyServer.on('ready', ()=>{
    clog.notify('服务器已准备就绪')
  })

  proxyServer.on('error', (e)=>{
    clog.err(e)
  })

  return proxyServer
}

module.exports = anyproxy