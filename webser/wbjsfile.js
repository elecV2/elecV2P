const fs = require('fs')
const path = require('path')
const formidable = require('formidable')

const { logger } = require('../utils')
const clog = new logger({ head: 'wbjsfile' })

const { jsdownload } = require('../func')
const { runJSFile, JSLISTS } = require('../runjs')

const JSPATH = path.join(__dirname, "../runjs/JSFile")

module.exports = app=>{
  app.get("/jsfile", (req, res)=>{
    let jsfn = req.query.jsfn
    if (jsfn) {
      if (fs.existsSync(path.join(JSPATH, jsfn))) {
        res.end(fs.readFileSync(path.join(JSPATH, jsfn), "utf8"))
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
      fs.writeFileSync(path.join(JSPATH, req.body.jsname), req.body.jscontent)
      clog.notify(`${req.body.jsname} 文件保存成功`)
      res.end(`${req.body.jsname} 文件保存成功`)
    }
  })

  app.delete("/jsfile", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete js file " + req.body.jsfn)
    let jsfn = req.body.jsfn
    if (jsfn) {
      fs.unlinkSync(path.join(JSPATH, jsfn))
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
          fs.copyFileSync(file.path, path.join(JSPATH, file.name))
        })
      } else {
        clog.notify('上传文件：', files.js.name)
        fs.copyFileSync(files.js.path, path.join(JSPATH, files.js.name))
      }
    })
    res.end('js uploaded success!')
  })
}