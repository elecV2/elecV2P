const { logger, setGlog, CONFIG_FEED, CONFIG_Axios, axProxy, list, file, sString, sHash } = require('../utils')
const clog = new logger({ head: 'wbconfig' })

const { CONFIG, CONFIG_Port } = require('../config')
const { CONFIG_RUNJS, CONFIG_RULE } = require('../script')

module.exports = app => {
  app.get('/config', (req, res)=>{
    let type = req.query.type
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get config data', type)
    switch(req.query.type){
      case 'setting':
        res.json({
          homepage: CONFIG.homepage,
          lang: CONFIG.lang,
          gloglevel: CONFIG.gloglevel || 'info',
          glogslicebegin: CONFIG.glogslicebegin,
          CONFIG_FEED, CONFIG_RUNJS, CONFIG_Axios,
          uagent: CONFIG_RULE.uagent,
          wbrtoken: CONFIG.wbrtoken,
          wbrscript: CONFIG.webhook?.script,
          userid: CONFIG_Port.userid,
          minishell: CONFIG.minishell || false,
          security: CONFIG.SECURITY || {},
          init: CONFIG.init,
          anyproxy: CONFIG.anyproxy,
          webUI: CONFIG.webUI,
          newversion: CONFIG_Port.newversion,
          CONFIG_env: CONFIG.env,
          CONFIG_Path: {
            config: CONFIG_Port.path,
            lists: CONFIG.path_lists, lists_final: CONFIG_Port.path_lists,
            script: CONFIG.path_script, script_final: CONFIG_Port.path_script,
            store: CONFIG.path_store, store_final: CONFIG_Port.path_store,
            shell: CONFIG.path_shell, shell_final: CONFIG_Port.path_shell,
          },
        })
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
          res.download(CONFIG_Port.path)
        } else {
          res.json({
            rescode: -1,
            message: 'no config data to get'
          })
        }
      }
    }
  })

  app.put('/config', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'put config', req.body.type)
    let bSave = true
    switch(req.body.type){
      case 'config':
        let data = req.body.data
        Object.assign(CONFIG, data)
        res.json({
          rescode: 0,
          message: 'CONFIG updated'
        })
        if (CONFIG.CONFIG_FEED) {
          CONFIG.CONFIG_FEED.rss.homepage = CONFIG.homepage
          Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
        }
        Object.assign(CONFIG_RUNJS, CONFIG.CONFIG_RUNJS)
        Object.assign(CONFIG_Axios, CONFIG.CONFIG_Axios)
        if (data.gloglevel !== CONFIG.gloglevel) {
          setGlog(data.gloglevel)
        }
        axProxy.update()
        break
      case 'homepage':
        let homepage = req.body.data.replace(/\/$/, '')
        CONFIG.homepage = homepage
        CONFIG_FEED.rss.homepage = homepage
        res.json({
          rescode: 0,
          message: 'set homepage success!'
        })
        break
      case 'lang':
        CONFIG.lang = req.body.data
        res.json({
          rescode: 0,
          message: 'config lang set to ' + CONFIG.lang
        })
        break
      case 'gloglevel':
        try {
          CONFIG.gloglevel = req.body.data
          setGlog(CONFIG.gloglevel)
          res.json({
            rescode: 0,
            message: 'global log level set to ' + CONFIG.gloglevel
          })
        } catch(e) {
          res.json({
            rescode: -1,
            message: 'global log level change fail ' + e.message
          })
          clog.error('global log level change fail ' + e.message)
          bSave = false
        }
        break
      case 'glogslicebegin':
        CONFIG.glogslicebegin = Number(req.body.data) || 0
        res.json({
          rescode: 0,
          message: 'global log format set slice begin at ' + CONFIG.glogslicebegin
        })
        break
      case 'wbrtoken':
        if (req.body.data?.length >= 10) {
          CONFIG.wbrtoken = req.body.data
          CONFIG_Port.userid = sHash(CONFIG.wbrtoken)
          clog.notify('webhook token success changed')
          res.json({
            rescode: 0,
            message: 'success reset webhook token',
            resdata: { userid: CONFIG_Port.userid },
          })
        } else {
          clog.error('webhook token', req.body.data, 'is illegal')
          res.json({
            rescode: -1,
            message: 'webhook token is illegal'
          })
        }
        break
      case 'wbrscript':
        if (typeof req.body.data === 'object') {
          if (CONFIG.webhook) {
            CONFIG.webhook.script = req.body.data
          } else {
            CONFIG.webhook = { script: req.body.data }
          }
          res.json({
            rescode: 0,
            message: 'success update webhook script'
          })
        } else {
          clog.error('fail to update webhook script', req.body.data)
          res.json({
            rescode: -1,
            message: 'a object is expect for webhook script'
          })
        }
        break
      case 'eAxios':
        try {
          Object.assign(CONFIG_Axios, req.body.data)
          CONFIG.CONFIG_Axios = CONFIG_Axios
          res.json({
            rescode: 0,
            message: 'success! set eAxios'
          })
          axProxy.update()
          process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = CONFIG_Axios.reject_unauthorized === false ? 0 : 1
        } catch(e) {
          res.json({
            rescode: -1,
            message: 'fail to change eAxios setting'
          })
          console.error(e)
          bSave = false
        }
        break
      case 'uagent':
        if (req.body.data) {
          CONFIG_RULE.uagent = req.body.data
          list.put('useragent.list', req.body.data)
          res.json({
            rescode: 0,
            message: 'success update User-Agent list'
          })
        } else {
          res.json({
            rescode: -1,
            message: 'no data to update'
          })
        }
        bSave = false
        break
      case 'runjs':
        try {
          Object.assign(CONFIG_RUNJS, req.body.data)
          CONFIG.CONFIG_RUNJS = CONFIG_RUNJS
          res.json({
            rescode: 0,
            message: 'RUNJS config changed'
          })
        } catch(e) {
          res.json({
            rescode: -1,
            message: 'fail to change RUNJS config' + e.message
          })
        }
        break
      case 'efss':
        let cefss = req.body.data, msg
        if (cefss.enable === false) {
          clog.notify('efss is closed')
          msg = {
            rescode: 0,
            message: 'efss is closed'
          }
        } else if (cefss.directory) {
          const efssF = file.get(cefss.directory, 'path')
          if (file.isExist(efssF, true)) {
            clog.notify('efss directory set to', cefss.directory)
            msg = {
              rescode: 0,
              message: 'reset efss directory success!'
            }
          } else {
            clog.error(cefss.directory + ' dont exist')
            msg = {
              rescode: 404,
              message: cefss.directory + ' dont exist'
            }
          }
        } else {
          msg = {
            rescode: 0,
            message: `efss set ${sString(cefss)}`
          }
        }
        if (msg.rescode === 0) {
          Object.assign(CONFIG.efss, cefss)
        }
        res.json(msg)
        break
      case 'security':
        const tokens_old = CONFIG.SECURITY.tokens || {}
        CONFIG.SECURITY = req.body.data
        const tokens_new = {}
        if (req.body.data.tokens) {
          for (let rawkey in CONFIG.SECURITY.tokens) {
            let token = CONFIG.SECURITY.tokens[rawkey]
            if (token.token && token.token !== CONFIG.wbrtoken) {
              tokens_new[sHash(token.token)] = { ...token, times: tokens_old[rawkey]?.times || 0 }
            }
          }
          CONFIG.SECURITY.tokens = tokens_new
        }
        res.json({
          rescode: 0,
          message: 'config of security is updated',
          resdata: tokens_new
        })
        break
      case 'init':
        CONFIG.init = Object.assign(CONFIG.init || {}, req.body.data.CONFIG_init)
        let cktip = 'checkupdate is ' + (CONFIG.init.checkupdate === false ? 'off' : 'on')
        res.json({
          rescode: 0,
          message: cktip + '\ninitialization runjs ' + (CONFIG.init.runjsenable === false ? 'disabled' : 'enabled'),
          resdata: CONFIG.init.runjs
        })
        break
      case 'anyproxy':
        try {
          CONFIG.anyproxy = Object.assign(CONFIG.anyproxy || {}, req.body.data)
          res.json({
            rescode: 0,
            message: 'anyproxy config success updated'
          })
        } catch(e) {
          res.json({
            rescode: -1,
            message: 'fail to change anyproxy config' + e.message
          })
        }
        break
      case 'webUIPort':
        try {
          CONFIG.webUI = Object.assign(CONFIG.webUI || {}, req.body.data)
          res.json({
            rescode: 0,
            message: 'webUI port config success updated'
          })
        } catch(e) {
          res.json({
            rescode: -1,
            message: 'fail to change webUI port config' + e.message
          })
        }
        break
      case 'webUIFront':
        try {
          if (!CONFIG.webUI) {
            CONFIG.webUI = Object.create(null)
          }
          let bdata = req.body.data
          if (bdata.nav) {
            CONFIG.webUI.nav = Object.assign(CONFIG.webUI.nav || {}, bdata.nav)
          }
          if (bdata.theme) {
            CONFIG.webUI.theme = Object.assign(CONFIG.webUI.theme || {}, bdata.theme)
          }
          res.json({
            rescode: 0,
            message: 'webUI front config success updated'
          })
        } catch(e) {
          res.json({
            rescode: -1,
            message: 'fail to change webUI menunav config' + e.message
          })
        }
        break
      case 'webUILogo':
        if (!CONFIG.webUI) {
          CONFIG.webUI = Object.create(null)
        }
        CONFIG.webUI.logo = req.body.data
        res.json({
          rescode: 0,
          message: 'webUI logo config success updated'
        })
        break
      case 'env':
        const envdata = req.body.data
        if (envdata.path) {
          CONFIG.env.path = envdata.path
          process.env.PATH = envdata.path
          clog.notify('process env PATH change to', envdata.path)
        }
        if (envdata.todel?.length) {
          envdata.todel.forEach(key=>{
            clog.info('delete process env', key)
            delete process.env[key]
            delete CONFIG.env[key]
          })
        }
        if (envdata.other?.length) {
          envdata.other.forEach(s=>{
            if (s[0] && s[1]) {
              clog.info('new process env', s[0], 'value:', s[1])
              process.env[s[0]] = s[1]
              CONFIG.env[s[0]] = s[1]
            }
          })
        }
        res.json({
          rescode: 0,
          message: 'CONFIG and process env updated'
        })
        break
      case 'favend':
        let { prop, keys, value } = req.body
        if (prop === 'collapse') {
          let empty_keys = []
          keys.forEach(key=>{
            if (CONFIG.efss.favend?.[key]) {
              CONFIG.efss.favend[key].collapse = value
            } else {
              empty_keys.push(key)
            }
          })
          res.json({
            rescode: 0,
            message: 'success update favend collapse list',
            resdata: empty_keys.length ? empty_keys : undefined
          })
        } else {
          bSave = false
          res.json({
            rescode: -1,
            message: 'unknow favend config prop ' + prop
          })
        }
        break
      case 'datapath':
        const { lists, script, store, shell } = req.body.data
        CONFIG.path_lists = lists
        CONFIG.path_script = script
        CONFIG.path_store = store
        CONFIG.path_shell = shell
        res.json({
          rescode: 0,
          message: 'success update config path data',
        })
        break
      default:{
        clog.error('data put error, unknow type: ' + req.body.type)
        bSave = false
        res.json({
          rescode: -1,
          message: 'data put error, unknow type: ' + req.body.type
        })
      }
    }
    if (bSave) {
      clog.info('current config saved')
      list.put('config.json', JSON.stringify(CONFIG, null, 2))
    }
  })

  app.post('/config', (req, res)=>{
    if (req.body.file?.content) {
      if (list.put('config.json', req.body.file.content)) {
        return res.json({
          rescode: 0,
          message: 'success import config.json'
        })
      }
    }
    res.json({
      rescode: -1,
      message: 'fail to import config.json, a file content is expect'
    })
  })
}