const nodecron = require('node-cron')

const cron = require('./crontask.js')
const schedule = require('./schedule')
const { exec } = require('./exec')
const { runJSFile } = require('../script/runJSFile')

const { logger, feedAddItem, sType, sJson, list, file, wsSer, euid } = require('../utils')
const clog = new logger({ head: 'funcTask', cb: wsSer.send.func('tasklog'), file: 'funcTask' })

class Task {
  constructor(info){
    this.info = info
    this.job = jobFunc(info.job, info.name)
  }

  stat(){
    return Boolean(this.info.running)
  }

  start(){
    if (!bIsValid(this.info)) {
      return false
    }
    if (this.info.type === 'cron') {
      this.task = new cron(this.info, this.job)
      this.task.start()
      feedAddItem(`start crontask ${this.info.name}`, 'time: ' + this.info.time)
    } else if (this.info.type === 'schedule') {
      this.task = new schedule(this.info, this.job)
      this.task.start()
      feedAddItem(`start scheduletask ${this.info.name}`, 'time: ' + this.info.time)
    } else {
      clog.error('task type only support: cron/schedule')
    }
  }

  stop(flag = 'stopped'){
    if(this.task) {
      if (flag === 'stopped') {
        feedAddItem(this.info.name + ' stopped', 'time: ' + this.info.time)
      }
      this.task.stop(flag)
    }
  }

  delete(flag = 'delete'){
    if(this.task) {
      if (flag === 'delete') {
        feedAddItem(this.info.name + ' deleted', 'time: ' + this.info.time)
      }
      this.task.delete(flag)
    }
  }
}

const TASKS_INFO = {}             // 任务信息列表
const TASKS_WORKER = {}           // 执行任务列表

const taskInit = function() {
  // 初始化任务列表
  const tlist = sJson(list.get('task.list'))
  if (tlist) {
    Object.assign(TASKS_INFO, tlist)
  }

  if (Object.keys(TASKS_INFO).length) {
    clog.info('retrieve task from Lists/task.list')
  }
  for(let tid in TASKS_INFO) {
    if (TASKS_INFO[tid].type !== 'sub' && TASKS_INFO[tid].running) {
      TASKS_WORKER[tid] = new Task(TASKS_INFO[tid])
      TASKS_WORKER[tid].start()
    }
  }
}();

function bIsValid(info) {
  // 任务合法性检测
  if (!info) {
    clog.error('task information is expect')
    return false
  }
  if (info.name === undefined) {
    clog.error('no task name')
    return false
  }
  if (!/cron|schedule/.test(info.type)) {
    clog.error(info.name, 'unknow task type', info.type)
    return false
  }
  if (info.type === 'cron' && !nodecron.validate(info.time)) {
    clog.error(info.time, 'wrong cron time format')
    return false
  }
  let ftime = info.time.split(' ')
  if (info.type === 'schedule' && ftime.filter(t=>/^\d+$/.test(t)).length !== ftime.length ) {
    clog.error(info.time, 'wrong schedule time format')
    return false
  }
  if (!(info.job && info.job.type && info.job.target)) {
    clog.error('a task job is expect')
    return false
  }
  return true
}

function jobFunc(job, taskname) {
  // 任务信息转化为可执行函数
  if (!(job && job.target)) {
    clog.error('a job target is expect')
    return ()=>'a job target is expect'
  }
  if (job.type === 'runjs') {
    return ()=>runJSFile(job.target, { type: 'task', cb: wsSer.send.func('tasklog') })
  } else if (job.type === 'taskstart') {
    return ()=>{
      if (!TASKS_INFO[job.target]) {
        clog.error('task start another task error: job', job.target, 'not exist')
        return
      }
      if (!TASKS_WORKER[job.target]) {
        TASKS_WORKER[job.target] = new Task(TASKS_INFO[job.target])
      }
      TASKS_WORKER[job.target].start()
      wsSer.send({ type: 'task', data: {tid: job.target, op: 'start'} })
    }
  } else if (job.type === 'taskstop') {
    return ()=>{
      if (!TASKS_INFO[job.target] || !TASKS_WORKER[job.target]) {
        clog.error('task stop another task error: job', job.target, 'not exist')
        return
      }
      TASKS_WORKER[job.target].stop()
      TASKS_WORKER[job.target].delete('stop')
      TASKS_WORKER[job.target] = null
      TASKS_INFO[job.target].running = false
      wsSer.send({type: 'task', data: {tid: job.target, op: 'stop'}})
    }
  } else if (job.type === 'exec') {
    return ()=>new Promise((resolve)=>{
      let cwd = /^node /.test(job.target) ? 'script/JSFile' : 'script/Shell'
      exec(job.target, {
        cwd, call: true,
        cb(data, error, finish){
          if (finish) {
            resolve(data)
          } else if (error) {
            resolve(error)
          }
        },
        type: 'task',
        name: taskname
      })
    })
  } else {
    clog.error('unknow job type')
    return ()=>'unknow job type'
  }
}

const taskMa = {
  add(taskinfo, options={}){
    if (!bIsValid(taskinfo)) {
      return {
        rescode: -1,
        message: 'some task parameters may be invalid'
      }
    }

    let tid = options.tid || taskinfo.id
    if (options.type) {
      let tname = this.nameList()
      if (tname[taskinfo.name]) {
        clog.info(taskinfo.name, 'exist, new task add type', options.type)
        switch(options.type) {
        case 'skip':
          return {
            rescode: 0,
            message: 'skip add task ' + taskinfo.name
          }
          break
        case 'addition':
          tid = euid()
          break
        case 'replace':
          tid = tname[taskinfo.name]
          break
        default:
          clog.error('unknow type of task add options')
        }
      }
    }

    if (!tid) {
      tid = euid()
    }
    if (TASKS_WORKER[tid]) {
      clog.info('delete old task data')
      if (TASKS_WORKER[tid].stat()) {
        TASKS_WORKER[tid].stop('restart')
      }
      TASKS_WORKER[tid].delete('restart')
      TASKS_WORKER[tid] = null
    }

    TASKS_INFO[tid] = taskinfo
    TASKS_INFO[tid].id = tid
    TASKS_WORKER[tid] = new Task(TASKS_INFO[tid])
    let message = 'add task: ' + taskinfo.name
    if (taskinfo.running !== false) {
      TASKS_WORKER[tid].start()
      message = 'task: ' + taskinfo.name + ' started'
    }
    return {
      rescode: 0, message, taskinfo
    }
  },
  start(tid){
    if (!tid) {
      return {
        rescode: -1,
        message: 'a task tid is expect'
      }
    }

    if (TASKS_INFO[tid]) {
      if (!TASKS_WORKER[tid]) {
        TASKS_WORKER[tid] = new Task(TASKS_INFO[tid])
      }
      if (TASKS_INFO[tid].running === false) {
        TASKS_WORKER[tid].start()
        return {
          rescode: 0,
          message: 'task started',
          taskinfo: TASKS_INFO[tid]
        }
      } else {
        return {
          rescode: 0,
          message: 'task is running',
          taskinfo: TASKS_INFO[tid]
        }
      }
    }
    return {
      rescode: 404,
      message: 'task ' + tid + ' not exist'
    }
  },
  stop(tid){
    if (!tid) {
      return {
        rescode: -1,
        message: 'a task tid is expect'
      }
    }
    if (TASKS_WORKER[tid]) {
      TASKS_WORKER[tid].stop()
      TASKS_WORKER[tid].delete('stop')
      TASKS_WORKER[tid] = null
      return {
        rescode: 0,
        message: 'task stopped',
        taskinfo: TASKS_INFO[tid]
      }
    }
    if (TASKS_INFO[tid]) {
      return {
        rescode: 0,
        message: 'task already stopped',
        taskinfo: TASKS_INFO[tid]
      }
    }
    return {
      rescode: 404,
      message: 'task no exist'
    }
  },
  delete(tid){
    if (!tid) {
      return {
        rescode: -1,
        message: 'a task tid is expect'
      }
    }
    if (TASKS_WORKER[tid]) {
      TASKS_WORKER[tid].delete()
      delete TASKS_WORKER[tid]
    }
    let resmsg = {
      rescode: 0,
      message: `task ${tid} not exist`
    }
    if (TASKS_INFO[tid]) {
      resmsg.message = `task ${TASKS_INFO[tid].name} deleted`
      delete TASKS_INFO[tid]
    }
    return resmsg
  },
  async test(taskinfo){
    if (!bIsValid(taskinfo)) {
      return {
        rescode: -1,
        message: 'some task parameters may be invalid'
      }
    }
    try {
      let job = jobFunc(taskinfo.job, taskinfo.name + '-test')
      let jobres = await job()
      return {
        rescode: 0,
        message: jobres
      }
    } catch(e) {
      return {
        rescode: -1,
        message: e.message || e
      }
    }
  },
  nameList(){
    let tname = {}
    for (let tid in TASKS_INFO) {
      tname[TASKS_INFO[tid].name] = tid
    }
    return tname
  },
  info(tid = 'all'){
    if (tid === 'all') {
      return TASKS_INFO
    }
    return TASKS_INFO[tid]
  },
  status(){
    let status = {
      total: 0,
      running: 0,
      sub: 0
    }
    for (let tid in TASKS_INFO) {
      if (TASKS_INFO[tid].type === 'sub') {
        status.sub++
      } else {
        status.total++
        if (TASKS_INFO[tid].running) {
          status.running++
        }
      }
    }
    return status
  },
  save(taskobj){
    if (taskobj) {
      // 保存 taskobj 到 task.list 待优化
      if (sType(taskobj) !== 'object') {
        clog.error('fail to save', taskobj, 'to task.list')
        return {
          rescode: -1,
          message: 'a object task info is expect'
        }
      }
      for (let tid in taskobj) {
        if (taskobj[tid].type === 'sub' || taskobj[tid].running === false) {
          if (TASKS_WORKER[tid]) {
            TASKS_WORKER[tid].delete('stop')
            TASKS_WORKER[tid] = null
          }
          TASKS_INFO[tid] = taskobj[tid]
          if (taskobj[tid].type !== 'sub') {
            TASKS_INFO[tid].id = tid
          }
        }
      }
    }
    if (list.put('task.list', TASKS_INFO)) {
      let status = this.status()
      return {
        rescode: 0,
        message: `success save current task list ${status.running}/${status.total}/${status.sub}`
      }
    }
    return {
      rescode: -1,
      message: 'fail to save current task list'
    }
  }
}

module.exports = { taskMa }