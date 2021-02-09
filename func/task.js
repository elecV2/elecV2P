const nodecron = require('node-cron')

const cron = require('./crontask.js')
const schedule = require('./schedule')
const { exec } = require('./exec')
const { runJSFile } = require('../script/runJSFile')

const { logger, feedAddItem, sJson, list, file, wsSer } = require('../utils')
const clog = new logger({ head: 'funcTask', cb: wsSer.send.func('tasklog'), file: 'funcTask' })

class Task {
  constructor(info, job){
    this.info = info
    this.job = job
  }

  stat(){
    return Boolean(this.info.running)
  }

  start(){
    if (!bIsValid(this.info)) return false
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
  if (tlist && sJson(tlist)) {
    Object.assign(TASKS_INFO, JSON.parse(tlist))
  }

  if (Object.keys(TASKS_INFO).length) clog.info('retrieve task from Lists/task.list')
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
    const jobenvs = job.target.split(/ -e /)
    let envrough = jobenvs[1]
    if (envrough !== undefined) {
      let envlist = envrough.trim().split(' ')
      envlist.forEach(ev=>{
        let ei = ev.match(/(.*?)=(.*)/)
        if (ei.length === 3) {
          options[ei[1].startsWith('$') ? ei[1] : ('$' + ei[1])] = ei[2]
        }
      })
      job.target = jobenvs[0]
    }

    return ()=>{
      return runJSFile(job.target, { ...options })
    }
  } else if (job.type === 'taskstart') {
    return ()=>{
      if (!TASKS_INFO[job.target]) {
        clog.error('job', job.target, 'not exist.')
        return
      }
      if (!TASKS_WORKER[job.target]) {
        TASKS_WORKER[job.target] = new Task(TASKS_INFO[job.target], jobFunc(TASKS_INFO[job.target].job))
      }
      TASKS_WORKER[job.target].start()
      TASKS_INFO[job.target].running = true
      wsSer.send({type: 'task', data: {tid: job.target, op: 'start'}})
    }
  } else if (job.type === 'taskstop') {
    return ()=>{
      if (!TASKS_INFO[job.target] || !TASKS_WORKER[job.target]) {
        clog.error('job', job.target, 'not exist.')
        return
      }
      TASKS_WORKER[job.target].stop()
      TASKS_INFO[job.target].running = false
      wsSer.send({type: 'task', data: {tid: job.target, op: 'stop'}})
    }
  } else if (job.type === 'exec') {
    return ()=>{
      clog.notify('run shell command', job.target)
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