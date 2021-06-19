const express = require('express')

const { logger, setGlog, CONFIG_FEED, CONFIG_Axios, axProxy, list, file, sString } = require('../utils')
const clog = new logger({ head: 'wbconfig' })

const { CONFIG } = require('../config')
const { CONFIG_RUNJS, CONFIG_RULE } = require('../script')

module.exports = app => {
  const dyn = dynStatic(file.get(CONFIG.efss.directory, 'path'))
  app.use('/efss', dyn)

  function dynStatic(path) {
    let static = express.static(path, { dotfiles: (CONFIG.efss.dotshow && CONFIG.efss.dotshow.enable) ?  'allow' : 'deny' })
    const dyn = (req, res, next) => static(req, res, next)

    dyn.setPath = (newPath) => {
      static = express.static(newPath, { dotfiles: (CONFIG.efss.dotshow && CONFIG.efss.dotshow.enable) ?  'allow' : 'deny' })
    }
    return dyn
  }

  function efssSet(cefss) {
    if (cefss.enable === false) {
      clog.notify('efss is closed')
      return {
        rescode: 0,
        message: 'efss is closed'
      }
    }
    if (cefss.directory) {
      const efssF = file.get(cefss.directory, 'path')
      if (file.isExist(efssF)) {
        clog.notify('efss directory set to', cefss.directory)
        dyn.setPath(efssF)
        return {
          rescode: 0,
          message: 'reset efss directory success!'
        }
      }
      clog.error(cefss.directory + ' dont exist')
      return {
        rescode: 404,
        message: cefss.directory + ' dont exist'
      }
    }
    return {
      rescode: 0,
      message: `efss set ${sString(cefss)}`
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
          security: CONFIG.SECURITY || {},
          init: CONFIG.init,
          anyproxy: CONFIG.anyproxy,
          webUI: CONFIG.webUI,
          newversion: CONFIG.newversion,
        }))
        break
      default:{
        let token = req.query.token || req.body.token
        if (token === undefined) {
          let ref = req.get('Referer')
          if (ref) {
            ref = new URL(ref)
            token = new URLSearchParams(ref.search).get('token')
          }
        }
        if (token === CONFIG.wbrtoken) {
          res.download(list.get('config.json', 'path'))
        } else {
          res.end('no config data to get')
        }
      }
    }
  })

  app.put("/config", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " put config " + req.body.type)
    let bSave = true
    switch(req.body.type){
      case "config":
        let data = req.body.data
        Object.assign(CONFIG, data)
        if (CONFIG.CONFIG_FEED) {
          CONFIG.CONFIG_FEED.rss.homepage = CONFIG.homepage
          Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
        }
        Object.assign(CONFIG_RUNJS, CONFIG.CONFIG_RUNJS)
        Object.assign(CONFIG_Axios, CONFIG.CONFIG_Axios)
        axProxy.update()
        if (data.gloglevel !== CONFIG.gloglevel) {
          setGlog(data.gloglevel)
        }
        res.end("save config to " + CONFIG.path)
        break
      case "homepage":
        let homepage = req.body.data.replace(/\/$/, '')
        CONFIG.homepage = homepage
        CONFIG_FEED.rss.homepage = homepage
        res.end('set homepage success!')
        break
      case "gloglevel":
        try {
          CONFIG.gloglevel = req.body.data
          setGlog(CONFIG.gloglevel)
          res.end(JSON.stringify({
            rescode: 0,
            message: 'global log level set to ' + CONFIG.gloglevel
          }))
        } catch(e) {
          res.end(JSON.stringify({
            rescode: -1,
            message: 'global log level change fail ' + e.message
          }))
          clog.error('global log level change fail ' + e.message)
          bSave = false
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
          CONFIG.CONFIG_Axios = CONFIG_Axios
          res.end(JSON.stringify({
            rescode: 0,
            message: 'success! set eAxios'
          }))
          axProxy.update()
        } catch(e) {
          res.end(JSON.stringify({
            rescode: -1,
            message: 'fail to change eAxios setting'
          }))
          console.error(e)
          bSave = false
        }
        break
      case "uagent":
        if (req.body.data) {
          CONFIG_RULE.uagent = req.body.data
          list.put('useragent.list', JSON.stringify(req.body.data, null, 2))
          res.end('success update User-Agent list')
        } else {
          res.end('no data to update')
        }
        bSave = false
        break
      case "runjs":
        try {
          Object.assign(CONFIG_RUNJS, req.body.data)
          CONFIG.CONFIG_RUNJS = CONFIG_RUNJS
          res.end(JSON.stringify({
            rescode: 0,
            message: 'RUNJS config changed'
          }))
        } catch(e) {
          res.end(JSON.stringify({
            rescode: -1,
            message: 'fail to change RUNJS config' + e.message
          }))
        }
        break
      case "efss":
        let msg = efssSet(req.body.data)
        if (msg.rescode === 0) {
          Object.assign(CONFIG.efss, req.body.data)
        }
        res.end(JSON.stringify(msg))
        break
      case "security":
        CONFIG.SECURITY = req.body.data
        let secmsg = {
          rescode: 0,
          message: 'security access is cancelled'
        }
        if (CONFIG.SECURITY.enable) {
          secmsg.message = 'security updated'
        }
        res.end(JSON.stringify(secmsg))
        break
      case "init":
        CONFIG.init = Object.assign(CONFIG.init || {}, req.body.data.CONFIG_init)
        let cktip = 'checkupdate is ' + (CONFIG.init.checkupdate === false ? 'off' : 'on')
        if (req.body.data.CONFIG_init.runjs) {
          res.end(cktip + '\nadd initialization runjs: ' + req.body.data.CONFIG_init.runjs)
        } else {
          res.end(cktip + '\ninitialization runjs is cleared')
        }
        break
      case "anyproxy":
        try {
          CONFIG.anyproxy = Object.assign(CONFIG.anyproxy || {}, req.body.data)
          res.end(JSON.stringify({
            rescode: 0,
            message: 'anyproxy config success updated'
          }))
        } catch(e) {
          res.end(JSON.stringify({
            rescode: -1,
            message: 'fail to change anyproxy config' + e.message
          }))
        }
        break
      case "webUI":
        try {
          CONFIG.webUI = Object.assign(CONFIG.webUI || {}, req.body.data)
          res.end(JSON.stringify({
            rescode: 0,
            message: 'webUI config success updated'
          }))
        } catch(e) {
          res.end(JSON.stringify({
            rescode: -1,
            message: 'fail to change webUI config' + e.message
          }))
        }
        break
      default:{
        clog.error('data put error, unknow type: ' + req.body.type)
        bSave = false
        res.end(JSON.stringify({
          rescode: -1,
          message: 'data put error, unknow type: ' + req.body.type
        }))
      }
    }
    if (bSave) {
      clog.info('current config save to script/Lists/config.json')
      list.put('config.json', JSON.stringify(CONFIG, null, 2))
    }
  })
}