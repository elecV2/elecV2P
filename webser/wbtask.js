const fs = require('fs')
const path = require('path')
const axios = require('axios')

const { Task, TASKS_WORKER, TASKS_INFO, jobFunc } = require('../func/task')
const { wsSer } = require('../func/websocket')
const { JSLISTS } = require('../runjs')

const { logger, errStack } = require('../utils')
const clog = new logger({ head: 'wbtask', cb: wsSer.send.func('tasklog') })

module.exports = app => {
  app.get("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `get task lists`)
    res.end(JSON.stringify(TASKS_INFO))
  })

  app.put("/task", (req, res)=>{
    // 定时任务相关操作
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `put task`, req.body.op)
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
      case "save":
        fs.writeFileSync(path.join(__dirname, '../runjs/Lists', 'task.list'), JSON.stringify(data))
        res.end("success saved!")
        break
      default:{
        res.end("task operation error")
      }
    }
  })

  app.put('/mock', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `make mock`, req.body.type)
    const request = req.body.request
    switch(req.body.type){
      case "req":
        axios(request).then(response=>{
          clog.notify('mock request:', response.data)
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
 * mock JS from elecV2P
 */

const request = ${ JSON.stringify(request, null, 2) }

$axios(request).then(res=>{
  console.log(res.data)
}).catch(e=>{
  console.error(e)
})
`
        const jspath = path.join(__dirname, "../runjs/JSFile", jsname)
        fs.writeFileSync(jspath, jscont)
        clog.notify(`${jsname} 文件成功保存至`, jspath)
        res.end(jspath)
        if (JSLISTS.indexOf(jsname) === -1) JSLISTS.push(jsname)
        break
      default:{
        res.end("wrong mock type")
      }
    }
  })
}