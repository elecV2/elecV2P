const os = require('os')
const { taskMa, exec } = require('../func')
const { CONFIG_RULE, runJSFile, JSLISTS } = require('../script')

const { logger, LOGFILE, Jsfile, list, nStatus, sJson, sString, sType, surlName, sBool, stream, downloadfile, now, checkupdate, store, kSize, errStack } = require('../utils')
const clog = new logger({ head: 'webhook', level: 'debug' })

const { CONFIG } = require('../config')

function handler(req, res){
  const rbody = req.method === 'GET' ? req.query : req.body
  res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
  if (!CONFIG.wbrtoken) {
    res.end(JSON.stringify({
      rescode: -1,
      message: 'webhook token not set yet'
    }))
    return
  }
  if (rbody.token !== CONFIG.wbrtoken) {
    res.end(JSON.stringify({
      rescode: -1,
      message: 'token is illegal'
    }))
    return
  }
  const clientip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  clog.notify(clientip, "run webhook type", rbody.type)
  switch(rbody.type) {
  case 'jslist':
    res.end(JSON.stringify(JSLISTS))
    break
  case 'jsrun':
  case 'runjs':
    let fn = rbody.fn || ''
    if (!rbody.rawcode && !fn) {
      clog.info('can\'t find any javascript code to run')
      res.end(JSON.stringify({
        rescode: -1,
        message: 'can\'t find any javascript code to run'
      }))
    } else {
      const addContext = {
        type: 'webhook'
      }
      let showfn = surlName(fn)
      if (rbody.rawcode) {
        addContext.type = 'rawcode'
        fn = rbody.rawcode
        showfn = 'rawcode.js'
      }
      if (rbody.rename) {
        if (!/\.js$/i.test(rbody.rename)) {
          rbody.rename += '.js'
        }
        addContext.rename = rbody.rename
        showfn = rbody.rename
        if (JSLISTS.indexOf(rbody.rename) === -1) {
          JSLISTS.push(rbody.rename)
        }
      }
      if (rbody.env) {
        const senv = sJson(rbody.env, true)
        for (let env in senv) {
          addContext[env.startsWith('$') ? env : ('$' + env)] = senv[env]
        }
      }
      addContext.from = 'webhook'
      addContext.timeout = 5000
      runJSFile(fn, addContext).then(data=>{
        if (data) {
          res.write(sString(data))
        } else {
          res.write(showfn + ' don\'t return any value')
        }
      }).catch(error=>{
        res.write('error: ' + error)
      }).finally(()=>{
        res.write(`\n\nconsole log file: ${req.protocol}://${req.get('host')}/logs/${showfn.replace(/\/|\\/g, '-')}.log\n\n`)
        let oldlog = LOGFILE.get(showfn+'.log')
        if (oldlog) {
          oldlog.pipe(res)
        }
      })
    }
    break
  case 'deljs':
  case 'jsdel':
  case 'deletejs':
  case 'jsdelete':
    let jsfn = rbody.fn
    clog.info(clientip, 'delete javascript file', jsfn)
    if (Jsfile.delete(jsfn)) {
      res.end(JSON.stringify({
        rescode: 0,
        message: jsfn + ' success deleted'
      }))
      JSLISTS.splice(JSLISTS.indexOf(jsfn), 1)
    } else {
      res.end(JSON.stringify({
        rescode: -1,
        message: jsfn + ' javascript file don\'t exist'
      }))
    }
    break
  case 'jsfile':
    if (!rbody.fn) {
      res.end(JSON.stringify({
        rescode: -1,
        message: 'a parameter fn is expect'
      }))
      return
    }
    switch (rbody.op) {
    case 'put':
      if (!rbody.rawcode) {
        res.end(JSON.stringify({
          rescode: -1,
          message: 'a parameter rawcode is expect'
        }))
        return
      }
      if (Jsfile.put(rbody.fn, rbody.rawcode)) {
        res.end(JSON.stringify({
          rescode: 0,
          message: 'success save ' + rbody.fn
        }))
      } else {
        res.end(JSON.stringify({
          rescode: -1,
          message: 'fail to save ' + rbody.fn
        }))
      }
      break
    case 'get':
    default:
      let jsfilecont = Jsfile.get(rbody.fn)
      if (jsfilecont) {
        res.end(jsfilecont)
      } else {
        res.end(JSON.stringify({
          rescode: -1,
          message: rbody.fn + ' not exist'
        }))
      }
    }
    break
  case 'logdelete':
  case 'deletelog':
    let name = rbody.fn
    clog.info(clientip, 'delete log', name)
    if (LOGFILE.delete(name)) {
      res.end(JSON.stringify({
        rescode: 0,
        message: name + ' success deleted'
      }))
    } else {
      res.end(JSON.stringify({
        rescode: 404,
        message: name + ' log file don\'t exist'
      }))
    }
    break
  case 'logget':
  case 'getlog':
    if (!rbody.fn) {
      res.end(JSON.stringify({
        rescode: -1,
        message: 'parameter fn is expect'
      }))
      return
    }
    clog.info(clientip, 'get log', rbody.fn)
    let logcont = LOGFILE.get(rbody.fn)
    if (logcont) {
      if (sType(logcont) === 'array') {
        res.end(JSON.stringify(logcont))
      } else {
        logcont.pipe(res)
      }
    } else {
      res.end(JSON.stringify({
        rescode: 404,
        message: rbody.fn + ' log file don\'t exist'
      }))
    }
    break
  case 'status':
    clog.info(clientip, 'get server status')
    let status = nStatus()
    status.start = now(CONFIG.start, false)
    status.uptime = ((Date.now() - Date.parse(status.start))/1000/60/60).toFixed(2) + ' hours'
    status.version = CONFIG.version
    res.end(JSON.stringify(status))
    break
  case 'task':
    clog.info(clientip, 'get all task')
    res.end(JSON.stringify(taskMa.info(), null, 2))
    break
  case 'taskinfo':
    clog.info(clientip, 'get taskinfo', rbody.tid)
    if (rbody.tid === 'all') {
      let status = taskMa.status()
      status.info = taskMa.info()
      res.end(JSON.stringify(status, null, 2))
    } else {
      if (taskMa.info(rbody.tid)) {
        res.end(JSON.stringify(taskMa.info(rbody.tid), null, 2))
        return
      }
      res.end(JSON.stringify({ error: 'no such task with taskid: ' + rbody.tid }))
    }
    break
  case 'taskstart':
    clog.notify(clientip, 'start task', rbody.tid)
    res.end(JSON.stringify(taskMa.start(rbody.tid)))
    break
  case 'taskstop':
    clog.notify(clientip, 'stop task', rbody.tid)
    res.end(JSON.stringify(taskMa.stop(rbody.tid)))
    break
  case 'taskadd':
    clog.notify(clientip, 'add a new task')
    res.end(JSON.stringify(taskMa.add(rbody.task)))
    break
  case 'tasksave':
    clog.notify(clientip, 'save current task list.')
    res.end(JSON.stringify(taskMa.save()))
    break
  case 'taskdel':
  case 'taskdelete':
    clog.notify(clientip, 'delete task', rbody.tid)
    res.end(JSON.stringify(taskMa.delete(rbody.tid)))
    break
  case 'download':
  case 'downloadfile':
    clog.notify(clientip, 'start download file to', rbody.folder || 'efss')
    if (rbody.url && /^https?:\/\/\S{4,}/.test(rbody.url)) {
      downloadfile(rbody.url, { folder: rbody.folder, name: rbody.name }).then(dest=>{
        clog.info(rbody.url, 'download to', dest)
        res.end(JSON.stringify({
          rescode: 0,
          message: 'success download ' + rbody.url + ' to ' + dest
        }))
      }).catch(e=>{
        clog.error('download', rbody.url, 'error', e)
        res.end(JSON.stringify({
          rescode: -1,
          message: 'fail to download ' + rbody.url + ' error: ' + e
        }))
      })
    } else {
      clog.error('wrong download url', rbody.url)
      res.end(JSON.stringify({
        rescode: -1,
        message: 'wrong download url ' + rbody.url
      }))
    }
    break
  case 'stream':
    clog.notify(clientip, 'stream from', rbody.url)
    if (rbody.url && rbody.url.startsWith('http')) {
      stream(rbody.url).then(response=>{
        response.pipe(res)
      }).catch(e=>{
        res.end(JSON.stringify({
          rescode: -1,
          message: e
        }))
      })
    } else {
      clog.error('wrong stream url', rbody.url)
      res.end(JSON.stringify({
        rescode: -1,
        message: 'wrong stream url ' + req.query.url
      }))
    }
    break
  case 'exec':
  case 'shell':
    clog.notify(clientip, 'exec shell command from webhook', rbody.command)
    if (rbody.command) {
      let command = decodeURI(rbody.command)
      let option  = {
        call: true, timeout: 5000,
        cb(data, error, finish) {
          error ? clog.error(error) : clog.info(data)
          if (finish) {
            res.end('\ncommand: ' + command + ' finished')
          } else {
            res.write(error || data)
          }
        }
      }
      if (rbody.timeout !== undefined) {
        option.timeout = Number(rbody.timeout)
      }
      if (rbody.cwd !== undefined) {
        option.cwd = rbody.cwd
      }
      exec(command, option)
    } else {
      res.end(JSON.stringify({
        rescode: -1,
        message: 'command parameter is expected'
      }))
    }
    break
  case 'info':
    let elecV2PInfo = {
      elecV2P: {
        version: CONFIG.version,
        start: now(CONFIG.start, false),
        uptime: ((Date.now() - CONFIG.start)/1000/60/60).toFixed(2) + ' hours',
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
        query: req.query,
        'user-agent': req.headers['user-agent'],
      }
    }
    if (req.body !== undefined) {
      elecV2PInfo.client.body = req.body
    }
    if (req.headers['x-forwarded-for']) {
      elecV2PInfo.client['x-forwarded-for'] = req.headers['x-forwarded-for']
    }

    if (rbody.debug) {
      elecV2PInfo.elecV2P.webhooktoken = CONFIG.wbrtoken
      elecV2PInfo.elecV2P.JSLISTSlen = JSLISTS.length

      elecV2PInfo.system.userInfo = os.userInfo()
      elecV2PInfo.system.uptime = (os.uptime()/60/60).toFixed(2) + ' hours'
      elecV2PInfo.system.loadavg = os.loadavg()
      elecV2PInfo.system.cpus = os.cpus()
      elecV2PInfo.system.networkInterfaces = os.networkInterfaces()

      elecV2PInfo.client.ips = req.ips
      elecV2PInfo.client.headers = req.headers
    }
    res.end(JSON.stringify(elecV2PInfo, null, 2))
    break
  case 'update':
  case 'newversion':
  case 'checkupdate':
    checkupdate(Boolean(rbody.force)).then(body=>{
      res.end(JSON.stringify(body, null, 2))
    })
    break
  case 'store':
    if (rbody.op === 'all') {
      res.end(JSON.stringify(store.all()))
      return
    }
    if (!rbody.key) {
      clog.error('a key is expect on webhook store opration')
      res.end(JSON.stringify({
        rescode: -1,
        message: 'a key is expect on webhook store opration'
      }))
      return
    }
    switch(rbody.op) {
    case 'put':
      clog.info('put store key', rbody.key, 'from webhook')
      if (store.put(rbody.value, rbody.key, rbody.options)) {
        clog.debug(`save ${ rbody.key } value: `, rbody.value, 'from webhook')
        res.end(JSON.stringify({
          rescode: 0,
          message: rbody.key + ' saved'
        }))
      } else {
        res.end(JSON.stringify({
          rescode: -1,
          message: rbody.key + ' fail to save. maybe data length is over limit'
        }))
      }
      break
    case 'delete':
      clog.info('delete store key', rbody.key, 'from webhook')
      if (store.delete(rbody.key)) {
        clog.notify(rbody.key, 'deleted')
        res.end(JSON.stringify({
          rescode: 0,
          message: rbody.key + ' deleted'
        }))
      } else {
        clog.error('delete fail')
        res.end(JSON.stringify({
          rescode: -1,
          message: 'delete fail'
        }))
      }
      break
    default:
      clog.info('get store key', rbody.key, 'from webhook')
      let storeres = store.get(rbody.key)
      if (storeres !== false) {
        res.end(sString(storeres))
      } else {
        res.end(JSON.stringify({
          rescode: -1,
          message: rbody.key + ' not exist'
        }))
      }
    }
    break
  case 'security':
    if (rbody.op !== 'put') {
      res.end(JSON.stringify(CONFIG.SECURITY))
      return
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
        res.end(JSON.stringify({
          rescode: -1,
          message: 'blacklist type is wrong'
        }))
        return
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
        res.end(JSON.stringify({
          rescode: -1,
          message: 'whitelist type is wrong'
        }))
        return
      }
      secMsg += `SECURITY whitelist is updated`
    }
    if (secMsg) {
      list.put('config.json', CONFIG)
    }
    res.end(JSON.stringify({
      rescode: 0,
      message: secMsg.trim() || 'SECURITY config not changed',
      SECURITY: CONFIG.SECURITY
    }))
    break
  case 'devdebug':
    // temp debug
    switch(rbody.get){
    case 'rule':
      res.end(JSON.stringify(CONFIG_RULE))
      break
    case 'config':
      res.end(JSON.stringify(CONFIG))
      break
    default:
      res.end('dev debug')
    }
    break
  case 'help':
    // 待完成 unfinished
    res.end(JSON.stringify({
      title: 'elecV2P webhook help',
      url: 'https://github.com/elecV2/elecV2P-dei/tree/master/docs/09-webhook.md',
      api: [
        {
          type: 'status',
          note: 'get elecV2P memoryUsage status and so on',
          para: null
        },
        {
          type: 'jslist',
          note: 'get elecV2P local js file lists',
          para: null
        },
        {
          type: 'runjs',
          note: 'run a javascript',
          para: [
            {
              name: 'fn',
              note: 'javascript file name or a http url of the javascript',
              need: 'required'
            },
            {
              name: 'rawcode',
              note: 'this raw javascript code to run.(if fn is missing, the rawcode is required)',
              need: 'optional'
            },
            {
              name: 'rename',
              note: 'rename the javascript file or code',
              need: 'optional'
            },
            {
              name: 'env',
              note: 'the extra environment variable when run this javascript',
              need: 'optional'
            }
          ]
        }
      ]
    }))
    break
  default:
    res.end(JSON.stringify({
      rescode: -1,
      message: 'wrong webhook type ' + rbody.type
    }))
  }
}

module.exports = app => {
  app.get("/webhook", handler)
  app.put("/webhook", handler)
  app.post("/webhook", handler)
}