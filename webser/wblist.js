const fs = require('fs')
const path = require('path')

const { logger, list } = require('../utils')
const clog = new logger({ head: 'wblist' })

const { CONFIG, CONFIG_Port } = require('../config')
const { CONFIG_RULE } = require('../script')

module.exports = app => {
  const LISTPATH = path.join(__dirname, '../script', 'Lists')

  app.get('/filter', (req, res)=>{
    res.send(list.get('filter.list'))
  })

  app.get('/pac', (req, res)=>{
    res.set('Content-Type', 'application/x-ns-proxy-autoconfig')
    res.set('Content-Disposition', 'attachment; filename="proxy.pac"')
    res.end(`const CONFIG = {
  eproxy: "${CONFIG.pac?.proxy || ('127.0.0.1:' + CONFIG_Port.proxy)}",
  enable: ${CONFIG_RULE.mitmhostenable},
  mitmall: ${CONFIG_RULE.mitmtype === 'all'},
  mitmhost: ${JSON.stringify((CONFIG_RULE.mitmhostenable && CONFIG_RULE.mitmtype !== 'all') ? CONFIG_RULE.mitmhost : [])},
}

function FindProxyForURL(url, host) {
  if (CONFIG.enable === false) {
    return 'DIRECT'
  }
  if (CONFIG.mitmall) {
    return 'PROXY ' + CONFIG.eproxy
  }
  if (CONFIG.mitmhost.indexOf(host) !== -1) {
    return 'PROXY ' + CONFIG.eproxy
  }
  for (let h of CONFIG.mitmhost) {
    if (/\\*/.test(h) && new RegExp(h.replace(/\\./g, '\\\\.').replace(/\\*/g, '.*')).test(host)) {
      return 'PROXY ' + CONFIG.eproxy
    }
  }
  return 'DIRECT'
}`)
  })
  app.put('/pac', (req, res)=>{
    if (req.body.proxy) {
      CONFIG.pac = {
        ...CONFIG.pac,
        proxy: req.body.proxy,
      }
      res.json({
        rescode: 0,
        message: 'pac proxy updated!'
      })
      list.put('config.json', JSON.stringify(CONFIG, null, 2))
    } else {
      res.json({
        rescode: -1,
        message: 'a proxy string is expect'
      })
    }
  })

  app.post('/filterlist', (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'update filter.list')
    if (req.body.filterlist) {
      let file = fs.createWriteStream(path.join(LISTPATH, 'filter.list')), len = 0
      file.on('error', (err)=>clog.error(err))
      file.write('[elecV2P filter.list]\n')
      req.body.filterlist.forEach(fr=>{
        if (fr[1] && /^(DOMAIN(-SUFFIX)?|IP-CIDR)$/.test(fr[0])) {
          file.write(fr[0] + ',' + fr[1] + ',elecV2P\n')
          len++
        }
      })
      file.end()
      res.json({
        rescode: 0,
        message: 'success save filter list ' + len
      })
    } else {
      res.json({
        rescode: -1,
        message: 'a parameter filterlist is expect'
      })
    }
  })
}