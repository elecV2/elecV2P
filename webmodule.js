const fs = require('fs')
const path = require('path')
const express = require('express')
const compression = require('compression')
const formidable = require('formidable')
const homedir = require('os').homedir()

const { logger, CONFIG_FEED, feedXml, feedClear } = require('./utils')
const { Task, TASKS_WORKER, TASKS_INFO, jobFunc, jsdownload, rootCrtSync, clearCrt } = require('./func')
const { CONFIG_RULE, runJSFile, JSLISTS } = require('./runjs')

const clog = new logger({ head: 'webServer' })

const CONFIG = function() {
  // config 初始化
  let config = {
    path: path.join(__dirname, 'runjs', 'Lists', 'config.json'),
    gloglevel: 'info',
    CONFIG_FEED,
  }
  if (fs.existsSync(config.path)) {
    try {
      Object.assign(config, JSON.parse(fs.readFileSync(config.path), "utf8"))
      Object.assign(CONFIG_FEED, config.CONFIG_FEED)
      if(config.gloglevel != 'info') clog.setlevel(config.gloglevel, true)
    } catch(e) {
      clog.error(path, '配置文件无法解析', e)
    }
  }

  return config
}();

function webser({ webstPort, proxyPort, webifPort, webskPort, webskPath }) {
  const app = express()
  app.use(compression())
  app.use(express.json())

  let onemonth = 60 * 1000 * 60 * 24 * 30                // 页面缓存时间

  app.use(express.static(__dirname + '/web/dist', { maxAge: onemonth }))

  app.listen(webstPort, ()=>{
    clog.notify("elecV2P manage on port", webstPort)
  })

  app.get("/initdata", (req, res)=>{
    res.end(JSON.stringify({
      config: CONFIG,
      jslists: JSLISTS,
    }))
  })

  app.get("/feed", (req, res)=>{
    res.set('Content-Type', 'text/xml')
    res.end(feedXml())
  })

  app.get("/filter", (req, res)=>{
    res.set('Content-Type', 'text/plain')
    res.end(fs.readFileSync(path.join(__dirname, 'runjs', 'Lists', 'filter.list'), 'utf8'))
  })

  app.put("/feed", (req, res)=>{
    let data = req.body.data
    switch(req.body.type){
      case "op":
        CONFIG_FEED.enable = data
        clog.notify(`feed 已 ${ data ? '开启' : '关闭' }`)
        res.end(`feed 已 ${ data ? '开启' : '关闭' }`)
        break
      case "clear":
        feedClear()
        clog.notify('feed 已清空')
        res.end('feed 已清空')
        break
      case "ifttt":
        CONFIG_FEED.iftttid = data
        clog.notify(`ifttt webhook 功能已 ${ data ? '开启' : '关闭' }`)
        res.end(`ifttt webhook 功能已 ${ data ? '开启' : '关闭' }`)
        break
      case "merge":
        CONFIG_FEED.ismerge = data.feedmerge
        CONFIG_FEED.mergetime = data.mergetime
        CONFIG_FEED.mergenum = data.mergenum
        clog.notify(`feed 通知已 ${ data.feedmerge ? '合并' : '取消合并' }`)
        res.end(`feed 通知已 ${ data.feedmerge ? '合并' : '取消合并' }`)
        break
      default:{
        res.end('feed put 未知操作')
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
    res.download(homedir + '/.anyproxy/certificates/rootCA.crt')
  })

  app.put("/crt", (req, res)=>{
    let op = req.body.op
    switch(op){
      case 'rootsync':
        if(rootCrtSync()) {
          res.end('已启用 rootCA 文件夹下根证书')
        } else {
          res.end('rootCA 目录下无根证书，请先放置再同步')
        }
        break
      case 'clearcrt':
        clearCrt()
        res.end('其他证书已清除')
        break
      default: {
        res.end("未知操作")
        break
      }
    }
  })

  app.post("/rewritelists", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
      , "保存 rewrite 规则列表")
    if (req.body.subrule || req.body.rewritelists) {
      CONFIG_RULE.subrules = req.body.subrule
      CONFIG_RULE.rewritelists = req.body.rewritelists
      let file = fs.createWriteStream(path.join(__dirname, 'runjs', 'Lists', 'rewrite.list'))
      file.on('error', (err)=>clog.err(err))

      file.write('[sub]\n')
      req.body.subrule.forEach(surl=>{
        file.write("sub " + surl + "\n")
      })
      file.write('\n[rewrite]\n')
      req.body.rewritelists.forEach(v=>{
        file.write(v.join(' ') + '\n')
      })

      // file.on('finish', ()=>{
      //   file.close(()=>{
      //   })
      // })

      file.end()
      res.end(`rewrite 规则列表更新成功`)
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
        res.end(JSON.stringify(CONFIG))
        break
      case "useragent":
        res.end(fs.readFileSync(path.join(__dirname, 'runjs', 'Lists', 'useragent.list'), "utf8"))
        break
      case "rules":
        res.end(JSON.stringify({
          eplists: [...CONFIG_RULE.reqlists, ...CONFIG_RULE.reslists],
          uagent: CONFIG_RULE.uagent
        }))
        break
      case "rewritelists":
        res.end(JSON.stringify({
          rewritelists: CONFIG_RULE.rewritelists,
          subrules: CONFIG_RULE.subrules
        }))
        break
      case "mitmhost":
        res.end(JSON.stringify({
          mitmhost: CONFIG_RULE.mitmhost,
        }))
        break
      case "filter":
        res.end(fs.readFileSync(path.join(__dirname, 'runjs', 'Lists', 'filter.list'), 'utf8'))
        break
      case "todolist":
        res.end(fs.readFileSync(path.join(__dirname, 'Todo.md'), "utf8"))
        break
      case "websk":
        res.end(JSON.stringify({
          webskPort,
          webskPath,
        }))
        break
      case "overview":
        res.end(JSON.stringify({
          proxyPort,
          webifPort,
          ruleslen: CONFIG_RULE.reqlists.length + CONFIG_RULE.reslists.length,
          rewriteslen: CONFIG_RULE.rewritelists.length,
          jslistslen: JSLISTS.length,
          mitmhostlen: CONFIG_RULE.mitmhost.length
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
        Object.assign(CONFIG, req.body.data)
        Object.assign(CONFIG_FEED, CONFIG.CONFIG_FEED)
        fs.writeFileSync(CONFIG.path, JSON.stringify(CONFIG))
        res.end("当前配置 已保存至 " + CONFIG.path)
        break
      case "useragent":
        let oua = JSON.parse(fs.readFileSync(path.join(__dirname, 'runjs', 'Lists', 'useragent.list'), "utf8"))
        oua.enable = req.body.data.enable
        fs.writeFileSync(path.join(__dirname, 'runjs', 'Lists', 'useragent.list'), JSON.stringify(oua))
        res.end(oua.enable?"使用新的 User-Agent: " + oua[oua.enable].name:"取消使用 User-Agent")
        break
      case "gloglevel":
        try {
          CONFIG.gloglevel = req.body.data
          clog.setlevel(CONFIG.gloglevel, true)
          res.end('日志级别设置为：' + CONFIG.gloglevel)
        } catch(e) {
          res.end('日志级别设置失败 ' + e)
        }
        break
      case "rules":
        let fdata = req.body.data.eplists
        fs.writeFileSync(path.join(__dirname, 'runjs', 'Lists', 'default.list'), "# elecV2P rules \n\n" + fdata.join("\n"))

        res.end("规则保存成功")
        CONFIG_RULE.reqlists = []
        CONFIG_RULE.reslists = []
        fdata.forEach(r=>{
          if (/req$/.test(r)) CONFIG_RULE.reqlists.push(r)
          else CONFIG_RULE.reslists.push(r)
        })
        clog.notify(`default 规则 ${ CONFIG_RULE.reqlists.length + CONFIG_RULE.reslists.length} 条`)
        break
      case "mitmhost":
        let mhost = req.body.data
        mhost = mhost.filter(host=>host.length>2)
        fs.writeFileSync(path.join(__dirname, 'runjs', 'Lists', 'mitmhost.list'), "[mitmhost]\n\n" + mhost.join("\n"))
        res.end("保存 mitmhost : " + mhost.length)
        CONFIG_RULE.mitmhost = mhost
        break
      default:{
        res.end("data put error")
      }
    }
  })

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
      let jspath = path.join(__dirname, "runjs/JSFile", jsfn)
      if (fs.existsSync(jspath)) {
        res.end(fs.readFileSync(jspath, "utf8"))
        clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " read file: " + jsfn)
      } else {
        res.end(jsfn + ' 文件不存在')
      }
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
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete js file " + req.body.jsfn)
    let jsfn = req.body.jsfn
    if (jsfn) {
      fs.unlinkSync(path.join(__dirname, "runjs/JSFile", jsfn))
      JSLISTS.splice(JSLISTS.indexOf(jsfn), 1)
    } else {
      clog.error("delete js file error")
    }
    res.end(jsfn + ' is deleted!')
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
      res.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
      fs.readdirSync(path.join(__dirname, 'logs')).forEach(log=>{
        res.write('<a href="/logs/' + log + '" >' + log + '</a><br>')
      })
      res.end()
    }
  })

  app.delete("/logs", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete log file " + req.body.name)
    let name = req.body.name
    if (name == 'all') {
      fs.readdirSync(path.join(__dirname, 'logs')).forEach(file=>{
        clog.info('delete log file:', file)
        fs.unlinkSync(path.join(__dirname, 'logs', file))
      })
      res.end('所有 log 文件已删除')
    } else if(fs.existsSync(path.join(__dirname, 'logs', name))){
      clog.info('delete log file', name)
      fs.unlinkSync(path.join(__dirname, 'logs', name))
      res.end(name + ' 已删除')
    } else {
      res.end('log 文件不存在')
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
  })

  app.use((req, res, next) => {
    res.end("404")
    next()
  })

  return app
}

module.exports = webser