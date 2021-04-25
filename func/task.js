const nodecron = require('node-cron')

const cron = require('./crontask.js')
const schedule = require('./schedule')
const { exec } = require('./exec')
const { runJSFile } = require('../script/runJSFile')

const { logger, feedAddItem, sJson, list, file, wsSer } = require('../utils')
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
    clog.error('job target is empty')
    return false
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
      TASKS_INFO[job.target].running = true
      wsSer.send({type: 'task', data: {tid: job.target, op: 'start'}})
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
      exec(job.target, {
        cwd: file.get('script/Shell', 'path'), call: true,
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
    return false
  }
}

function taskStatus(){
  let status = {
    total: 0,
    running: 0
  }
  for (let tid in TASKS_INFO) {
    status.total++
    if (TASKS_INFO[tid].running) {
      status.running++
    }
  }
  return status
}

module.exports = { Task, TASKS_WORKER, TASKS_INFO, bIsValid, taskStatus, jobFunc }