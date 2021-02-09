const formidable = require('formidable')

const { logger, downloadfile, eAxios, errStack, sString, sType, jsfile, file, wsSer } = require('../utils')
const clog = new logger({ head: 'wbjsfile', cb: wsSer.send.func('jsmanage') })

const { runJSFile, JSLISTS, CONFIG_RUNJS } = require('../script')

module.exports = app => {
  app.get("/jsfile", (req, res)=>{
    const jsfn = req.query.jsfn
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get js file", jsfn)
    if (!jsfn || /\.\./.test(jsfn)) {
      res.end('illegal request to get js file' + jsfn)
      return
    }
    const jscont = jsfile.get(jsfn)
    if (jscont) {
      res.end(jscont)
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end('404 ' + jsfn + ' don\'t exist')
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
      res.end('RUNJS config changed')
    } catch {
      res.end('fail to change RUNJS config')
    }
  })

  app.put("/jsfile", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "put js file")
    const op = req.body.op
    switch(op){
      case 'jsdownload':
        downloadfile(req.body.url, jsfile.get(req.body.name, 'path')).then(jsl=>{
          res.end('download js file to: ' + jsl)
          if (JSLISTS.indexOf(req.body.name) === -1) JSLISTS.push(req.body.name)
        }).catch(e=>{
          res.end(req.body.name + ' download error!' + errStack(e))
        })
        break
      default: {
        res.end(op + " - wrong operation on js file")
        break
      }
    }
  })

  app.post("/jsfile", (req, res)=>{
    let jsname = req.body.jsname
    let jscontent = req.body.jscontent
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "post js file", jsname)
    if (!(jsname && jscontent)) {
      res.end("have no jsname or content")
      return
    }
    if (req.body.type === 'totest') {
      const jsres = runJSFile(req.body.jscontent, { type: 'rawcode', from: jsname.split('.js')[0] + '-test.js', cb: wsSer.send.func('jsmanage') })
      if (sType(jsres) === 'promise') {
        jsres.then(data=>{
          res.end(sString(data))
        }).catch(error=>{
          res.end('error: ' + error)
          clog.error(errStack(error))
        })
      } else {
        res.end(sString(jsres))
      }
    } else {
      jsfile.put(jsname, req.body.jscontent)
      clog.notify(`${jsname} success saved`)
      res.end(`${jsname} success saved`)
      if (JSLISTS.indexOf(jsname) === -1) JSLISTS.push(jsname)
    }
  })

  app.delete("/jsfile", (req, res)=>{
    const jsfn = req.body.jsfn
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete js file " + jsfn)
    if (jsfn) {
      if (jsfile.delete(jsfn)) {
        JSLISTS.splice(JSLISTS.indexOf(jsfn), 1)
        res.end(jsfn + ' is deleted!')
      } else {
        res.end(jsfn + ' not existed!')
      }
    } else {
      clog.error('a js file name is expect!')
      res.end('a parameter jsfn is expect.')
    }
  })

  app.post('/uploadjs', (req, res) => {
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "uploading JS file")
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 20 * 1024 * 1024 //限制为最大20M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error('Error', errStack(err))
        res.end('js upload fail!' + err.message)
        return
      }

      if (!files.js) {
        clog.info('no js file to upload')
        return
      }
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
    res.end('upload success!')
  })

  app.put('/mock', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'make mock', req.body.type)
    const request = req.body.request
    switch(req.body.type){
      case "req":
        eAxios(request).then(response=>{
          clog.notify('mock request response:', response.data)
          res.end('success!')
        }).catch(error=>{
          clog.error('mock request error:', errStack(error))
          res.end('fail! ' + error.message)
        })
        break
      case "js":
        let jsname = req.body.jsname
        if (jsname) {
          if (!/\.js$/.test(jsname)) jsname = jsname + '.js'
        } else {
          jsname = 'elecV2Pmock.js'
        }
        const jscont = `/**
 * mock JS from elecV2P - ${jsname}
**/

const request = ${ JSON.stringify(request, null, 2) }

$axios(request).then(res=>{
  console.log(res.data)
}).catch(e=>{
  console.error(e)
})`
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