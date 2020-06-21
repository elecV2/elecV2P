const fs = require('fs')
const proxy = require('anyproxy')
const exec = require('child_process').exec

const { logger } = require('./utils')
const clog = new logger({ head: 'anyproxy' })

function anyproxy(eoption) {
  if (eoption.rootCA) {
    const homedir = require('os').homedir()
    if(!fs.existsSync(homedir + '/.anyproxy')) fs.mkdirSync(homedir + '/.anyproxy')
    if(!fs.existsSync(homedir + '/.anyproxy/certificates')) fs.mkdirSync(homedir + '/.anyproxy/certificates')
    require('./func').rootCrtSync()
  }
  if(!proxy.utils.certMgr.ifRootCAFileExists()) {
    proxy.utils.certMgr.generateRootCA((error, keyPath)=>{
      if(!error){
        const certDir = require('path').dirname(keyPath)
        clog.notify('准备生成新的根证书: ' + certDir)
        const isWin = /^win/.test(process.platform)
        if(isWin){
          exec('start .', {cwd: certDir})
        } else {
          exec('open .', {cwd: certDir})
        }
      } else {
        clog.err(error)
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