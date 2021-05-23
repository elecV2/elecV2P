const { CONFIG, CONFIG_Port } = require('../config')

const { logger, list, sType, stream, checkupdate } = require('../utils')
const clog = new logger({ head: 'wbdata' })

const { CONFIG_RULE, JSLISTS } = require('../script')
const { crtInfo, taskMa, sysInfo } = require('../func')

module.exports = app => {
  app.get("/data", (req, res)=>{
    let type = req.query.type
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
  + ` get data ${type}`)
    res.writeHead(200, { 'Content-Type' : 'text/plain;charset=utf-8' })
    switch (type) {
      case "overview":
        res.end(JSON.stringify({
          proxyPort: CONFIG_Port.proxy,
          webifPort: CONFIG_Port.webif,
          ruleslen: CONFIG_RULE.reqlists.length + CONFIG_RULE.reslists.length,
          rewriteslen: CONFIG_RULE.rewritelists.length,
          jslistslen: JSLISTS.length,
          taskstatus: taskMa.status(),
          mitmhostlen: CONFIG_RULE.mitmhost.length,
          version: CONFIG.version,
          start: CONFIG.start,
          anyproxy: CONFIG_Port.anyproxy,
          newversion: CONFIG.newversion,
          sysinfo: sysInfo(),
        }))
        break
      case "rules":
        let rlist = list.get('default.list')
        res.end(JSON.stringify({
          eplists: (rlist && rlist.rules) || {list: []},
          uagent: CONFIG_RULE.uagent,
          jslists: JSLISTS
        }))
        break
      case "rewritelists":
        res.end(JSON.stringify(list.get('rewrite.list')))
        break
      case "mitmhost":
        let mlist = list.get('mitmhost.list')
        res.end(JSON.stringify({
          host: (mlist && mlist.list) || [],
          type: CONFIG_RULE.mitmtype,
          crtinfo: crtInfo()
        }))
        break
      case "filter":
        res.end(list.get('filter.list'))
        break
      case "update":
      case "newversion":
      case 'checkupdate':
        checkupdate(Boolean(req.query.force)).then(body=>{
          res.end(JSON.stringify(body))
        })
        break
      case 'stream':
        if (req.query.url && req.query.url.startsWith('http')) {
          stream(req.query.url).then(response=>{
            response.pipe(res)
          }).catch(e=>{
            res.end(JSON.stringify({
              rescode: -1,
              message: e
            }))
          })
        } else {
          clog.error('wrong stream url', req.query.url)
          res.end(JSON.stringify({
            rescode: -1,
            message: 'wrong stream url ' + req.query.url
          }))
        }
        break
      default: {
        clog.error('unknow data get type', type)
        res.end("404")
      }
    }
  })

  app.put("/data", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "put data", req.body.type)
    switch(req.body.type){
      case "rules":
        let fdata = req.body.eplists
        if (fdata && fdata.length) {
          let renlist = fdata.filter(r=>r.enable !== false)
          if (list.put('default.list', {
            rules: {
              note: req.body.note || "elecV2P RULES 规则列表",
              total: fdata.length,
              active: renlist.length,
              list: fdata
            }
          })){
            res.end(JSON.stringify({
              rescode: 0,
              message: "success! rules list saved: " + fdata.length
            }))
            CONFIG_RULE.reqlists = []
            CONFIG_RULE.reslists = []
            renlist.forEach(r=>{
              if (r.stage === 'req') {
                CONFIG_RULE.reqlists.push(r)
              } else {
                CONFIG_RULE.reslists.push(r)
              }
            })
          } else {
            res.end(JSON.stringify({
              rescode: -1,
              message: "fail to save rules list"
            }))
          }
        } else {
          res.end(JSON.stringify({
            rescode: -1,
            message: "some data is expect"
          }))
        }
        break
      case "rewrite":
        if (req.body.rewritesub || req.body.rewritelists) {
          let enlist = req.body.rewritelists.filter(r=>r.enable !== false)
          if (list.put('rewrite.list', {
            rewritesub: req.body.rewritesub,
            rewrite: {
              note: req.body.note || "elecV2P 重写规则",
              total: req.body.rewritelists.length,
              active: enlist.length,
              list: req.body.rewritelists
            }
          })){
            res.end(JSON.stringify({
              rescode: 0,
              message: "success! rewrite list saved: " + req.body.rewritelists.length
            }))
            CONFIG_RULE.rewritelists = []
            CONFIG_RULE.rewritereject = []
            enlist.forEach(r=>{
              if (/^reject(-200|-dict|-json|-array|-img)?$/.test(r.target)) {
                CONFIG_RULE.rewritereject.push(r)
              } else {
                CONFIG_RULE.rewritelists.push(r)
              }
            })
          } else {
            res.end(JSON.stringify({
              rescode: -1,
              message: "fail to save rewrite list"
            }))
          }
        } else {
          res.end(JSON.stringify({
            rescode: -1,
            message: "some data is expect"
          }))
        }
        break
      case "mitmhost":
        let mhost = req.body.data
        let enhost = mhost.filter(host=>host.enable !== false).map(host=>typeof host === 'string' ? host : host.host)
        if (list.put('mitmhost.list', {
          mitmhost: {
            note: req.body.note || 'elecV2P mitmhost',
            total: mhost.length,
            active: enhost.length,
            list: mhost
          }
        })){
          res.end(JSON.stringify({
            rescode: 0,
            message: "success! mitmhost list saved: " + mhost.length
          }))
          CONFIG_RULE.mitmhost = enhost
        } else {
          res.end(JSON.stringify({
            rescode: -1,
            message: "fail to save mitmhost list"
          }))
        }
        break
      case "mitmhostadd":
        if (req.body.data && sType(req.body.data) === 'array' && req.body.data.length) {
          let faddhost = req.body.data.filter(host=>host.length>2 && CONFIG_RULE.mitmhost.indexOf(host) === -1)
          if (list.put('mitmhost.list', faddhost, { type: 'add' })) {
            res.end(JSON.stringify({
              rescode: 0,
              message: "success! mitmhost list update " + faddhost.length
            }))
            CONFIG_RULE.mitmhost.push(...faddhost)
          } else {
            res.end(JSON.stringify({
              rescode: -1,
              message: "fail to update mitmhost list"
            }))
          }
        } else {
          res.end(JSON.stringify({
            rescode: -1,
            message: "body data is expect"
          }))
        }
        break
      case "mitmtype":
        let mtype = req.body.data
        CONFIG_RULE.mitmtype = mtype
        if (mtype === 'all') {
          clog.notify('MITM 设置为全局模式')
        } else if (mtype === 'none') {
          clog.notify('MITM 已关闭')
        } else {
          clog.notify('MITM 设置为按列表域名解析模式')
        }
        res.end('设置成功')
        break
      default:{
        clog.error('unknow data put type', req.body.type)
        res.end("data put error")
      }
    }
  })
}