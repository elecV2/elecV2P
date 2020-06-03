const cron = require('./crontask.js')
const schedule = require('./schedule')

const { logger, feed } = require('../utils')

const clog = new logger({head: 'task'})

// 任务类型： cron/schedule
// 基础格式： 
// info: {
//  name: "任务名称",
//  type: "schedule",
//  time: "30 999 2",
//  running: true
// }
// job: function

module.exports = class {
  constructor(info, job){
    this.info = info
    this.job = job
  }

  stat(){
    return this.info.running ? true : false
  }

  start(){
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