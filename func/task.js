const cron = require('./crontask.js')
const schedule = require('./schedule')

const { logger } = require('../utils')

const clog = new logger('task')

// 任务类型： cron/schedule
// 

module.exports = class {
  _Task = {}

  constructor(info, job){
    this.info = info, this.job
    this.job = job
  }

  initTask(){
    this._Task.name = this.info.name

    if (this.info.type == 'schedule') {
      let timea = this.info.time.split(' ')
      // clog.info(timea)
      this._Task.time = Number(timea[0])
      this._Task.repeat = timea[1] ? Number(timea[1]) : 0
      this._Task.random = timea[2] ? Number(timea[2]) : 0
    } else {
      this._Task.time = this.info.time
    }
  }

  start(){
    this.initTask()
    if (this.info.type == 'cron') {
      this.task = new cron(this._Task, this.job)
      this.task.start()
    } else if (this.info.type == 'schedule') {
      this.task = new schedule(this._Task, this.job)
      this.task.start()
    } else {
      clog.error('任务类型仅支持： cron/schedule')
    }
  }

  stop(){
    if(this.task) this.task.stop()
  }

  delete(){
    if(this.task) this.task.delete()
  }
}