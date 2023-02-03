const os = require('os')
const { taskMa, exec, crtHost } = require('../func')
const { CONFIG_RULE, runJSFile } = require('../script')

const { logger, LOGFILE, Jsfile, list, nStatus, sString, sType, surlName, sBool, stream, downloadfile, now, checkupdate, store, kSize, errStack, sbufBody, wsSer, validate_status, sJson, hDays } = require('../utils')
const clog = new logger({ head: 'webhook', level: 'debug' })

const { CONFIG, CONFIG_Port } = require('../config')

function handler(req, res){
  if (!CONFIG.wbrtoken) {
    return res.status(500).json({
      rescode: -1,
      message: 'webhook token not set yet'
    })
  }
  const rbody = Object.assign(req.body || {}, req.query || {})
  if (rbody.token !== CONFIG.wbrtoken) {
    return res.status(403).json({
      rescode: 403,
      message: 'token is illegal'
    })
  }
  const clientip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  clog.notify(clientip, req.method, 'webhook type', rbody.type)
  switch(rbody.type) {
  case 'jslist':
    res.json({
      rescode: 0,
      message: 'Get script file list',
      resdata: Jsfile.get('list')
    });
    break
  case 'jsrun':
  case 'runjs':
  case 'runscript':
    let fn = rbody.fn || ''
    if (!rbody.rawcode && !fn) {
      clog.info('can\'t find any script code to run')
      return res.json({
        rescode: -1,
        message: 'can\'t find any script code to run'
      })
    } else {
      const addContext = {
        from: 'webhook'
      }
      fn = decodeURI(fn)
      let showfn = ''
      if (rbody.rawcode) {
        addContext.type = 'rawcode'
        fn = rbody.rawcode
        showfn = 'rawcode.js'
      } else if (/^https?:\/\/\S{4,}/.test(fn)) {
        showfn = surlName(fn.split(' ')[0])
      } else {
        showfn = fn.split(' ')[0]
      }
      if (rbody.rename) {
        if (!/\.js$/i.test(rbody.rename)) {
          rbody.rename += '.js'
        }
        addContext.rename = rbody.rename
        showfn = rbody.rename
      }
      if (sType(rbody.env) === 'object') {
        addContext.env = rbody.env
      }
      if (rbody.grant) {
        addContext.grant = rbody.grant
      }
      addContext.timeout = 5000
      runJSFile(fn, addContext).then(data=>{
        res.json({
          rescode: 0,
          message: 'success run script ' + showfn,
          resdata: data
        })
      }).catch(error=>{
        res.json({
          rescode: -1,
          message: 'fail to run script ' + showfn,
          resdata: error
        })
      });
    }
    break
  case 'deljs':
  case 'jsdel':
  case 'deletejs':
  case 'jsdelete':
    if (rbody.op === 'clear') {
      return res.json({
        rescode: 0,
        message: 'all file without .js extname on JSFile folder is cleared',
        resdata: Jsfile.clear()
      })
    }
    if (!rbody.fn) {
      return res.json({
        rescode: -1,
        message: 'a parameter fn is expect'
      })
    }
    let jsfn = rbody.fn
    clog.info(clientip, 'delete script file', jsfn)
    let bDelist = Jsfile.delete(jsfn)
    if (bDelist) {
      if (sType(bDelist) === 'array') {
        res.json({
          rescode: 0,
          message: bDelist.join(', ') + ' success delete'
        })
      } else {
        res.json({
          rescode: 0,
          message: jsfn + ' success delete'
        })
      }
    } else {
      res.json({
        rescode: -1,
        message: jsfn + ' not exist'
      })
    }
    break
  case 'jsfile':
    if (!rbody.fn) {
      return res.json({
        rescode: -1,
        message: 'a parameter fn is expect'
      })
    }
    switch (rbody.op) {
    case 'put':
      if (!rbody.rawcode) {
        return res.json({
          rescode: -1,
          message: 'a parameter rawcode is expect'
        })
      }
      if (Jsfile.put(rbody.fn, rbody.rawcode)) {
        res.json({
          rescode: 0,
          message: 'success save ' + rbody.fn
        })
      } else {
        res.json({
          rescode: -1,
          message: 'fail to save ' + rbody.fn
        })
      }
      break
    case 'get':
    default:
      let jsfilecont = Jsfile.get(rbody.fn)
      if (jsfilecont) {
        res.json({
          rescode: 0,
          message: 'Get script file ' + rbody.fn + ' content',
          resdata: jsfilecont
        });
      } else {
        res.status(404).json({
          rescode: 404,
          message: rbody.fn + ' not exist'
        })
      }
    }
    break
  case 'dellog':
  case 'logdel':
  case 'logdelete':
  case 'deletelog':
    let name = rbody.fn
    clog.info(clientip, 'delete log', name)
    if (LOGFILE.delete(name)) {
      res.json({
        rescode: 0,
        message: name + ' success delete'
      })
    } else {
      res.json({
        rescode: -1,
        message: name + ' log file not exist'
      })
    }
    break
  case 'logget':
  case 'getlog':
    if (!rbody.fn) {
      return res.json({
        rescode: -1,
        message: 'parameter fn is expect'
      })
    }
    clog.info(clientip, 'Get log', rbody.fn);
    let logcont = LOGFILE.get(rbody.fn)
    if (logcont) {
      if (sType(logcont) === 'array') {
        res.json({
          rescode: 0,
          message: 'Get log file list',
          resdata: logcont
        });
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' });
        logcont.pipe(res)
      }
    } else {
      res.status(404).json({
        rescode: 404,
        message: rbody.fn + ' not exist'
      })
    }
    break
  case 'status':
    clog.info(clientip, 'Get server status');
    let status = nStatus()
    status.start = now(CONFIG_Port.start, false, 0)
    status.uptime = hDays(CONFIG_Port.start)
    status.nodejs = process.version
    status.version = CONFIG_Port.version
    status.clients = wsSer.recver.size
    status.scripts = Jsfile.get('list').length
    status.task = taskMa.status()
    res.json(status)
    break
  case 'task':
    clog.info(clientip, 'Get all task');
    res.json(taskMa.info())
    break
  case 'taskinfo':
    clog.info(clientip, 'Get taskinfo', rbody.tid);
    if (!rbody.tid || rbody.tid === 'all') {
      let status = taskMa.status()
      status.info = taskMa.info()
      res.json(status)
    } else {
      let taskinfo = taskMa.info(rbody.tid)
      if (taskinfo) {
        return res.json(taskinfo)
      }
      res.json({
        rescode: -1,
        message: 'no such task with taskid: ' + rbody.tid
      })
    }
    break
  case 'taskstart':
    clog.notify(clientip, 'start task', rbody.tid)
    res.json(taskMa.start(rbody.tid))
    break
  case 'taskstop':
    clog.notify(clientip, 'stop task', rbody.tid)
    res.json(taskMa.stop(rbody.tid))
    break
  case 'taskadd':
    clog.notify(clientip, 'add new task')
    res.json(taskMa.add(rbody.task, rbody.options))
    break
  case 'tasksave':
    clog.notify(clientip, 'save current task list')
    res.json(taskMa.save())
    break
  case 'taskdel':
  case 'taskdelete':
  case 'deltask':
  case 'deletetask':
    clog.notify(clientip, 'delete task', rbody.tid)
    res.json(taskMa.delete(rbody.tid))
    break
  case 'download':
  case 'downloadfile':
    clog.notify(clientip, 'start download file to', rbody.folder || 'efss')
    if (rbody.url && /^https?:\/\/\S{4,}/.test(rbody.url)) {
      downloadfile(rbody.url, { folder: rbody.folder, name: rbody.name }).then(dest=>{
        clog.info(rbody.url, 'download to', dest)
        res.json({
          rescode: 0,
          message: 'success download ' + rbody.url,
          resdata: dest
        })
      }).catch(e=>{
        clog.error('download', rbody.url, 'error', e)
        res.json({
          rescode: -1,
          message: 'fail to download ' + rbody.url,
          resdata: e
        })
      })
    } else {
      clog.error('wrong download url', rbody.url)
      res.json({
        rescode: -1,
        message: 'wrong download url ' + rbody.url
      })
    }
    break
  case 'stream':
    clog.notify(clientip, 'stream from', rbody.url)
    if (rbody.url && rbody.url.startsWith('http')) {
      stream(rbody.url, req.headers).then(response=>{
        res.status(response.status)
        res.set(response.headers)

        response.data.pipe(res)
      }).catch(e=>{
        res.json({
          rescode: -1,
          message: e
        })
      })
    } else {
      clog.error('wrong stream url', rbody.url)
      res.json({
        rescode: -1,
        message: 'wrong stream url ' + rbody.url
      })
    }
    break
  case 'exec':
  case 'shell':
    clog.notify(clientip, 'exec shell command', rbody.command, 'from webhook')
    if (rbody.command && sType(rbody.command) === 'string') {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      let command = decodeURI(rbody.command)
      let option  = {
        timeout: 5000, from: 'webhook',
        cb(data, error, finish) {
          if (finish) {
            res.end('\ncommand: ' + command + ' finished')
          } else if (error) {
            clog.error(error)
            res.write(error)
          } else {
            res.write(data)
          }
        }
      }
      if (rbody.cwd !== undefined) {
        option.cwd = rbody.cwd
      }
      if (rbody.timeout !== undefined) {
        option.timeout = Number(rbody.timeout)
      }
      exec(command, option)
    } else {
      res.json({
        rescode: -1,
        message: 'parameter command is expect'
      })
    }
    break
  case 'info':
    let elecV2PInfo = {
      elecV2P: {
        version: CONFIG_Port.version,
        start: now(CONFIG_Port.start, false, 0),
        uptime: ((Date.now() - CONFIG_Port.start)/1000/60/60).toFixed(2) + ' hours',
        clients: wsSer.recver.size,
        taskStatus: taskMa.status(),
        memoryUsage: nStatus(),
      },
      system: {
        arch: os.arch(),
        platform: os.platform(),
        version: os.version(),
        homedir: os.homedir(),
        freememory: kSize(os.freemem()),
        totalmemory: kSize(os.totalmem()),
        hostname: os.hostname(),
      },
      client: {
        ip: clientip,
        url: req.url,
        method: req.method,
        protocol: req.protocol,
        hostname: req.hostname,
        body: rbody,
        'user-agent': req.headers['user-agent'],
      }
    }

    if (req.headers['x-forwarded-for']) {
      elecV2PInfo.client['x-forwarded-for'] = req.headers['x-forwarded-for']
    }

    if (rbody.debug) {
      elecV2PInfo.elecV2P.validateStatus = {
        ...validate_status,
        black: sJson(validate_status.black),
        cookieset: sJson(validate_status.cookieset),
      }
      elecV2PInfo.elecV2P.webhooktoken = CONFIG.wbrtoken

      elecV2PInfo.system.userInfo = os.userInfo()
      elecV2PInfo.system.uptime = (os.uptime()/60/60).toFixed(2) + ' hours'
      elecV2PInfo.system.loadavg = os.loadavg()
      elecV2PInfo.system.cpus = os.cpus()
      elecV2PInfo.system.networkInterfaces = os.networkInterfaces()

      elecV2PInfo.client.ips = req.ips
      elecV2PInfo.client.headers = req.headers
    }
    res.json(elecV2PInfo)
    break
  case 'update':
  case 'newversion':
  case 'checkupdate':
    checkupdate(Boolean(rbody.force)).then(body=>{
      res.json(body)
    })
    break
  case 'store':
    if (rbody.op === 'all') {
      return res.json({
        rescode: 0,
        message: 'Get store/cookie list',
        resdata: store.all()
      });
    }
    if (!rbody.key) {
      clog.error('parameter key is expect on webhook store opration')
      return res.json({
        rescode: -1,
        message: 'parameter key is expect'
      })
    }
    switch(rbody.op) {
    case 'put':
      clog.info('put store key', rbody.key, 'from webhook')
      if (store.put(rbody.value, rbody.key, rbody.options)) {
        clog.debug(`save ${ rbody.key } value: `, rbody.value, 'from webhook')
        res.json({
          rescode: 0,
          message: rbody.key + ' saved'
        })
      } else {
        res.json({
          rescode: -1,
          message: rbody.key + ' fail to save. maybe data length is over limit'
        })
      }
      break
    case 'delete':
      clog.info('delete store key', rbody.key, 'from webhook')
      if (store.delete(rbody.key)) {
        clog.notify(rbody.key, 'delete')
        res.json({
          rescode: 0,
          message: rbody.key + ' delete'
        })
      } else {
        clog.error('delete fail')
        res.json({
          rescode: -1,
          message: 'delete fail'
        })
      }
      break
    default:
      clog.info('Get store key', rbody.key, 'from webhook');
      let storeres = store.get(rbody.key)
      if (storeres !== undefined) {
        res.json({
          rescode: 0,
          message: 'Get store/cookie ' + rbody.key + ' value',
          resdata: storeres
        });
      } else {
        res.json({
          rescode: -1,
          message: rbody.key + ' not exist'
        })
      }
    }
    break
  case 'security':
    if (rbody.op !== 'put') {
      return res.json({
        rescode: 0,
        message: 'Get elecV2P SECURITY config',
        resdata: CONFIG.SECURITY
      });
    }
    let secMsg = ''
    if (rbody.enable !== undefined) {
      CONFIG.SECURITY.enable = sBool(rbody.enable)
      secMsg = `SECURITY enable: ${CONFIG.SECURITY.enable}\n`
    }
    if (rbody.blacklist !== undefined) {
      let secbltype = sType(rbody.blacklist)
      if (secbltype === 'array') {
        CONFIG.SECURITY.blacklist = rbody.blacklist
      } else if (secbltype === 'string') {
        CONFIG.SECURITY.blacklist = rbody.blacklist.split(/\r|\n|,/).filter(v=>v.trim())
      } else {
        return res.json({
          rescode: -1,
          message: 'blacklist type is wrong'
        })
      }
      secMsg += `SECURITY blacklist is updated\n`
    }
    if (rbody.whitelist !== undefined) {
      let secwltype = sType(rbody.whitelist)
      if (secwltype === 'array') {
        CONFIG.SECURITY.whitelist = rbody.whitelist
      } else if (secwltype === 'string') {
        CONFIG.SECURITY.whitelist = rbody.whitelist.split(/\r|\n|,/).filter(v=>v.trim())
      } else {
        return res.json({
          rescode: -1,
          message: 'whitelist type is wrong'
        })
      }
      secMsg += `SECURITY whitelist is updated`
    }
    if (rbody.webhook_only !== undefined) {
      CONFIG.SECURITY.webhook_only = sBool(rbody.webhook_only)
      secMsg = `SECURITY webhook_only: ${CONFIG.SECURITY.webhook_only}\n`
    }
    if (secMsg) {
      list.put('config.json', CONFIG)
    }
    res.json({
      rescode: 0,
      message: secMsg.trim() || 'SECURITY config not changed',
      resdata: CONFIG.SECURITY
    })
    break
  case 'proxyport':
    wsSer.recv.eproxy(rbody.op === 'open' ? 'start' : 'close')
    res.json({
      rescode: 0,
      message: `proxy port ${CONFIG.anyproxy.port} is ${rbody.op === 'open' ? 'open' : 'close'}`
    })
    break
  case 'blackreset':
    validate_status.black.clear();
    validate_status.blacknum = 0;
    res.json({
      rescode: 0,
      message: 'validate black status is reset'
    });
    break
  case 'newcrt':
    if (rbody.hostname) {
      crtHost(rbody.hostname).then(cont=>{
        res.json({
          rescode: 0,
          message: 'success generate certificate for ' + rbody.hostname,
          resdata: cont
        })
      }).catch(error=>{
        res.json({
          rescode: -1,
          message: error
        })
      })
    } else {
      clog.info('parameter hostname is expect for new crt');
      res.json({
        rescode: -1,
        message: 'parameter hostname is expect'
      })
    }
    break
  case 'eapp':
    if (rbody.op === 'put') {
      if (rbody.enable !== undefined) {
        CONFIG.eapp.enable = sBool(rbody.enable)
      }
      if (rbody.logo_type) {
        CONFIG.eapp.logo_type = Number(rbody.logo_type)
      }
      if (sType(rbody.apps) === 'array') {
        CONFIG.eapp.apps.push(...rbody.apps.filter(app=>app && app.name && app.type && app.target))
      }
      res.json({
        rescode: 0,
        message: 'config eapp update',
        resdata: CONFIG.eapp,
      })
      list.put('config.json', CONFIG)
      return
    }
    return res.json({
      rescode: 0,
      message: 'get config eapp',
      resdata: CONFIG.eapp,
    })
  case 'devdebug':
    // temp debug, 待完成 unfinished
    switch(rbody.get){
    case 'rule':
      res.send(rbody.key ? CONFIG_RULE[rbody.key] : CONFIG_RULE)
      break
    case 'rulecache':
      res.send(sString(rbody.key ? CONFIG_RULE.cache[rbody.key] : CONFIG_RULE.cache.host))
      break
    case 'wsclient':
      res.json({
        rescode: 0,
        message: 'get websocket clients information',
        resdata: sJson(wsSer.recver)
      })
      break
    case 'wsrecverlist':
      res.json({
        rescode: 0,
        message: 'get client recverlists',
        resdata: sJson(wsSer.recverlists)
      })
      break
    case 'config':
      res.json({
        rescode: 0,
        message: 'Get current config',
        resdata: CONFIG
      });
      break
    case 'minishell':
      if (rbody.op === 'open') {
        CONFIG.minishell = true
      } else if (rbody.op === 'close') {
        CONFIG.minishell = false
      }
      res.json({
        rescode: 0,
        message: `current minishell is ${CONFIG.minishell ? 'opened' : 'closed'}`,
        resdata: CONFIG.minishell
      });
      break
    default:
      res.json({
        rescode: 0,
        message: 'dev debug'
      })
    }
    break
  case 'help':
    // 待完成 unfinished
    return res.json({
      rescode: 0,
      message: 'elecV2P webhook help',
      resdata: {
      url: 'https://github.com/elecV2/elecV2P-dei/tree/master/docs/09-webhook.md',
      api: [
        {
          type: 'status',
          note: 'Get elecV2P memoryUsage status and so on',
          para: null
        },
        {
          type: 'jslist',
          note: 'Get elecV2P local js file lists',
          para: null
        },
        {
          type: 'runjs',
          note: 'run a script',
          para: [
            {
              name: 'fn',
              note: 'script file name or a http url of the script',
              need: 'required'
            },
            {
              name: 'rawcode',
              note: 'this raw script code to run.(if fn is missing, the rawcode is required)',
              need: 'optional'
            },
            {
              name: 'rename',
              note: 'rename the script file or code',
              need: 'optional'
            },
            {
              name: 'env',
              note: 'the extra environment variable when run this script',
              need: 'optional'
            }
          ]
        }
      ]}
    })
    break
  default:
    if (CONFIG.webhook?.script && CONFIG.webhook.script.enable) {
      const { token, ...payload } = rbody
      return runJSFile(CONFIG.webhook.script.target, { from: 'webhook', env: { payload } }).then(data=>{
        res.json({
          rescode: 0,
          message: 'success run webhook script ' + CONFIG.webhook.script.target,
          resdata: data
        })
      }).catch(error=>{
        res.json({
          rescode: -1,
          message: 'fail to run webhook script ' + CONFIG.webhook.script.target,
          resdata: error
        })
      });
    }
    return res.json({
      rescode: -1,
      message: 'webhook type ' + rbody.type + ' not support yet'
    })
  }
}

module.exports = app => {
  app.get("/webhook", handler)
  app.put("/webhook", handler)
  app.post("/webhook", handler)
}