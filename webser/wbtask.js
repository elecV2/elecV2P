const { taskMa } = require('../func/task')

const { logger, sString } = require('../utils')
const clog = new logger({ head: 'wbtask' })

module.exports = app => {
  app.get('/task', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get task lists')
    res.json(taskMa.info())
  })

  app.put('/task', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), req.body.op, 'task')
    let data = req.body.data
    switch(req.body.op){
      case 'add':
        res.json(taskMa.add(data.task, { type: data.type || 'replace' }))
        break
      case 'start':
        res.json(taskMa.add(data.task))
        break
      case 'stop':
        res.json(taskMa.stop(data.tid))
        break
      case 'delete':
        res.json(taskMa.delete(data.tid))
        break
      case 'test':
        Promise.race([
          taskMa.test(data.task),
          new Promise(resolve=>setTimeout(resolve, 5000, { rescode: 0, message: 'task still running...' }))
        ]).then(tres=>{
          res.send(sString(tres))
        }).catch(e=>{
          res.send(sString(e.message || e))
        })
        break
      default:{
        res.status(405).json({
          rescode: 405,
          message: 'unknow task operation ' + req.body.op
        })
      }
    }
  })

  app.post('/task', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'save task list')
    res.json(taskMa.save(req.body))
  })
}