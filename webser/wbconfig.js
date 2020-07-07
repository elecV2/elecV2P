const fs = require('fs')

const { logger, setGlog, CONFIG_FEED } = require('../utils')
const clog = new logger({ head: 'wbconfig' })

module.exports = (app, CONFIG) => {
  app.get("/config", (req, res)=>{
    let type = req.query.type
    switch(req.query.type){
      case 'setting':
        res.end(JSON.stringify({
          homepage: CONFIG.homepage,
          gloglevel: CONFIG.gloglevel,
          CONFIG_FEED,
          wbrtoken: CONFIG.wbrtoken,
          minishell: CONFIG.minishell || false
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
        CONFIG_FEED.homepage = CONFIG.homepage
        Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
        fs.writeFileSync(CONFIG.path, JSON.stringify(CONFIG, null, 2))
        res.end("当前配置 已保存至 " + CONFIG.path)
        break
      case "homepage":
        let homepage = req.body.data.replace(/\/$/, '')
        CONFIG.homepage = homepage
        CONFIG_FEED.homepage = homepage
        res.end('主页设置成功')
        break
      case "gloglevel":
        try {
          CONFIG.gloglevel = req.body.data
          setGlog(CONFIG.gloglevel)
          clog.notify('全局日志级别设置为：' + CONFIG.gloglevel)
          res.end('设置成功')
        } catch(e) {
          res.end('全局日志级别设置失败 ' + e)
          clog.error('全局日志级别设置失败 ' + e)
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