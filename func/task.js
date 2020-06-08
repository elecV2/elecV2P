const fs = require('fs')
const path = require('path')
const nodecron = require('node-cron')

const cron = require('./crontask.js')
const schedule = require('./schedule')
const { wsSer } = require('./websocket')
const { runJSFile } = require('../runjs/runJSFile')

const { logger, feed } = require('../utils')
const clog = new logger({ head: 'task', cb: wsSer.send.func('tasklog') })

// 任务类型： cron/schedule
// 基础格式： 
// info: {
//  name: "任务名称",
//  type: "schedule",
//  time: "30 999 2 3",
//  running: true
// }
// job: function

class task {
  constructor(info, job){
    this.info = info
    this.job = job
  }

  stat(){
    return this.info.running ? true : false
  }

  start(){
    if (!valid(this.info)) return
    if (this.info.type == 'cron') {
      this.task = new cron(this.info, this.job)
      this.task.start()
      feed.addItem(`设置定时任务 ${this.info.name} `, '具体时间：' + this.info.time)
    } else if (this.info.type == 'schedule') {
      this.task = new schedule(this.info, this.job)
      this.task.start()
      feed.addItem('设置倒计时任务 ' + this.info.name, '倒计时时间：' + this.info.time)
    } else {
      clog.error('任务类型仅支持： cron/schedule')
    }
  }

  stop(){
    if(this.task) {
      feed.addItem(this.info.name + ' 已停止', '任务时间：' + this.info.time)
      this.task.stop()
    }
  }

  delete(){
    if(this.task) {
      feed.addItem(this.info.name + ' 已删除', '任务时间：' + this.info.time)
      this.task.delete()
    }
  }
}

// 任务信息列表
let tasklists = {}

if (fs.existsSync(path.join(__dirname, '../runjs/Lists', 'task.list'))) {
  try {
    tasklists = JSON.parse(fs.readFileSync(path.join(__dirname, '../runjs/Lists', 'task.list'), "utf8"))
  } catch {
    tasklists = {}
  }
}

// 任务执行列表
const tasks = {}

for(let tid in tasklists) {
  tasks[tid] = new task(tasklists[tid], jobFunc(tasklists[tid].job))
  if (tasklists[tid].running) {
    tasks[tid].start()
  }
}

function jobFunc(job) {
  if (job.type == 'runjs') {
    return ()=>{
      runJSFile(job.target, { type: 'task', cb: wsSer.send.func('tasklog') })
    }
  } else if (job.type == 'taskstart') {
    return ()=>{
      tasks[job.target].start()
      tasklists[job.target].running = true
      wsSer.send({type: 'task', data: {tid: job.target, op: 'start'}})
    }
  } else if (job.type == 'taskstop') {
    return ()=>{
      tasks[job.target].stop()
      tasklists[job.target].running = false
      wsSer.send({type: 'task', data: {tid: job.target, op: 'stop'}})
    }
  } else {
    clog.error('任务类型未知')
    return false
  }
}

function valid(info) {
  // 任务合法性检测
  if (!info.name) {
    clog.error('无任务名')
    return false
  }
  if (info.type != 'schedule' && info.type != 'cron') {
    clog.error(info.name + ' 非法任务类型： ' + info.type)
    return false
  }
  if (info.type == 'cron' && !nodecron.validate(info.time)) {
    clog.error(info.time + ' 不符合 cron 时间格式')
    return false
  }
  let ftime = info.time.split(' ')
  if (info.type == 'schedule' && ftime.filter(t=>/^\d+$/.test(t)).length !== ftime.length ) {
    clog.error(info.time + ' 不符合 schedule 时间格式')
    return false
  }
  return true
}

module.exports = { task, tasks, tasklists, jobFunc }