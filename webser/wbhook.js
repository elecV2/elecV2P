const os = require('os')
const { taskMa, exec } = require('../func')
const { CONFIG_RULE, runJSFile, JSLISTS } = require('../script')

const { logger, LOGFILE, Jsfile, nStatus, sJson, sString, sType, stream, downloadfile, now, checkupdate, store, kSize, errStack } = require('../utils')
const clog = new logger({ head: 'webhook', level: 'debug' })

const { CONFIG } = require('../config')

function handler(req, res){
  const rbody = req.method === 'GET' ? req.query : req.body
  res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
  if (!CONFIG.wbrtoken) {
    res.end('webhook token not set yet')
    return
  }
  if (rbody.token !== CONFIG.wbrtoken) {
    res.end('token is illegal')
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
      clog.info('can\'t find any javascript code to run', fn)
      res.end('can\'t find any javascript code to run ' + fn)
    } else {
      const addContext = {
        type: 'webhook'
      }
      let showfn = /^https?:/.test(fn) ? fn.split('/').pop() : fn
      if (rbody.rawcode) {
        addContext.type = 'rawcode'
        addContext.from = 'webhook'
        fn = rbody.rawcode
        showfn = 'rawcode.js'
      }
      if (rbody.rename) {
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
      runJSFile(fn, { ...addContext }).then(data=>{
        if (data) {
          res.write(sString(data))
        } else {
          res.write(showfn + ' don\'t return any value')
        }
      }).catch(error=>{
        res.write('error: ' + error)
      }).finally(()=>{
        res.end(`\n\nconsole log file: ${req.protocol}://${req.get('host')}/logs/${showfn.split('/').join('-')}.log\n\n${LOGFILE.get(showfn+'.log') || ''}`)
      })
    }
    break
  case 'deljs':
  case 'deletejs':
    let jsfn = rbody.fn
    clog.info(clientip, 'delete javascript file', jsfn)
    if (Jsfile.delete(jsfn)) {
      JSLISTS.splice(JSLISTS.indexOf(jsfn), 1)
      res.end(jsfn + ' success deleted')
    } else {
      res.end(jsfn + ' javascript file don\'t exist')
    }
    break
  case 'logdelete':
  case 'deletelog':
    let name = rbody.fn
    clog.info(clientip, 'delete log', name)
    if (LOGFILE.delete(name)) {
      res.end(name + ' success deleted')
    } else {
      res.end(name + ' log file don\'t exist')
    }
    break
  case 'logget':
  case 'getlog':
    if (!rbody.fn) {
      res.end('parameter fn is expect')
      return
    }
    clog.info(clientip, 'get log', rbody.fn)
    let logcont = LOGFILE.get(rbody.fn)
    if (logcont) {
      if (sType(logcont) === 'array') {
        res.end(JSON.stringify(logcont))
      } else {
        res.end(logcont)
      }
    } else {
      res.end(rbody.fn + ' log file don\'t exist')
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
    clog.notify(clientip, 'ready download file to efss')
    if (rbody.url && rbody.url.startsWith('http')) {
      downloadfile(rbody.url).then(dest=>{
        clog.info(rbody.url, 'download to', dest)
        res.end('success download ' + rbody.url + ' to efss')
      }).catch(e=>{
        clog.error('download', rbody.url, 'error', e)
        res.end('fail to download ' + rbody.url + 'error: ' + e)
      })
    } else {
      clog.error('wrong download url', rbody.url)
      res.end('wrong download url')
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
            res.end('\ncommand: ' + command + ' finished.')
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
      res.end('command parameter is expected.')
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
  case 'devdebug':
    // temp debug
    if (rbody.get === 'rule') {
      res.end(JSON.stringify(CONFIG_RULE))
    }
    res.end('dev debug')
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
    res.end('wrong webhook type ' + rbody.type)
  }
}

module.exports = app => {
  app.get("/webhook", handler)
  app.put("/webhook", handler)
  app.post("/webhook", handler)
}