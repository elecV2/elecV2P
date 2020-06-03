const fs = require('fs')
const path = require('path')
const express = require('express')
const compression = require('compression')
const formidable = require('formidable')
const homedir = require('os').homedir()

const { ruleData, init } = require('./runjs/rule')
const runJSFile = require('./runjs/runJSFile')
const { task, jsdownload, wsSer, ...func } = require('./func')
const { logger, feed } = require('./utils')

const clog = new logger({head: 'webServer'})

const crtpath = homedir + '/.anyproxy/certificates'

let config = {
      glevel: 'info',
      feedenable: true,
      iftttid: ''
    }

const configFile = path.join(__dirname, 'runjs', 'Lists', 'config.json')

if (fs.existsSync(configFile)) {
  try {
    Object.assign(config, JSON.parse(fs.readFileSync(configFile), "utf8"))
    feed.config.isclose = !config.feedenable
    feed.config.iftttid = config.iftttid
    if(config.glevel != 'info') clog.setlevel(config.glevel, true)
  } catch {
    clog.error('config.json 无法解析')
  }
}

// 保存的任务列表
let tasklists = {}

if (fs.existsSync(path.join(__dirname, 'runjs/Lists', 'task.list'))) {
  try {
    tasklists = JSON.parse(fs.readFileSync(path.join(__dirname, 'runjs/Lists', 'task.list'), "utf8"))
  } catch {
    tasklists = {}
  }
}

// 可执行任务列表
const tasks = {}

for(let tid in tasklists) {
  tasks[tid] = new task(tasklists[tid], jobFunc(tasklists[tid].job))
  if (tasklists[tid].running) {
    tasks[tid].start()
  }
}

function jobFunc(job) {
  if (job.type == 'runjs') {
    return ()=>{
      runJSFile(job.target, { type: 'task', cb: wsSer.send.func('tasklog') })
    }
  } else if (job.type == 'taskstart') {
    return ()=>{
      tasks[job.target].start()
      tasklists[job.target].running = true
      wsSer.send({type: 'task', data: {tid: job.target, op: 'start'}})
    }
  } else if (job.type == 'taskstop') {
    return ()=>{
      tasks[job.target].stop()
      tasklists[job.target].running = false
      wsSer.send({type: 'task', data: {tid: job.target, op: 'stop'}})
    }
  } else {
    clog.error('任务类型未知')
    return false
  }
}

function webser({ webstPort, proxyPort, webifPort, webskPort, webskPath }) {
  const app = express()
  app.use(compression())
  app.use(express.json())

  let oneMonth = 60 * 1000 * 60 * 24 * 30

  app.use(express.static(__dirname + '/web/dist', { maxAge: oneMonth }))

  app.listen(webstPort, ()=>{
    clog.notify("elecV2P manage on port", webstPort)
  })

  app.get("/initdata", (req, res)=>{
    res.end(JSON.stringify({
      config: {...ruleData, ...config},
      jslists: fs.readdirSync(path.join(__dirname, 'runjs/JSFile')).sort(),
    }))
  })

  app.get("/feed", (req, res)=>{
    res.set('Content-Type', 'text/xml')
    res.end(feed.xml())
  })

  app.get("/filter", (req, res)=>{
    res.set('Content-Type', 'text/plain')
    res.end(fs.readFileSync(path.join(__dirname, 'runjs', 'Lists', 'filter.list'), 'utf8'))
  })

  app.put("/feed", (req, res)=>{
    let data = req.body.data
    switch(req.body.type){
      case "op":
        config.feedenable = !data
        feed.config.isclose = data
        clog.notify(`feed 已 ${ data ? '开启' : '关闭' }`)
        res.end(`feed 已 ${ data ? '开启' : '关闭' }`)
        break
      case "clear":
        feed.clear()
        clog.notify('feed 已清空')
        res.end('feed 已清空')
        break
      case "ifttt":
        config.iftttid = data
        feed.config.iftttid = data
        clog.notify(`ifttt webhook 功能已 ${ data ? '开启' : '关闭' }`)
        res.end(`ifttt webhook 功能已 ${ data ? '开启' : '关闭' }`)
        break
      default:{
        res.end('未知操作')
      }
    }
  })

  app.post('/uploadjs', (req, res) => {
    // js文件上传
    var jsfile = new formidable.IncomingForm()
    jsfile.maxFieldsSize = 2 * 1024 * 1024 //限制为最大2M
    jsfile.keepExtensions = true
    jsfile.multiples = true
    jsfile.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error', err)
        throw err
      }

      let jsDir = path.join(__dirname, "runjs", "JSFile")

      if (files.js.length) {
        files.js.forEach(file=>{
          clog.notify('上传文件：', file.name)
          fs.copyFileSync(file.path, path.join(jsDir, file.name))
        })
      } else {
        clog.notify('上传文件：', files.js.name)
        fs.copyFileSync(files.js.path, path.join(jsDir, files.js.name))
      }
    })
    res.write('js uploaded success!')
    res.end()
  })

  app.get("/crt", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
      , "根证书下载")
    res.download(crtpath + "/rootCA.crt")
  })

  app.put("/crt", (req, res)=>{
    let op = req.body.op
    switch(op){
      case 'rootsync':
        if(func.rootCrtSync()) {
          res.end('已启用 rootCA 文件夹下根证书')
        } else {
          res.end('rootCA 目录下无根证书，请先放置再同步')
        }
        break
      case 'clearcrt':
        func.clearCrt()
        res.end('其他证书已清除')
        break
      default: {
        res.end("未知操作")
        break
      }
    }
  })

  app.get("/rest", (req, res)=>{
    switch(req.query.op){
      case 'upsubrule':
        let url = req.query.url
        let adr = func.crule(url)
        res.end('upsubrule success!' + adr)
        break
      default:{
        clog.info('no op')
        res.end('no op')
      }
    }
    res.end('done')
  })

  app.post("/rewritelists", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
      , "保存规则列表")
    if (req.body.subrule || req.body.rewritelists) {
      ruleData.subrules = req.body.subrule
      ruleData.rewritelists = req.body.rewritelists
      let file = fs.createWriteStream(path.join(__dirname, 'runjs', 'Lists', 'rewrite.list'))
      file.on('error', (err)=>clog.err(err))

      file.write('[sub]\n\r')
      req.body.subrule.forEach(surl=>{
        file.write("sub " + surl + "\n\r")
      })
      file.write('\n\r[rewrite]\n\r')
      req.body.rewritelists.forEach(v=>{
        file.write(v.join(' ') + '\n\r')
      })

      file.on('finish', ()=>{
        file.close(()=>{
          init()
        })
      })

      file.end()
      res.end(`规则列表更新成功`)
    } else {
      res.end("非法请求")
    }
  })

  app.get("/data", (req, res)=>{
    let type = req.query.type
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
  + ` get data ${type}`)
    res.writeHead(200,{ 'Content-Type' : 'text/plain;charset=utf-8' })
    switch (type) {
      case "config":
        res.end(JSON.stringify(config))
        break
      case "useragent":
        res.end(fs.readFileSync(path.join(__dirname, 'runjs', 'Lists', 'useragent.list'), "utf8"))
        break
      case "ePrules":
        res.end(fs.readFileSync(path.join(__dirname, 'runjs', 'Lists', 'default.list'), "utf8"))
        break
      case "filter":
        res.end(fs.readFileSync(path.join(__dirname, 'runjs', 'Lists', 'filter.list'), 'utf8'))
        break
      case "todolist":
        res.end(fs.readFileSync(path.join(__dirname, 'Todo.md'), "utf8"))
        break
      case "port":
        res.end(JSON.stringify({
          proxyPort,
          webifPort,
          webskPort,
          webskPath
        }))
        break
      default: {
        res.end("404")
      }
    }
  })

  app.put("/data", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " put data " + req.body.type)
    switch(req.body.type){
      case "config":
        Object.assign(config, req.body.data)

        fs.writeFileSync(configFile, JSON.stringify(config))
        res.end("当前配置 已保存至 " + configFile)
        break
      case "useragent":
        let oua = JSON.parse(fs.readFileSync(path.join(__dirname, 'runjs', 'Lists', 'useragent.list'), "utf8"))
        oua.enable = req.body.data.enable
        fs.writeFileSync(path.join(__dirname, 'runjs', 'Lists', 'useragent.list'), JSON.stringify(oua))
        res.end(oua.enable?"使用新的 User-Agent: " + oua[oua.enable].name:"取消使用 User-Agent")
        break
      case "glevel":
        try {
          config.glevel = req.body.data
          clog.setlevel(req.body.data, true)
          res.end('日志级别设置为：' + req.body.data)
        } catch(e) {
          res.end('日志级别设置失败 ' + e)
        }
        break
      case "ePrules":
        let fdata = req.body.data.eplists
        fs.writeFileSync(path.join(__dirname, 'runjs', 'Lists', 'default.list'), "# elecV2P rules \n\r\n\r" + fdata.join("\n\r"))

        res.end("规则保存成功")
        ruleData.reqlists = []
        ruleData.reslists = []
        fdata.forEach(r=>{
          if (/req$/.test(r)) ruleData.reqlists.push(r)
          else ruleData.reslists.push(r)
        })
        clog.notify(`default 规则 ${ ruleData.reqlists.length + ruleData.reslists.length} 条`)
        break
      case "mitmhost":
        let mhost = req.body.data
        fs.writeFileSync(path.join(__dirname, 'runjs', 'Lists', 'mitmhost.list'), "[mitmhost]\n" + mhost.join("\n"))
        res.end("保存 mitmhost : " + mhost.length)
        init()
        break
      default:{
        res.end("data put error")
      }
    }
  })

  app.get("/task", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
  + ` get task lists`)
    res.end(JSON.stringify(tasklists))
  })

  app.put("/task", (req, res)=>{
    // 定时任务相关操作
    let data = req.body.data
    switch(req.body.op){
      case "start":
        if (tasks[data.tid]) {
          clog.info('删除原有任务，更新数据')
          if (tasks[data.tid].stat()) tasks[data.tid].stop()
          tasks[data.tid].delete()
        }

        tasklists[data.tid] = data.task
        tasklists[data.tid].id = data.tid
        tasks[data.tid] = new task(tasklists[data.tid], jobFunc(data.task.job))
        tasks[data.tid].start()
        res.end("task started!")
        break
      case "stop":
        if(tasks[data.tid]) {
          tasks[data.tid].stop()
          tasklists[data.tid].running = false
          res.end("task stopped!")
        }
        res.end("no such task")
        break
      case "delete":
        if(tasks[data.tid]) {
          tasks[data.tid].delete()
          delete tasklists[data.tid]
          res.end("task deleted!")
        }
        res.end("no such task")
        break
      case "save":
        fs.writeFileSync(path.join(__dirname, 'runjs/Lists', 'task.list'), JSON.stringify(data))
        res.end("success saved!")
        break
      default:{
        res.end("task operation error")
      }
    }
  })

  app.get("/jsfile", (req, res)=>{
    let jsfn = req.query.jsfn
    if (jsfn) {
      res.end(fs.readFileSync(path.join(__dirname, "runjs/JSFile", jsfn), "utf8"))
      clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " read file: " + jsfn)
    } else {
      res.end("404")
    }
  })

  app.put("/jsfile", (req, res)=>{
    let op = req.body.op
    switch(op){
      case 'jsdownload':
        jsdownload(req.body.url, req.body.name).then(jsl=>{
          res.end(jsl)
        }).catch(e=>{
          res.end('jsdownload fail!')
        })
        break
      default: {
        res.end("jsfile put error")
        break
      }
    }
  })

  app.post("/jsfile", (req, res)=>{
    if (!req.body.jscontent) {
      res.end("have no content")
      return
    }
    // res.writeHead(200,{ 'Content-Type' : 'text/plain;charset=utf-8' })
    if (req.body.jsname == 'totest') {
      let jsres = runJSFile(req.body.jscontent, { type: 'jstest' })
      res.end(typeof(jsres) !== 'string' ? JSON.stringify(jsres) : jsres)
    } else {
      fs.writeFileSync(path.join(__dirname, 'runjs/JSFile', req.body.jsname), req.body.jscontent)
      clog.notify(`${req.body.jsname} 文件保存成功`)
      res.end(`${req.body.jsname} 文件保存成功`)
    }
  })

  app.delete("/jsfile", (req, res)=>{
    let jsfn = req.body.jsfn
    clog.notify("delete js file " + req.body.jsfn)
    if (jsfn) fs.unlinkSync(path.join(__dirname, "runjs/JSFile/" + jsfn))
    else clog.error("delete js file error")
    res.end(jsfn)
  })

  app.post("/filterlist", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
      + " 保存最新 filter.list")
    if (req.body.filterlist) {
      let file = fs.createWriteStream(path.join(__dirname, 'runjs', 'Lists', 'filter.list'))
      file.on('error', (err)=>clog.error(err))
      file.write("# elecV2P filter.list\n\n")
      req.body.filterlist.forEach(fr=>{
        if (fr[1] && /^DOMAIN(-SUFFIX)?$/.test(fr[0])) {
          file.write(fr[0] + "," + fr[1] + ",elecV2P\n")
        }
      })
      file.end()
      res.end(`filter.list 更新成功`)
    } else {
      res.end("非法请求")
    }
  })

  app.get("/logs/:filename", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " get logs")
    let filename = req.params.filename
    if (fs.existsSync(path.join(__dirname, 'logs', filename))) {
      res.writeHead(200,{ 'Content-Type' : 'text/plain;charset=utf-8' })
      res.end(fs.readFileSync(path.join(__dirname, 'logs', filename), "utf8"))
    } else {
      res.writeHead(200,{ 'Content-Type' : 'text/html;charset=utf-8' })
      fs.readdirSync(path.join(__dirname, 'logs')).forEach(log=>{
        res.write('<a href="/logs/' + log + '" >' + log + '</a><br>')
      })
      res.end()
    }
  })

  app.get("/store", (req, res) => {
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " get store data")
    res.writeHead(200, { 'Content-Type' : 'text/plain;charset=utf-8' })
    const store = {}
    fs.readdirSync(path.join(__dirname, 'runjs/Store')).forEach(s=>{
      store[s] = fs.readFileSync(path.join(__dirname, 'runjs/Store', s), 'utf8')
    })
    res.end(JSON.stringify(store))
  })

  app.put("/store", (req, res) => {
    let data = req.body.data
    if (!data) {
      res.end('no put data!')
      return
    }
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
      + " put store " + req.body.type)
    switch (req.body.type) {
      case "save":
        if (data.key && data.value) {
          fs.writeFileSync(path.join(__dirname, 'runjs/Store', data.key), data.value)
          clog.notify(`保存 ${ data.key } 值: ${ data.value }`)
          res.end(data.key + ' 已保存')
        } else {
          res.end('no data to save!')
        }
        break
      case "delete":
        try {
          fs.unlinkSync(path.join(__dirname, "runjs/Store", data))
          clog.notify(data, 'deleted')
          res.end(data + ' 已删除')
        } catch(e) {
          clog.error('delete fail!', e)
          res.end('delete fail!' + e)
        }
        break
      default:{
        break
      }
    }
  })

  app.get("/test", (req, res)=>{
    clog.debug("do some test")
    // let lists = 
    // res.end(func.filterlistadd())
  })

  app.use((req, res, next) => {
    res.end("404")
    next()
  })

  return app
}

module.exports = webser