const fs = require('fs')
const path = require('path')

const { logger } = require('../utils')
const clog = new logger({ head: 'wbdata' })

const { CONFIG_RULE, JSLISTS } = require('../runjs')

module.exports = (app, CONFIG_Port) => {
  app.get("/data", (req, res)=>{
    let type = req.query.type
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
  + ` get data ${type}`)
    res.writeHead(200,{ 'Content-Type' : 'text/plain;charset=utf-8' })
    switch (type) {
      case "rules":
        res.end(JSON.stringify({
          eplists: [...CONFIG_RULE.reqlists, ...CONFIG_RULE.reslists],
          uagent: CONFIG_RULE.uagent,
          jslists: JSLISTS
        }))
        break
      case "rewritelists":
        res.end(JSON.stringify({
          rewritelists: CONFIG_RULE.rewritelists,
          subrules: CONFIG_RULE.subrules,
          jslists: JSLISTS
        }))
        break
      case "mitmhost":
        res.end(JSON.stringify({
          mitmhost: CONFIG_RULE.mitmhost,
        }))
        break
      case "filter":
        res.end(fs.readFileSync(path.join(__dirname, '../runjs', 'Lists', 'filter.list'), 'utf8'))
        break
      case "todolist":
        res.end(fs.readFileSync(path.join(__dirname, '../Todo.md'), "utf8"))
        break
      case "overview":
        res.end(JSON.stringify({
          proxyPort: CONFIG_Port.proxy,
          webifPort: CONFIG_Port.webif,
          ruleslen: CONFIG_RULE.reqlists.length + CONFIG_RULE.reslists.length,
          rewriteslen: CONFIG_RULE.rewritelists.length,
          jslistslen: JSLISTS.length,
          mitmhostlen: CONFIG_RULE.mitmhost.length
        }))
        break
      default: {
        res.end("404")
      }
    }
  })

  app.put("/data", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " put data " + req.body.type)
    switch(req.body.type){
      case "rules":
        let fdata = req.body.data.eplists
        fs.writeFileSync(path.join(__dirname, '../runjs', 'Lists', 'default.list'), "[elecV2P rules]\n" + fdata.join("\n"))

        res.end("规则保存成功")
        CONFIG_RULE.reqlists = []
        CONFIG_RULE.reslists = []
        fdata.forEach(r=>{
          if (/req$/.test(r)) CONFIG_RULE.reqlists.push(r)
          else CONFIG_RULE.reslists.push(r)
        })
        clog.notify(`default 规则 ${ CONFIG_RULE.reqlists.length + CONFIG_RULE.reslists.length} 条`)
        break
      case "mitmhost":
        let mhost = req.body.data
        mhost = mhost.filter(host=>host.length>2)
        fs.writeFileSync(path.join(__dirname, '../runjs', 'Lists', 'mitmhost.list'), "[mitmhost]\n\n" + mhost.join("\n"))
        res.end("保存 mitmhost : " + mhost.length)
        CONFIG_RULE.mitmhost = mhost
        break
      default:{
        res.end("data put error")
      }
    }
  })
}