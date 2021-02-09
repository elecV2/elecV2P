const cron = require('node-cron')
const { logger, wsSer } = require('../utils')

const clog = new logger({ head: 'crontask', cb: wsSer.send.func('tasklog') })

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
    if (this.job) this.job.stop()
    if (this.task) {
      clog.log(this.task.name, 'stopped')
      this.task.running = false
      if(this.task.id) wsSer.send({type: 'task', data: {tid: this.task.id, op: 'stop'}})
    }
  }

  delete(){
    if (this.job) this.job.destroy()
    if (this.task) {
      clog.log("delete cron task:", this.task.name)
      delete this.task
    }
  }
}