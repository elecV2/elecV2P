const { Task, TASKS_WORKER, TASKS_INFO, jobFunc } = require('../func')
const { runJSFile, JSLISTS } = require('../script')

const { logger, LOGFILE, nStatus, euid, sJson, sString, sType, file, list } = require('../utils')
const clog = new logger({ head: 'wbhook', level: 'debug' })

const { CONFIG } = require('../config')

function handler(req, res){
  const rbody = req.method === 'GET' ? req.query : req.body
  clog.debug(rbody)
  res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
  if (!CONFIG.wbrtoken) {
    res.end('no webhook token is set.')
    return
  }
  if (rbody.token !== CONFIG.wbrtoken) {
    res.end('token is illegal')
    return
  }
  const clientip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  clog.notify(clientip, "webhook:", rbody.type)
  if (rbody.type === 'runjs') {
    let fn = rbody.fn || ''
    if (!rbody.rawcode && !/^https?:/.test(fn) && JSLISTS.indexOf(fn) === -1) {
      clog.info('can\'t find js file', fn)
      res.end('no such js file ' + fn)
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
      }
      if (rbody.env) {
        const senv = sJson(rbody.env, true)
        for (let env in senv) {
          addContext[env.startsWith('$') ? env : ('$' + env)] = senv[env]
        }
      }
      const jsres = runJSFile(fn, { ...addContext })
      const fullu = req.protocol + '://' + req.get('host')
      if (sType(jsres) === 'promise') {
        jsres.then(data=>{
          if (data) res.write(sString(data))
          else res.write(showfn + ' don\'t return any value')
        }).catch(error=>{
          res.write('error: ' + error)
        }).finally(()=>{
          res.end(`\n\nconsole log file: ${fullu}/logs/${showfn.split('/').join('-')}.log\n\n${LOGFILE.get(showfn+'.log')}`)
        })
      } else {
        if(jsres) res.write(sString(jsres))
        else res.write(showfn + ' don\'t return any value')
        res.end(`\n\nconsole log file: ${fullu}/logs/${showfn.split('/').join('-')}.log\n\n${LOGFILE.get(showfn+'.log')}`)
      }
    }
  } else if (rbody.type === 'deletelog') {
    const name = rbody.fn
    if (LOGFILE.delete(name)) {
      res.end(name + ' success deleted!')
    } else {
      res.end(name + ' log file don\'t exist')
    }
  } else if (rbody.type === 'status') {
    clog.info(clientip, 'get sever status')
    res.end(JSON.stringify(nStatus()))
  } else if (rbody.type === 'taskinfo') {
    const tid = rbody.tid
    clog.info(clientip, 'get taskinfo', tid)
    if (tid === 'all') {
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
      if (TASKS_INFO[tid]) {
        res.end(JSON.stringify(TASKS_INFO[tid], null, 2))
        return
      }
      res.end(JSON.stringify({ error: 'no task' + tid }))
    } 
  } else if (rbody.type === 'taskstart') {
    clog.notify(clientip, 'start task')
    const tid = rbody.tid
    if (TASKS_INFO[tid] && TASKS_WORKER[tid]) {
      if (TASKS_INFO[tid].running === false) {
        TASKS_WORKER[tid].start()
        res.end(TASKS_INFO[tid].name + ' 开始运行，任务内容： ' + JSON.stringify(TASKS_INFO[tid]))
      } else {
        res.end(TASKS_INFO[tid].name + ' 任务正在运行中，任务内容： ' + JSON.stringify(TASKS_INFO[tid]))
      }
      return
    }
    res.end(tid + ' 任务不存在')
  } else if (rbody.type === 'taskstop') {
    clog.notify(clientip, 'stop task')
    const tid = rbody.tid 
    if (TASKS_INFO[tid] && TASKS_WORKER[tid]) {
      if (TASKS_INFO[tid].running === true) {
        TASKS_WORKER[tid].stop()
        res.end('停止任务 ' + TASKS_INFO[tid].name + '，任务内容： ' + JSON.stringify(TASKS_INFO[tid]))
      } else {
        res.end(TASKS_INFO[tid].name  + ' 任务已停止，任务内容： ' + JSON.stringify(TASKS_INFO[tid]))
      }
      return
    }
    res.end(rbody.tid + ' 任务不存在')
  } else if (rbody.type === 'taskadd') {
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
  } else if (rbody.type === 'tasksave') {
    clog.notify(clientip, 'save current task list.')
    if (list.put('task.list', TASKS_INFO)) res.end('success save current task list!\n' + Object.keys(TASKS_INFO).length)
    else res.end('fail to save current task list.')
  } else if (rbody.type === 'efssdelete') {
    clog.notify(clientip, 'delete efss file')
    let filename = rbody.fn || rbody.filename
    if (filename) {
      filename = decodeURI(filename)
      file.delete(filename, file.get(CONFIG.efss, 'path'))
      res.end(filename + ' is deleted!')
    } else {
      clog.info('a name of file(parameter fn) is expected.')
      res.end('a name of file(parameter fn) is expected.')
    }
  } else {
    res.end('wrong webhook type')
  }
}

module.exports = app => {
  app.get("/webhook", handler)
  app.put("/webhook", handler)
  app.post("/webhook", handler)
}