const fs = require('fs')
const path = require('path')
const formidable = require('formidable')

const { logger, bIsUrl, downloadfile } = require('../utils')
const clog = new logger({ head: 'wbjs' })

const { runJSFile, JSLISTS } = require('../runjs')

const { wsSer } = require('../func/websocket')

const CONFIG_JSFILE = {
  path: path.join(__dirname, "../runjs/JSFile"),
}

wsSer.recv.wbrun = fn => {
  runJSFile(fn, { type: 'wbrun' })
}

const wbjs = (app, CONFIG) => {
  app.get("/jsfile", (req, res)=>{
    let jsfn = req.query.jsfn
    if (jsfn) {
      if (fs.existsSync(path.join(CONFIG_JSFILE.path, jsfn))) {
        res.end(fs.readFileSync(path.join(CONFIG_JSFILE.path, jsfn), "utf8"))
        clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " read file: " + jsfn)
      } else {
        res.end(jsfn + ' 文件不存在')
      }
    } else {
      res.end("404")
    }
  })

  app.get("/jsmanage", (req, res)=>{
    res.end(JSON.stringify({
      storemanage: CONFIG.storemanage,
      jslists: JSLISTS,
    }))
  })

  app.get("/runjs", (req, res)=>{
    let fn = req.query.fn
    if (!CONFIG.wbrtoken) {
      res.end('服务器端未设置 token, 无法运行 JS')
      return
    }
    if (req.query.token !== CONFIG.wbrtoken) {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end('token 无效')
    } else if (!/^http(.*)\.js$/.test(fn) && !bIsUrl(fn) && !fs.existsSync(path.join(CONFIG_JSFILE.path, fn))) {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end(fn + ' 不存在')
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
      res.write('<style>li {list-style: none;white-space: pre-wrap;}</style>')
      res.write(`
        <script>
          const wsSer = location.origin.replace('http', 'ws') + '/elecV2P'
          const ws = new WebSocket(wsSer)
          ws.onopen = ()=>{
            ws.send(JSON.stringify({ type: 'ready', data: 'wbrun' }))
            ws.send(JSON.stringify({ type: 'wbrun', data: '${fn}' }))
          }
          ws.onmessage = msg => {
            let data = JSON.parse(msg.data)
            if (data.type === 'wbrun') {
              document.body.insertAdjacentHTML('afterbegin', '<li>' + data.data + '</li>')
            }
          }
          ws.onclose = close => {
            console.error("WebSocket closed", close)
            document.body.insertAdjacentHTML('afterbegin', 'WebSocket closed, 无法获取 JS 运行日志，请在服务器端查看 JS 运行结果')
          }
          ws.onerror = error => {
            console.error('WebSocket error', error)
            document.body.insertAdjacentHTML('afterbegin', 'WebSocket error, 无法获取 JS 运行日志，请在服务器端查看 JS 运行结果')
          }
        </script>
      `)
      res.end()
    }
  })

  app.put("/jsfile", (req, res)=>{
    let op = req.body.op
    switch(op){
      case 'jsdownload':
        downloadfile(req.body.url, path.join(CONFIG_JSFILE.path, req.body.name)).then(jsl=>{
          res.end('文件已下载至：' + jsl)
          if (JSLISTS.indexOf(req.body.name) === -1) JSLISTS.push(req.body.name)
        }).catch(e=>{
          res.end(req.body.name + ' 下载错误!' + e)
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
    if (req.body.jsname == 'totest') {
      let jsres = runJSFile(req.body.jscontent, { type: 'jstest' })
      res.end(typeof(jsres) !== 'string' ? JSON.stringify(jsres) : jsres)
    } else {
      fs.writeFileSync(path.join(CONFIG_JSFILE.path, req.body.jsname), req.body.jscontent)
      clog.notify(`${req.body.jsname} 文件保存成功`)
      res.end(`${req.body.jsname} 文件保存成功`)
      if (JSLISTS.indexOf(req.body.jsname) === -1) JSLISTS.push(req.body.jsname)
    }
  })

  app.delete("/jsfile", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete js file " + req.body.jsfn)
    let jsfn = req.body.jsfn
    if (jsfn) {
      fs.unlinkSync(path.join(CONFIG_JSFILE.path, jsfn))
      JSLISTS.splice(JSLISTS.indexOf(jsfn), 1)
    } else {
      clog.error("delete js file error")
    }
    res.end(jsfn + ' is deleted!')
  })

  app.post('/uploadjs', (req, res) => {
    // js文件上传
    var jsfile = new formidable.IncomingForm()
    jsfile.maxFieldsSize = 2 * 1024 * 1024 //限制为最大2M
    jsfile.keepExtensions = true
    jsfile.multiples = true
    jsfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error('Error', err)
        throw err
      }

      if (files.js.length) {
        files.js.forEach(file=>{
          clog.notify('上传文件：', file.name)
          fs.copyFileSync(file.path, path.join(CONFIG_JSFILE.path, file.name))
          if (JSLISTS.indexOf(file.name) === -1) JSLISTS.push(file.name)
        })
      } else {
        clog.notify('上传文件：', files.js.name)
        fs.copyFileSync(files.js.path, path.join(CONFIG_JSFILE.path, files.js.name))
        if (JSLISTS.indexOf(files.js.name) === -1) JSLISTS.push(files.js.name)
      }
    })
    res.end('js uploaded success!')
  })
}


module.exports = wbjs