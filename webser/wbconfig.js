const express = require('express')

const { logger, setGlog, CONFIG_FEED, CONFIG_Axios, list, file } = require('../utils')
const clog = new logger({ head: 'wbconfig' })

const { CONFIG } = require('../config')
const { CONFIG_RUNJS, CONFIG_RULE } = require('../script')

module.exports = app => {
  const dyn = dynStatic(file.get(CONFIG.efss.directory, 'path'))
  app.use('/efss', dyn)

  function dynStatic(path) {
    let static = express.static(path)
    const dyn = function (req, res, next) {
      return static(req, res, next)
    }
    dyn.setPath = function(newPath) {
      static = express.static(newPath)
    }
    return dyn
  }

  function efssSet(cefss){
    if (cefss.enable === false) {
      clog.notify('efss is closed')
      CONFIG.efss.enable = false
      return 'efss is closed'
    } else {
      const efssF = file.get(cefss.directory, 'path')
      if (file.isExist(efssF)) {
        clog.notify('efss directory set to', cefss.directory)
        dyn.setPath(efssF)
        CONFIG.efss.enable = true
        CONFIG.efss.directory = cefss.directory
        return 'reset efss directory success!'
      } else {
        clog.error(cefss.directory + ' dont exist')
        return cefss.directory + ' dont exist'
      }
    }
  }

  app.get("/config", (req, res)=>{
    let type = req.query.type
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get config data", type)
    switch(req.query.type){
      case 'setting':
        res.end(JSON.stringify({
          homepage: CONFIG.homepage,
          gloglevel: CONFIG.gloglevel || 'info',
          CONFIG_FEED, CONFIG_RUNJS, CONFIG_Axios,
          uagent: CONFIG_RULE.uagent,
          wbrtoken: CONFIG.wbrtoken,
          minishell: CONFIG.minishell || false,
          efss: CONFIG.efss,
          security: CONFIG.SECURITY || {},
          init: CONFIG.init
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
        if (data.efss && data.efss.enable !== false) efssSet(CONFIG.efss)
        if (CONFIG.CONFIG_FEED) CONFIG.CONFIG_FEED.homepage = CONFIG.homepage
        Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
        Object.assign(CONFIG_RUNJS, CONFIG.CONFIG_RUNJS)
        Object.assign(CONFIG_Axios, CONFIG.CONFIG_Axios)
        if (data.gloglevel !== CONFIG.gloglevel) setGlog(data.gloglevel)
        list.put('config.json', JSON.stringify(CONFIG, null, 2))
        res.end("save config to " + CONFIG.path)
        break
      case "homepage":
        let homepage = req.body.data.replace(/\/$/, '')
        CONFIG.homepage = homepage
        CONFIG_FEED.homepage = homepage
        res.end('set homepage success!')
        break
      case "gloglevel":
        try {
          CONFIG.gloglevel = req.body.data
          setGlog(CONFIG.gloglevel)
          res.end('全局日志级别调整为 ' + CONFIG.gloglevel)
        } catch(e) {
          res.end('全局日志级别调整失败 ' + e.message)
          clog.error('全局日志级别调整失败 ' + e.message)
        }
        break
      case "wbrtoken":
        CONFIG.wbrtoken = req.body.data
        clog.notify('webhook token set to', CONFIG.wbrtoken)
        res.end('webhook token set success!')
        break
      case "eAxios":
        try {
          Object.assign(CONFIG_Axios, req.body.data)
          res.end('success! set eAxios')
        } catch(e) {
          res.end('fail to change eAxios setting')
          console.error(e)
        }
        break
      case "efss":
        res.end(efssSet(req.body.data))
        break
      case "security":
        CONFIG.SECURITY = req.body.data
        if (CONFIG.SECURITY.enable === false) {
          res.end('security access is cancelled.')
        } else {
          res.end('updata saved!')
        }
        break
      case "init":
        CONFIG.init = Object.assign(CONFIG.init || {}, req.body.data)
        list.put('config.json', JSON.stringify(CONFIG, null, 2))
        res.end('add initialization runjs: ' + req.body.data.runjs)
        break
      default:{
        res.end("data put error, unknow type: " + req.body.type)
      }
    }
  })
}