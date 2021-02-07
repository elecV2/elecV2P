const { Task, TASKS_WORKER, TASKS_INFO, jobFunc, exec } = require('../func')
const { runJSFile, JSLISTS } = require('../script')

const { logger, LOGFILE, nStatus, euid, sJson, sString, sType, file, list, downloadfile, now } = require('../utils')
const clog = new logger({ head: 'wbhook', level: 'debug' })

const { CONFIG } = require('../config')

function handler(req, res){
  const rbody = req.method === 'GET' ? req.query : req.body
  res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
  if (!CONFIG.wbrtoken) {
    res.end('no webhook token is set.')
    return
  }
  if (rbody.token !== CONFIG.wbrtoken) {
    res.end('token is illegal.')
    return
  }
  const clientip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  clog.notify(clientip, "run webhook type", rbody.type)
  switch(rbody.type) {
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
        if (JSLISTS.indexOf(rbody.rename) === -1) JSLISTS.push(rbody.rename)
      }
      if (rbody.env) {
        const senv = sJson(rbody.env, true)
        for (let env in senv) {
          addContext[env.startsWith('$') ? env : ('$' + env)] = senv[env]
        }
      }
      runJSFile(fn, { ...addContext }).then(data=>{
        if (data) res.write(sString(data))
        else res.write(showfn + ' don\'t return any value')
      }).catch(error=>{
        res.write('error: ' + error)
      }).finally(()=>{
        res.end(`\n\nconsole log file: ${req.protocol}://${req.get('host')}/logs/${showfn.split('/').join('-')}.log\n\n${LOGFILE.get(showfn+'.log') || ''}`)
      })
    }
    break
  case 'deletelog':
    const name = rbody.fn
    clog.info(clientip, 'delete log', name)
    if (LOGFILE.delete(name)) {
      res.end(name + ' success deleted!')
    } else {
      res.end(name + ' log file don\'t exist')
    }
    break
  case 'getlog':
    clog.info(clientip, 'get log', rbody.fn)
    const logcont = LOGFILE.get(rbody.fn)
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
    const status = nStatus()
    status.start = now(CONFIG.start, false)
    status.version = CONFIG.version
    res.end(JSON.stringify(status))
    break
  case 'taskinfo':
    clog.info(clientip, 'get taskinfo', rbody.tid)
    if (rbody.tid === 'all') {
      let status = {
        total: 0,
        running: 0
      }
      for (let tid in TASKS_INFO) {
        status.total++
        if (TASKS_INFO[tid].running) status.running++
        res.write(tid + ', ' + TASKS_INFO[tid].name + ', ' + TASKS_INFO[tid].time + ', ' + TASKS_INFO[tid].running + '\n')
      }
      res.end(status.running + '/' + status.total)
    } else {
      if (TASKS_INFO[rbody.tid]) {
        res.end(JSON.stringify(TASKS_INFO[rbody.tid], null, 2))
        return
      }
      res.end(JSON.stringify({ error: 'no task' + rbody.tid }))
    }
    break
  case 'taskstart':
    clog.notify(clientip, 'start task')
    if (TASKS_INFO[rbody.tid] && TASKS_WORKER[rbody.tid]) {
      if (TASKS_INFO[rbody.tid].running === false) {
        TASKS_WORKER[rbody.tid].start()
        res.end(TASKS_INFO[rbody.tid].name + ' 开始运行，任务内容： ' + JSON.stringify(TASKS_INFO[rbody.tid]))
      } else {
        res.end(TASKS_INFO[rbody.tid].name + ' 任务正在运行中，任务内容： ' + JSON.stringify(TASKS_INFO[rbody.tid]))
      }
      return
    }
    res.end(rbody.tid + ' 任务不存在')
    break
  case 'taskstop':
    clog.notify(clientip, 'stop task', rbody.tid)
    if (rbody.tid && TASKS_INFO[rbody.tid] && TASKS_WORKER[rbody.tid]) {
      if (TASKS_INFO[rbody.tid].running === true) {
        TASKS_WORKER[rbody.tid].stop()
        res.end('停止任务 ' + TASKS_INFO[rbody.tid].name + '，任务内容： ' + JSON.stringify(TASKS_INFO[rbody.tid]))
      } else {
        res.end(TASKS_INFO[rbody.tid].name  + ' 任务已停止，任务内容： ' + JSON.stringify(TASKS_INFO[rbody.tid]))
      }
      return
    }
    res.end(rbody.tid + ' 任务不存在')
    break
  case 'taskadd':
    clog.notify(clientip, 'add a new task')
    if (rbody.task && sType(rbody.task) === 'object') {
      const newtid = euid()
      TASKS_INFO[newtid] = rbody.task
      TASKS_INFO[newtid].id = newtid
      TASKS_WORKER[newtid] = new Task(TASKS_INFO[newtid], jobFunc(TASKS_INFO[newtid].job))
      res.end('success add task: ' + TASKS_INFO[newtid].name)
      if (rbody.task.running) TASKS_WORKER[newtid].start()
      return
    }
    res.end('a task object is expected!')
    break
  case 'tasksave':
    clog.notify(clientip, 'save current task list.')
    if (list.put('task.list', TASKS_INFO)) res.end('success save current task list!\n' + Object.keys(TASKS_INFO).length)
    else res.end('fail to save current task list.')
    break
  case 'taskdel':
  case 'taskdelete':
    clog.notify(clientip, 'delete task', rbody.tid)
    if (rbody.tid && TASKS_INFO[rbody.tid] && TASKS_WORKER[rbody.tid]) {
      TASKS_WORKER[rbody.tid].delete()
      delete TASKS_INFO[rbody.tid]
      res.end("task deleted!")
    } else {
      res.end('no such task', rbody.tid)
    }
    break
  case 'efssdelete':
    clog.notify(clientip, 'delete efss file')
    let filename = rbody.fn || rbody.filename
    if (filename) {
      filename = decodeURI(filename)
      if (file.delete(filename, file.get(CONFIG.efss, 'path'))) res.end(filename + ' is deleted!')
      else res.end(filename + ' not existed.')
    } else {
      clog.info('a name of file(parameter fn) is expected.')
      res.end('a name of file(parameter fn) is expected.')
    }
    break
  case 'download':
  case 'downloadfile':
    clog.notify(clientip, 'ready download file to efss')
    if (rbody.url && rbody.url.startsWith('http')) {
      downloadfile(rbody.url).then(dest=>{
        clog.info(rbody.url, 'download to', dest)
        res.end('success download ' + rbody.url + ' to efss')
      }).catch(e=>{
        clog.error(rbody.url, e)
        res.end('fail to download ' + rbody.url + 'error: ' + e)
      })
    } else {
      res.end('wrong download url.')
    }
    break
  case 'exec':
  case 'shell':
    clog.notify(clientip, 'exec shell command', rbody.command)
    if (rbody.command) {
      let command = decodeURI(rbody.command)
      exec(command, {
        call: true,
        cb(data, error, finish) {
          error ? clog.error(error) : clog.info(data)
          if (finish) res.end(command + ' finished.')
          else res.write(error || data)
        }
      })
    } else {
      res.end('command parameter is expected.')
    }
    break
  default:
    res.end('wrong webhook type' + rbody.type)
  }
}

module.exports = app => {
  app.get("/webhook", handler)
  app.put("/webhook", handler)
  app.post("/webhook", handler)
}