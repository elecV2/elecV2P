const fs = require('fs')
const path = require('path')

const { Task, TASKS_WORKER, TASKS_INFO, jobFunc } = require('../func')

const { logger } = require('../utils')
const clog = new logger({ head: 'wbtask' })

module.exports = app=>{
  app.get("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
  + ` get task lists`)
    res.end(JSON.stringify(TASKS_INFO))
  })

  app.put("/task", (req, res)=>{
    // 定时任务相关操作
    let data = req.body.data
    switch(req.body.op){
      case "start":
        if (TASKS_WORKER[data.tid]) {
          clog.info('删除原有任务，更新数据')
          if (TASKS_WORKER[data.tid].stat()) TASKS_WORKER[data.tid].stop()
          TASKS_WORKER[data.tid].delete()
        }

        TASKS_INFO[data.tid] = data.task
        TASKS_INFO[data.tid].id = data.tid
        TASKS_WORKER[data.tid] = new Task(TASKS_INFO[data.tid], jobFunc(data.task.job))
        TASKS_WORKER[data.tid].start()
        res.end('task: ' + data.task.name + ' started!')
        break
      case "stop":
        if(TASKS_WORKER[data.tid]) {
          TASKS_WORKER[data.tid].stop()
          res.end("task stopped!")
        }
        res.end("no such task")
        break
      case "delete":
        if(TASKS_WORKER[data.tid]) {
          TASKS_WORKER[data.tid].delete()
          delete TASKS_INFO[data.tid]
        }
        res.end("task deleted!")
        break
      case "save":
        fs.writeFileSync(path.join(__dirname, '../runjs/Lists', 'task.list'), JSON.stringify(data))
        res.end("success saved!")
        break
      default:{
        res.end("task operation error")
      }
    }
  })
}