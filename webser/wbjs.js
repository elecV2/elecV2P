const formidable = require('formidable')

const { wsSer } = require('../func/websocket')

const { logger, downloadfile, eAxios, errStack, jsfile, file } = require('../utils')
const clog = new logger({ head: 'wbjsfile', cb: wsSer.send.func('jsmanage') })

const { runJSFile, JSLISTS, CONFIG_RUNJS } = require('../script')

module.exports = app => {
  app.get("/jsfile", (req, res)=>{
    const jsfn = req.query.jsfn
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get js file", jsfn)
    if (/\.\./.test(jsfn)) {
      res.end('非法目录请求')
      return
    }
    const jscont = jsfile.get(jsfn)
    if (jscont) {
      res.end(jscont)
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end('404 ' + jsfn + ' 文件不存在')
    }
  })

  app.get("/jsmanage", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get js manage data")
    res.end(JSON.stringify({
      storemanage: true,
      jslists: Object.assign(JSLISTS, jsfile.get('list'))
    }))
  })

  app.put("/runjsconfig", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "put runjsconfig")
    try {
      Object.assign(CONFIG_RUNJS, req.body.data)
      res.end(`RUNJS 相关设置修改成功`)
    } catch {
      res.end('RUNJS 相关设置修改失败')
    }
  })

  app.put("/jsfile", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "put js file")
    const op = req.body.op
    switch(op){
      case 'jsdownload':
        downloadfile(req.body.url, jsfile.get(req.body.name, 'path')).then(jsl=>{
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
    let jsname = req.body.jsname
    let jscontent = req.body.jscontent
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "post js file", jsname)
    if (!(jsname || jscontent)) {
      res.end("have no jsname or content")
      return
    }
    if (jsname === 'totest') {
      const jsres = runJSFile(req.body.jscontent, { type: 'jstest', cb: wsSer.send.func('jsmanage') })
      if (jsres && typeof(jsres.then) === 'function') {
        jsres.then(data=>{
          res.end(typeof(data) === 'object' ? JSON.stringify(data) : data)
        }).catch(error=>{
          res.end('error: ' + error)
        })
      } else {
        res.end(typeof(jsres) === 'object' ? JSON.stringify(jsres) : jsres)
      }
    } else {
      jsfile.put(jsname, req.body.jscontent)
      clog.notify(`${jsname} 文件保存成功`)
      res.end(`${jsname} 文件保存成功`)
      if (JSLISTS.indexOf(jsname) === -1) JSLISTS.push(jsname)
    }
  })

  app.delete("/jsfile", (req, res)=>{
    const jsfn = req.body.jsfn
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete js file " + jsfn)
    if (jsfn) {
      jsfile.delete(jsfn)
      JSLISTS.splice(JSLISTS.indexOf(jsfn), 1)
    } else {
      clog.error("delete js file error")
    }
    res.end(jsfn + ' is deleted!')
  })

  app.post('/uploadjs', (req, res) => {
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "正在上传 JS 文件")
    // js文件上传
    var uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 2 * 1024 * 1024 //限制为最大2M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error('Error', errStack(err))
        res.end('js upload fail!' + err.message)
        return
      }

      if (!files.js) return
      if (files.js.length) {
        files.js.forEach(sgfile=>{
          clog.notify('upload js file:', sgfile.name)
          file.copy(sgfile.path, jsfile.get(sgfile.name, 'path'))
          if (JSLISTS.indexOf(sgfile.name) === -1) JSLISTS.push(sgfile.name)
        })
      } else {
        clog.notify('upload js file:', files.js.name)
        file.copy(files.js.path, jsfile.get(files.js.name, 'path'))
        if (JSLISTS.indexOf(files.js.name) === -1) JSLISTS.push(files.js.name)
      }
    })
    res.end('success!')
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