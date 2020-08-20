const nodecron = require('node-cron')

const cron = require('./crontask.js')
const schedule = require('./schedule')
const exec = require('./exec')
const { wsSer } = require('./websocket')
const { runJSFile } = require('../script/runJSFile')

const { logger, feedAddItem, isJson, list, file } = require('../utils')
const clog = new logger({ head: 'funcTask', cb: wsSer.send.func('tasklog'), file: 'funcTask' })

class Task {
  constructor(info, job){
    this.info = info
    this.job = job
  }

  stat(){
    return (this.info.running ? true : false)
  }

  start(){
    if (!bIsValid(this.info)) return false
    if (this.info.type === 'cron') {
      this.task = new cron(this.info, this.job)
      this.task.start()
      feedAddItem(`start crontask ${this.info.name} `, 'time: ' + this.info.time)
    } else if (this.info.type === 'schedule') {
      this.task = new schedule(this.info, this.job)
      this.task.start()
      feedAddItem('start scheduletask' + this.info.name, 'time: ' + this.info.time)
    } else {
      clog.error('task type only support: cron/schedule')
    }
  }

  stop(){
    if(this.task) {
      feedAddItem(this.info.name + ' stopped', 'time: ' + this.info.time)
      this.task.stop()
    }
  }

  delete(){
    if(this.task) {
      feedAddItem(this.info.name + ' deleted', 'time: ' + this.info.time)
      this.task.delete()
    }
  }
}

const TASKS_INFO = {}             // 任务信息列表
const TASKS_WORKER = {}           // 执行任务列表

const taskInit = function() {
  // 初始化任务列表
  const tlist = list.get('task.list')
  if (tlist && isJson(tlist)) {
    Object.assign(TASKS_INFO, JSON.parse(tlist))
  }

  for(let tid in TASKS_INFO) {
    TASKS_WORKER[tid] = new Task(TASKS_INFO[tid], jobFunc(TASKS_INFO[tid].job))
    if (TASKS_INFO[tid].running) {
      TASKS_WORKER[tid].start()
    }
  }
}();

function bIsValid(info) {
  // 任务合法性检测
  if (!info.name) {
    clog.error('no task name')
    return false
  }
  if (!/cron|schedule|exec/.test(info.type)) {
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
  return true
}

function jobFunc(job) {
  // 任务信息转化为可执行函数
  if (job.type === 'runjs') {
    const options = { type: 'task', cb: wsSer.send.func('tasklog') }
    
    let envrough = job.target.match(/-e ([^-]+)/)
    if (envrough) {
      let envlist = envrough[1].trim().split(' ')
      envlist.forEach(ev=>{
        let ei = ev.split('=')
        if (ei.length === 2) {
          options['$' + ei[0].trim()] = ei[1].trim()
        }
      })
      job.target = job.target.split(/ -e /)[0]
    }

    return ()=>{
      clog.notify('runjs', job.target)
      runJSFile(job.target, { ...options })
    }
  } else if (job.type === 'taskstart') {
    return ()=>{
      clog.notify('start task', TASKS_INFO[job.target].name)
      TASKS_WORKER[job.target].start()
      TASKS_INFO[job.target].running = true
      wsSer.send({type: 'task', data: {tid: job.target, op: 'start'}})
    }
  } else if (job.type === 'taskstop') {
    return ()=>{
      clog.notify('stop task', TASKS_INFO[job.target].name)
      TASKS_WORKER[job.target].stop()
      TASKS_INFO[job.target].running = false
      wsSer.send({type: 'task', data: {tid: job.target, op: 'stop'}})
    }
  } else if (job.type === 'exec') {
    return ()=>{
      clog.notify('run exec cammand', job.target)
      exec(job.target, {
        cwd: file.get('script/Shell', 'path'),
        cb(data, error){
          error ? clog.error(error) : clog.info(data)
        }
      })
    }
  } else {
    clog.error('unknow job type')
    return false
  }
}

module.exports = { Task, TASKS_WORKER, TASKS_INFO, jobFunc, bIsValid }