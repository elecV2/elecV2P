const fs = require('fs')

const { logger, CONFIG_FEED } = require('../utils')
const clog = new logger({ head: 'wbconfig' })

module.exports = (app, CONFIG) => {
  app.get("/config", (req, res)=>{
    let type = req.query.type
    switch(req.query.type){
      case 'setting':
        res.end(JSON.stringify({
          gloglevel: CONFIG.gloglevel,
          CONFIG_FEED,
          wbrtoken: CONFIG.wbrtoken,
        }))
        break
      default:
        res.end('no config data to get')
    }
  })

  app.put("/config", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " put config " + req.body.type)
    switch(req.body.type){
      case "config":
        Object.assign(CONFIG, req.body.data)
        Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
        fs.writeFileSync(CONFIG.path, JSON.stringify(CONFIG))
        res.end("当前配置 已保存至 " + CONFIG.path)
        break
      case "gloglevel":
        try {
          CONFIG.gloglevel = req.body.data
          clog.setlevel(CONFIG.gloglevel, true)
          res.end('日志级别设置为：' + CONFIG.gloglevel)
        } catch(e) {
          res.end('日志级别设置失败 ' + e)
          clog.error('日志级别设置失败 ' + e)
        }
        break
      case "wbrtoken":
        CONFIG.wbrtoken = req.body.data
        clog.info('web runjs token 设置为：', CONFIG.wbrtoken)
        res.end('设置成功')
        break
      default:{
        res.end("data put error")
      }
    }
  })
}