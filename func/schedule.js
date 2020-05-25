const { logger, feed } = require('../utils')

const { wsSerSend } = require('./websocket')

const clog = new logger({ head: 'schedule', level: 'debug', cb: wsSerSend.logs })

/**
 * 基础格式
 * taskinfo = {
    name: "任务名称",
    type: "schedule",
    time: "30 999 2",
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
      this.repeat = 0

      let timea = this.task.time.split(' ')
      // clog.info(timea)
      this._Task.time = Number(timea[0]) || 0
      this._Task.repeat = timea[1] ? Number(timea[1]) : 0
      this._Task.random = timea[2] ? Number(timea[2]) : 0
    } else {
      clog.error('无任务详细信息')
    }
  }

  start(){
    // 开始任务
    clog.log("start schedule task:", this._Task.name, `${this.repeat}/${this._Task.repeat}`)
    this.task.running = true
    if(this._Task.random) {
      let rand = Math.floor(Math.random()*Number(this._Task.random))
      this.countdown = Number(this.countdown || this._Task.time) + rand
    } else {
      this.countdown = this._Task.time
    }
    clog.log(this.task.name, "运行总倒计时：", this.countdown)
    let step = this.countdown>100 ? parseInt(this.countdown/10) : parseInt(this.countdown/3)
    this.temIntval = setInterval(()=>{
      if(this.countdown>0) {
        this.countdown--
        if(this.countdown % step == 0) clog.debug(this.task.name, "运行倒计时：", this.countdown)
      } else {
        clearInterval(this.temIntval)
        clog.log("开始执行任务： ", this.task.name)
        this.job()

        if(this.repeat<this._Task.repeat || this._Task.repeat>=999) {
          this.repeat++
          this.start()
        } else {
          clog.log(this.task.name, '执行完成')
          this.task.running = false
          feed.addItem(this.task.name + ' 执行完成', '倒计时任务')
          if(this.task.id) wsSerSend.task({tid: this.task.id, op: 'stop'})
        }
      }
    }, 1000)
  }
  
  stop(){
    // 暂停任务
    if (this.task) {
      this.task.running = false
      clearInterval(this.temIntval)
      clog.log("停止任务：", this.task.name)
    }
  }

  delete(){
    if (this.task) {
      clog.log("删除任务：", this.task.name)
      delete this.task
    }
  }
}