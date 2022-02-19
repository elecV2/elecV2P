const cron = require('node-cron')
const { logger, wsSer } = require('../utils')

const clog = new logger({ head: 'crontask', cb: wsSer.send.func('tasklog') })

module.exports = class {
  constructor(task, job) {
    this.task = task
    this.job = job
  }

  start(){
    if (this.task) {
      clog.log(`start cron task: ${this.task.name}, time: ${this.task.time}`)
      
      this.cronjob = cron.schedule(this.task.time, this.job)
      this.task.running = true
      if (this.task.id) {
        wsSer.send({ type: 'task', data: { tid: this.task.id, op: 'start' }})
      }
    } else {
      clog.error('no taskinfo')
    }
  }

  stop(flag = 'stopped'){
    if (this.cronjob) {
      this.cronjob.stop()
    }
    if (this.task) {
      clog.log(this.task.name, flag)
      this.task.running = false
      if (this.task.id && flag !== 'restart') {
        wsSer.send({ type: 'task', data: { tid: this.task.id, op: 'stop' }})
      }
    }
  }

  delete(flag = 'delete'){
    if (this.cronjob) {
      this.cronjob.destroy?.()
      this.cronjob = null
    }
    if (this.task) {
      if (flag !== 'stop') {
        clog.log(flag, "cron task:", this.task.name)
      }
      delete this.task
    }
  }
}