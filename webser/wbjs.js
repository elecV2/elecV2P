const formidable = require('formidable')

const { logger, downloadfile, eAxios, errStack, sType, Jsfile, file, wsSer, sbufBody, surlName } = require('../utils')
const clog = new logger({ head: 'wbjsfile', cb: wsSer.send.func('jsmanage') })

const { runJSFile } = require('../script')

module.exports = app => {
  // req.params 方式在多目录下不实用，暂不考虑引入
  app.get('/jsfile', (req, res)=>{
    let jsfn = req.query.jsfn
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get js file', jsfn || 'list')
    if (!jsfn) {
      return res.json(Jsfile.get('list'))
    }
    if (/\.\./.test(jsfn)) {
      return res.json({
        rescode: -1,
        message: 'illegal request to get js file ' + jsfn
      })
    }
    let jscont = Jsfile.get(jsfn)
    if (jscont) {
      res.set('Cache-Control', 'private, no-cache');
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.set('Last-Modified', new Date(Jsfile.get(jsfn, 'date')).toGMTString());
      res.send(jscont)
    } else {
      res.status(404).json({
        rescode: 404,
        message: jsfn + ' not exist'
      })
    }
  })

  app.get('/jsmanage', (req, res)=>{
    // v3.5.4 版本前获取 JS 列表的方式，暂时保留
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get js manage data')
    res.json({
      jslists: Jsfile.get('list')
    })
  })

  app.put('/jsfile', (req, res)=>{
    const op = req.body.op
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), op, req.body.url)
    switch(op){
      case 'jsdownload':
        downloadfile(req.body.url, {
          name: Jsfile.get(req.body.name || surlName(req.body.url), 'path')
        }, d=>{
          clog.info(d.finish || d.progress + '\r')
        }).then(jsl=>{
          res.json({
            rescode: 0,
            message: 'download js file to: ' + jsl
          })
        }).catch(e=>{
          res.json({
            rescode: -1,
            message: `${req.body.name || ''} ${errStack(e)}`.trim()
          })
        })
        break
      default: {
        res.json({
          rescode: -1,
          message: op + ' - wrong operation on js file'
        })
        break
      }
    }
  })

  app.post('/jsfile', (req, res)=>{
    let jsname = req.body.jsname
    let jscontent = req.body.jscontent
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'post', jsname, req.body.type || 'to save')
    if (!jsname) {
      return res.json({
        rescode: -1,
        message: 'a name of js is expect'
      })
    }
    switch (req.body.type) {
    case 'torun':
      runJSFile(jsname, {
        from: 'jsmanage',
        env: { wsid: req.body.id },
        cb: wsSer.send.func('jsmanage', req.body.id),
        timeout: 5000
      }).then(data=>{
        res.send(sbufBody(data))
      }).catch(error=>{
        res.send('error: ' + error)
        clog.error(errStack(error))
      })
      break
    case 'totest':
      runJSFile(jscontent, {
        type: 'rawcode',
        filename: jsname.replace(/\.(js|efh)$/, '-test.$1'),
        from: 'test',
        env: { wsid: req.body.id },
        cb: wsSer.send.func('jsmanage', req.body.id),
        timeout: 5000
      }).then(data=>{
        res.send(sbufBody(data))
      }).catch(error=>{
        res.send('error: ' + error)
        clog.error(errStack(error))
      })
      break
    default:
      if (Jsfile.put(jsname, jscontent)) {
        res.json({
          rescode: 0,
          message: `${jsname} success saved`
        })
      } else {
        res.json({
          rescode: -1,
          message: `${jsname} fail to save`
        })
      }
    }
  })

  app.delete('/jsfile', (req, res)=>{
    const jsfn = req.body.jsfn
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'delete js file ' + jsfn)  // 自动转化 array
    if (jsfn) {
      let bDelist = Jsfile.delete(jsfn)
      if (bDelist) {
        if (sType(bDelist) === 'array') {
          res.json({
            rescode: 0,
            message: bDelist.join(', ') + ' success deleted'
          })
        } else {
          res.json({
            rescode: 0,
            message: jsfn + ' success deleted'
          })
        }
      } else {
        res.json({
          rescode: 404,
          message: jsfn + ' not exist'
        })
      }
    } else {
      clog.error('a js file name is expect')
      res.json({
        rescode: -1,
        message: 'a parameter jsfn is expect'
      })
    }
  })

  app.post('/uploadjs', (req, res) => {
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'uploading JS file')
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 20 * 1024 * 1024 //限制为最大20M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error('upload js Error', errStack(err))
        return res.json({
          rescode: -1,
          message: 'js upload fail ' + err.message
        })
      }

      if (!files.js) {
        clog.info('no js file to upload')
        return res.json({
          rescode: 404,
          message: 'no js file upload'
        })
      }
      if (files.js.length) {
        files.js.forEach(sgfile=>{
          clog.notify('upload js file:', sgfile.name)
          file.copy(sgfile.path, Jsfile.get(sgfile.name, 'path'))
        })
      } else {
        clog.notify('upload js file:', files.js.name)
        file.copy(files.js.path, Jsfile.get(files.js.name, 'path'))
      }
      return res.json({
        rescode: 0,
        message: 'upload success'
      })
    })
  })

  app.put('/mock', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'make mock', req.body.type)
    const request = req.body.request
    switch(req.body.type){
      case 'req':
        eAxios(request).then(response=>{
          clog.notify('mock request response:', response.data)
          res.json({
            rescode: 0,
            message: 'axios request success'
          })
        }).catch(error=>{
          clog.error('mock request', errStack(error))
          res.json({
            rescode: -1,
            message: 'axios request fail, ' + error.message
          })
        })
        break
      case 'js':
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
        Jsfile.put(jsname, jscont)
        res.json({
          rescode: 0,
          message: `success save ${jsname}`
        })
        clog.notify(`success save ${jsname}`)
        break
      default:{
        res.json({
          rescode: -1,
          message: 'wrong mock type'
        })
      }
    }
  })
}