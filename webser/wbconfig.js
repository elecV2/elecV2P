const { logger, setGlog, CONFIG_FEED, CONFIG_Axios, list } = require('../utils')
const clog = new logger({ head: 'wbconfig' })

const { CONFIG } = require('../config')
const { CONFIG_RUNJS, CONFIG_RULE } = require('../runjs')

module.exports = app => {
  app.get("/config", (req, res)=>{
    let type = req.query.type
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get config data", type)
    switch(req.query.type){
      case 'setting':
        res.end(JSON.stringify({
          homepage: CONFIG.homepage,
          gloglevel: CONFIG.gloglevel || 'info',
          CONFIG_FEED,
          CONFIG_RUNJS,
          CONFIG_Axios,
          uagent: CONFIG_RULE.uagent,
          wbrtoken: CONFIG.wbrtoken,
          minishell: CONFIG.minishell || false
        }))
        break
      default:{
        res.end('no config data to get')
      }
    }
  })

  app.put("/config", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " put config " + req.body.type)
    switch(req.body.type){
      case "config":
        let data = req.body.data
        Object.assign(CONFIG, data)
        CONFIG_FEED.homepage = CONFIG.homepage
        Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
        Object.assign(CONFIG_RUNJS, CONFIG.CONFIG_RUNJS)
        Object.assign(CONFIG_Axios, CONFIG.CONFIG_Axios)
        if (data.gloglevel !== CONFIG.gloglevel) setGlog(data.gloglevel)
        list.put('config.json', JSON.stringify(CONFIG, null, 2))
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
          res.end('全局日志级别成功设置为 ' + CONFIG.gloglevel)
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
      case "eAxios":
        Object.assign(CONFIG_Axios, req.body.data)
        res.end('eAxios 设置成功')
        break
      default:{
        res.end("data put error")
      }
    }
  })
}