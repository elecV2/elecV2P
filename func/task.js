const cron = require('./crontask.js')
const schedule = require('./schedule')

const { logger, feed } = require('../utils')

const clog = new logger({head: 'task'})

// 任务类型： cron/schedule
// 

module.exports = class {
  _Task = {}

  constructor(info, job){
    this.info = info
    this.job = job
  }

  initTask(){
    this._Task.name = this.info.name

    if (this.info.type == 'schedule') {
      let timea = this.info.time.split(' ')
      // clog.info(timea)
      this._Task.time = Number(timea[0]) || 0
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
      feed.addItem(`设置定时任务 ${this._Task.name} `, '具体时间：' + this._Task.time)
    } else if (this.info.type == 'schedule') {
      this.task = new schedule(this._Task, this.job)
      feed.addItem('设置倒计时任务 ' + this._Task.name, '倒计时时间：' + this._Task.time + `${ this._Task.repeat ? '，重复次数：' + this._Task.repeat : '' }` + `${ this._Task.random ? '，随机秒数：' + this._Task.random : '' }`)
      return new Promise(resolve=>{
        this.task.start().then(()=>resolve())
      })
    } else {
      clog.error('任务类型仅支持： cron/schedule')
    }
  }

  stop(){
    if(this.task) {
      feed.addItem(this._Task.name + ' 已停止', '任务时间：' + this._Task.time)
      this.task.stop()
    }
  }

  delete(){
    if(this.task) {
      feed.addItem(this._Task.name + ' 已删除', '任务时间：' + this._Task.time)
      this.task.delete()
    }
  }
}