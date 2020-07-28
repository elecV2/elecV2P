const { Task, TASKS_WORKER, TASKS_INFO, jobFunc } = require('../func/task')
const { wsSer } = require('../func/websocket')
const { JSLISTS } = require('../script')

const { logger, errStack, eAxios, list, jsfile } = require('../utils')
const clog = new logger({ head: 'wbtask', cb: wsSer.send.func('tasklog') })

module.exports = app => {
  app.get("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `get task lists`)
    res.end(JSON.stringify(TASKS_INFO))
  })

  app.put("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `put task`, req.body.op)
    let data = req.body.data
    switch(req.body.op){
      case "start":
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
        res.end("task operation error")
      }
    }
  })

  app.post("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `save task list`)
    list.put('task.list', req.body)
    res.end("success saved!")
  })

  app.put('/mock', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `make mock`, req.body.type)
    const request = req.body.request
    switch(req.body.type){
      case "req":
        eAxios(request).then(response=>{
          clog.notify('mock request response:', response.data)
          res.end('success!')
        }).catch(error=>{
          clog.error('mock request error:', errStack(error))
          res.end('fail!')
        })
        break
      case "js":
        let jsname = req.body.jsname
        if (jsname) {
          if (!/\.js$/.test(jsname)) jsname = jsname + '.js'
        } else {
          jsname = 'elecV2Pmock.js'
        }
        const jscont = `
/**
 * mock JS from elecV2P - ${jsname}
 */

const request = ${ JSON.stringify(request, null, 2) }

$axios(request).then(res=>{
  console.log(res.data)
}).catch(e=>{
  console.error(e)
})
`
        jsfile.put(jsname, jscont)
        res.end(`success save ${jsname}!`)
        clog.notify(`success save ${jsname}!`)
        if (JSLISTS.indexOf(jsname) === -1) JSLISTS.push(jsname)
        break
      default:{
        res.end("wrong mock type")
      }
    }
  })
}