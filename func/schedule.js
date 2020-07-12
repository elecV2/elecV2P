const { logger, feedAddItem } = require('../utils')

const { wsSer } = require('./websocket')

const clog = new logger({ head: 'schedule', level: 'debug', cb: wsSer.send.func('tasklog')  })

/**
 * 基础格式
 * taskinfo = {
    name: "任务名称",
    type: "schedule",
    time: "30 999 2 3",
    running: true
  }
  job: function(),
 */

module.exports = class {
  _Task = {}

  constructor(task, job) {
    if (task && job) {
      this.task = task
      this.job = job
      this.repeat = 1

      let timea = this.task.time.split(' ')
      let randomrepeat = timea[3] ? Math.floor(Math.random()*Number(timea[3])) : 0
      this._Task.time = Number(timea[0]) || 0
      this._Task.repeat = timea[1] ? Number(timea[1]) + randomrepeat : 1
      this._Task.random = timea[2] ? Number(timea[2]) : 0
    } else {
      clog.error('no taskinfo')
    }
  }

  start(){
    // 开始任务
    clog.log("start schedule task: ", this.task.name, `${this.repeat}/${this._Task.repeat}`)
    this.task.running = true
    if(this._Task.random) {
      let rand = Math.floor(Math.random()*Number(this._Task.random))
      this.countdown = Number(this.countdown || this._Task.time) + rand
    } else {
      this.countdown = this._Task.time
    }
    clog.log(this.task.name, "total countdown second:", this.countdown)
    let step = this.countdown>100 ? parseInt(this.countdown/10) : parseInt(this.countdown/3)
    this.temIntval = setInterval(()=>{
      if(this.countdown>0) {
        this.countdown--
        if(this.countdown % step == 0) clog.debug(this.task.name, "countdown: ", this.countdown)
      } else {
        clearInterval(this.temIntval)
        clog.log("开始执行任务", this.task.name)
        this.job()

        if(this.repeat<this._Task.repeat || this._Task.repeat>=999) {
          this.repeat++
          this.start()
        } else {
          this.task.running = false
          clog.log(this.task.name, 'finished')
          feedAddItem('schedule task ' + this.task.name + ' finished', 'time: ' + this.task.time)
          clog.debug('如果任务中有异步函数，可能要等异步函数执行时才能看到结果')
          if(this.task.id) wsSer.send({type: 'task', data: {tid: this.task.id, op: 'stop'}})
        }
      }
    }, 1000)
  }
  
  stop(){
    // 暂停任务
    if (this.task) {
      this.task.running = false
      clearInterval(this.temIntval)
      clog.log("stop schedule task:", this.task.name)
    }
  }

  delete(){
    if (this.temIntval) clearInterval(this.temIntval)
    if (this.task) {
      clog.log("delete schedule task:", this.task.name)
      delete this.task
    }
  }
}