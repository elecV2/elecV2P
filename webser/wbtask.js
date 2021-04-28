const { Task, TASKS_WORKER, TASKS_INFO, bIsValid, jobFunc } = require('../func/task')

const { logger, list, sType } = require('../utils')
const clog = new logger({ head: 'wbtask' })

module.exports = app => {
  app.get("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `get task lists`)
    res.end(JSON.stringify(TASKS_INFO))
  })

  app.put("/task", async (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), req.body.op, `task`)
    let data = req.body.data
    if (!data.tid) {
      clog.info('modify task fail, a tid parameter is expect')
      res.end(JSON.stringify({
        rescode: -1,
        message: 'a tid parameter is expect'
      }))
      return
    }
    switch(req.body.op){
      case "start":
        if (!data.task || sType(data.task) !== 'object') {
          res.end(JSON.stringify({
            rescode: -1,
            message: 'a json task information is expect'
          }))
          clog.error('start task error, unknow task info:', data.task)
          return
        }
        if (!bIsValid(data.task)) {
          res.end(JSON.stringify({
            rescode: -1,
            message: 'some parameters may be invalid'
          }))
          return
        }
        if (TASKS_WORKER[data.tid]) {
          clog.info('delete old task data')
          if (TASKS_WORKER[data.tid].stat()) {
            TASKS_WORKER[data.tid].stop('restart')
          }
          TASKS_WORKER[data.tid].delete('restart')
          TASKS_WORKER[data.tid] = null
        }

        TASKS_INFO[data.tid] = data.task
        TASKS_INFO[data.tid].id = data.tid
        TASKS_WORKER[data.tid] = new Task(TASKS_INFO[data.tid])
        let message = 'add task: ' + data.task.name
        if (data.task.running !== false) {
          TASKS_WORKER[data.tid].start()
          message = 'task: ' + data.task.name + ' started!'
        }
        res.end(JSON.stringify({
          rescode: 0, message
        }))
        break
      case "stop":
        if(TASKS_WORKER[data.tid]) {
          TASKS_WORKER[data.tid].stop()
          TASKS_WORKER[data.tid].delete('stop')
          TASKS_WORKER[data.tid] = null
          res.end(JSON.stringify({
            rescode: 0,
            message: "task stopped!"
          }))
        } else {
          res.end(JSON.stringify({
            rescode: 404,
            message: "task no existed yet"
          }))
        }
        break
      case "delete":
        if(TASKS_WORKER[data.tid]) {
          TASKS_WORKER[data.tid].delete()
          delete TASKS_WORKER[data.tid]
        }
        delete TASKS_INFO[data.tid]
        res.end(JSON.stringify({
          rescode: 0,
          message: "task deleted!"
        }))
        break
      case "test":
        if (!data.task) {
          res.end(JSON.stringify({
            rescode: -1,
            message: "a task data is expect"
          }))
          return
        }
        let job = jobFunc(data.task.job, data.task.name + '-test')
        try {
          let jobres = await job()
          res.end(JSON.stringify({
            rescode: 0,
            message: jobres
          }))
        } catch(e) {
          res.end(JSON.stringify({
            rescode: -1,
            message: e.message || e
          }))
        }
        break
      default:{
        res.end(JSON.stringify({
          rescode: -1,
          message: "unknow task operation " + req.body.op
        }))
      }
    }
  })

  app.post("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `save task list`)
    if (sType(req.body) === 'object') {
      for (let tid in req.body) {
        if (req.body[tid].type === 'sub' || req.body[tid].running === false) {
          if (TASKS_WORKER[tid]) {
            TASKS_WORKER[tid].delete('stop')
            TASKS_WORKER[tid] = null
          }
          TASKS_INFO[tid] = req.body[tid]
          if (req.body[tid].type !== 'sub') {
            TASKS_INFO[tid].id = tid
          }
        }
      }
      list.put('task.list', req.body)
      res.end(JSON.stringify({
        rescode: 0,
        message: 'task list success saved!'
      }))
    } else {
      clog.error('fail to save', req.body, 'to task.list')
      res.end(JSON.stringify({
        rescode: -1,
        message: 'fail to save task list.'
      }))
    }
  })
}