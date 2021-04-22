const { logger, feedAddItem, sType, sString, iRandom, wsSer } = require('../utils')

const clog = new logger({ head: 'schedule', level: 'debug', cb: wsSer.send.func('tasklog')  })

module.exports = class {
  _Task = {}

  constructor(task, job) {
    if (task && job) {
      this.task = task
      this.job = job
      this.repeat = 1

      let timea = this.task.time.split(' ')
      let randomrepeat = timea[3] ? iRandom(Number(timea[3])) : 0
      this._Task.time = Number(timea[0]) || 0
      this._Task.repeat = timea[1] ? Number(timea[1]) + randomrepeat : 1
      this._Task.random = timea[2] ? Number(timea[2]) : 0
    } else {
      clog.error('no taskinfo')
    }
  }

  start(){
    clog.log("start schedule task:", this.task.name, `${this.repeat}/${this._Task.repeat}, time: ${this.task.time}`)
    this.task.running = true
    if(this._Task.random) {
      let rand = iRandom(Number(this._Task.random))
      this.countdown = Number(this.countdown || this._Task.time) + rand
    } else {
      this.countdown = this._Task.time
    }
    clog.log(this.task.name, "total countdown second:", this.countdown)
    let step = this.countdown>100 ? parseInt(this.countdown/10) : parseInt(this.countdown/3)
    if (this.countdown <= 0) {
      this.run()
    } else {
      this.temIntval = setInterval(()=>{
        this.countdown--
        if(this.countdown>0) {
          if(this.countdown % step == 0) {
            clog.debug(this.task.name, "countdown:", this.countdown)
          }
        } else {
          clearInterval(this.temIntval)
          this.run()
        }
      }, 1000)
    }
  }

  run(){
    clog.log(this.task.name, 'job start')
    let jobres = this.job()

    if (this.repeat < this._Task.repeat || this._Task.repeat >= 999) {
      this.repeat++
      this.start()
    } else {
      if (sType(jobres) === 'promise') {
        Promise.race([jobres, new Promise(resolve=>setTimeout(resolve, 5000, 'job resolve is timeout of 5000ms'))]).then(res=>jobres=res).finally(res=>this.stop('finished', jobres))
      } else {
        this.stop('finished', jobres)
      }
    }
  }
  
  stop(flag = 'stopped', data){
    if (this.task) {
      this.task.running = false
      clearInterval(this.temIntval)
      clog.log(this.task.name, flag)
      if (data) {
        clog.log(this.task.name, 'result:', sString(data))
      }
      if (this.task.id && flag !== 'restart') {   // maybe 'stopped' or 'finished'
        wsSer.send({type: 'task', data: {tid: this.task.id, op: 'stop'}})
      }
      if (flag === 'finished') {
        feedAddItem(`scheduletask ${this.task.name} finished`, 'time: ' + this.task.time)
      }
    }
  }

  delete(flag = 'delete'){
    if (this.temIntval) {
      clearInterval(this.temIntval)
    }
    if (this.task) {
      if (flag !== 'stop') {
        clog.log(flag, "schedule task:", this.task.name)
      }
      delete this.task
    }
  }
}