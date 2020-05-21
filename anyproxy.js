const proxy = require('anyproxy')
const exec = require('child_process').exec

const { logger } = require('./utils')

const clog = new logger({head: 'anyProxy'})

function anyproxy(eoption) {
  if(!proxy.utils.certMgr.ifRootCAFileExists()){
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
  } else {
    clog.info("使用原有根证书")
  }

  const proxyPort = 8001,
        webifPort = 8002

  const options = {
    port: proxyPort,
    webInterface: {
      enable: true,
      port: webifPort
    },
    // throttle: 1000,
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

  proxyServer.start()

  return proxyServer
}

module.exports = anyproxy