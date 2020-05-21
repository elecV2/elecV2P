const { logger } = require('../utils')

const { wsSerSend } = require('./websocket')

const clog = new logger({ head: 'schedule', level: 'debug', cb: wsSerSend.logs })

/**
 * 基础格式
 * taskinfo = {
    name: "任务名称",
    type: "schedule",
    time: 30,
    repeat: 999,
    random: 2,
    running: true
  }
    job: function(),
 */

module.exports = class {
  constructor(task, job) {
    if (task && job) {
      this.task = task
      this.job = job
      this.repeat = 0
    } else {
      clog.error('无任务详细信息')
    }
  }

  start(){
    // 开始任务
    clog.log("start schedule task:", this.task.name, `${this.repeat}/${this.task.repeat}`)
    this.task.running = true
    if(this.task.random) {
      let rand = Math.floor(Math.random()*Number(this.task.random))
      this.countdown = Number(this.countdown || this.task.time) + rand
    } else {
      this.countdown = this.task.time
    }
    clog.log(this.task.name, "运行总倒计时：", this.countdown)
    let step = this.countdown>100 ? parseInt(this.countdown/10) : parseInt(this.countdown/3)
    return new Promise(resolve=>{
      this.temIntval = setInterval(()=>{
        if(this.countdown>0) {
          this.countdown--
          if(this.countdown % step == 0) clog.debug(this.task.name, "运行倒计时：", this.countdown)
        } else {
          clearInterval(this.temIntval)
          clog.log("开始执行任务： ", this.task.name)
          this.job()

          if(this.repeat<this.task.repeat || this.task.repeat>=999) {
            this.repeat++
            this.start()
          } else {
            clog.log(this.task.name, '执行完成')
            this.task.running = false
            resolve()
          }
        }
      }, 1000)
    })
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