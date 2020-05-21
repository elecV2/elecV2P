const cron = require('node-cron')

const { wsSerSend } = require('./websocket')
const { logger } = require('../utils')

const clog = new logger({ head: 'crontask', cb: wsSerSend.logs })

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
      clog.log(`设置定时任务 ${this.task.name} 成功，时间：${this.task.time}`)
      
      this.job = cron.schedule(this.task.time, this.job)
      this.task.running = true
    } else {
      clog.error('请添加任务内容')
    }
  }

  stop(){
    if(this.job) this.job.stop()
    clog.log(this.task.name, '已停止')
    this.task.running = false
  }

  delete(){
    if(this.job) this.job.destroy()
    clog.log(this.task.name, '已删除')
  }
}