const fs = require('fs')
const os = require('os')
const path = require('path')
const anyproxy = require('anyproxy')

const { logger } = require('./logger')

class eproxy {
  options = {
    port: 8001,
    webInterface: {
      enable: true,
      webPort: 8002
    },
    // throttle: 1000,               // 限速: k/s
    forceProxyHttps: false,
    wsIntercept: true,
    silent: false
  }

  constructor(eoption = { }) {
    this.name = eoption.name || 'anyproxy'
    this.eoption = eoption
    this.clog = new logger({ head: this.name, level: 'debug' })
  }

  new(eoption = this.eoption){
    require('../func').rootCrtSync().catch(e=>{
      anyproxy.utils.certMgr.generateRootCA((error, keyPath, crtPath)=>{
        if(error){
          this.clog.error(error)
        } else {
          this.clog.notify('a new rootCA is generated at', crtPath, '\nplease install and trust it to make MITM work')
        }
      })
    }).finally(()=>{
      this.ProxyServer = new anyproxy.ProxyServer({...this.options, ...eoption})

      this.ProxyServer.on('ready', ()=>{
        this.clog.notify('anyproxy is ready')
      })

      this.ProxyServer.on('error', (e)=>{
        this.clog.err(e.stack || e)
      })

      this.ProxyServer.start()
    })
  }

  start(){
    if (this.ProxyServer) {
      this.ProxyServer.start()
    } else {
      this.new()
    }
  }

  close(){
    if (this.ProxyServer) {
      this.ProxyServer.close()
      this.clog.notify(this.name, 'is closed')
      delete this.ProxyServer
      this.clog.info('trying to delete anyproxy temp cache...')
      fs.rmSync(path.join(os.tmpdir(), 'anyproxy/cache'), { recursive: true, force: true })
      this.clog.info('anyproxy temp cache directory deleted')
    } else {
      this.clog.error('anyproxy not ready yet')
    }
  }
}

module.exports = { eproxy }