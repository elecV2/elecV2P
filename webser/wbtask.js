const { Task, TASKS_WORKER, TASKS_INFO, jobFunc } = require('../func/task')

const { logger, list, sType } = require('../utils')
const clog = new logger({ head: 'wbtask' })

module.exports = app => {
  app.get("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `get task lists`)
    res.end(JSON.stringify(TASKS_INFO))
  })

  app.put("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), req.body.op, `task`)
    let data = req.body.data
    if (!data.tid) {
      clog.info('modify task fail! parameter tid is not present.')
      res.end('modify task fail!')
      return
    }
    switch(req.body.op){
      case "start":
        if (!data.task || sType(data.task) !== 'object') {
          clog.error('start task error, unknow task info:', data.task)
          res.end('start task error.')
          return
        }
        if (TASKS_WORKER[data.tid]) {
          clog.info('delete task old data')
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
        } else {
          res.end("no such task")
        }
        break
      case "delete":
        if(TASKS_WORKER[data.tid]) {
          TASKS_WORKER[data.tid].delete()
          delete TASKS_INFO[data.tid]
        }
        res.end("task deleted!")
        break
      default:{
        res.end("unknow task operation " + req.body.op)
      }
    }
  })

  app.post("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `save task list`)
    if (sType(req.body) === 'object') {
      for (let tid in req.body) {
        if (req.body[tid].running === false && TASKS_INFO[tid]) {
          TASKS_INFO[tid] = req.body[tid]
          TASKS_INFO[tid].id = tid
          TASKS_WORKER[tid] = new Task(TASKS_INFO[tid], jobFunc(req.body[tid].job))
        }
      }
      list.put('task.list', req.body)
      res.end('task list success saved!')
    } else {
      clog.error('fail to save', req.body, 'to task.list')
      res.end('fail to save task list.')
    }
  })
}