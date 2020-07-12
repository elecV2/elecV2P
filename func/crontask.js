const cron = require('node-cron')

const { wsSer } = require('./websocket')
const { logger } = require('../utils')

const clog = new logger({ head: 'crontask', cb: wsSer.send.func('tasklog') })

/**
 * 基础格式
 * taskinfo = {
    name: "任务名称",
    type: "cron",
    time: 30 * * * * * (六位 cron 时间格式）,
    running: false
  }
    job: function(),
 */

module.exports = class {
  
  constructor(task, job) {
    this.task = task
    this.job = job
  }

  isvalidate(){
    return cron.validate(this.task.time)
  }

  start(){
    if (this.task) {
      clog.log(`start cron task ${this.task.name}, time: ${this.task.time}`)
      
      this.job = cron.schedule(this.task.time, this.job)
      this.task.running = true
    } else {
      clog.error('no taskinfo')
    }
  }

  stop(){
    if(this.job) this.job.stop()
    clog.log(this.task.name, 'stopped')
    this.task.running = false
  }

  delete(){
    if(this.job) this.job.destroy()
    if (this.task) {
      clog.log("delete cron task:", this.task.name)
      delete this.task
    }
  }
}