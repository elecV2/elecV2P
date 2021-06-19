const formidable = require('formidable')

const { logger, file, sType, sString, errStack } = require('../utils')
const clog = new logger({ head: 'wbefss', level: 'debug' })

const { CONFIG } = require('../config')
const { runJSFile } = require('../script')

const CONFIG_efss = {
  enable: true,            // 默认开启。关闭： false
  directory: './efss',     // 文件存储位置
  dotshow: {
    enable: false,         // 显示 dot(.) 开头文件
  },
  max: 600,                // 最大文件显示数。默认：600，-1 表示不限制
}

CONFIG.efss = Object.assign(CONFIG_efss, CONFIG.efss)

function favend(req, res, next) {
  // efss favorite and backend(待完成)
  if (!req.params.favend) {
    next()
  }
  clog.debug('efss favend', req.params.favend)
  let fend = CONFIG.efss.favend && CONFIG.efss.favend[req.params.favend]
  if (fend && fend.enable !== false) {
    switch(fend.type) {
    case 'runjs':
      let $response = {
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        }
      }
      runJSFile(fend.target, {
        $request: {
          protocol: req.protocol,
          headers: req.headers,
          method: req.method,
          hostname: req.hostname,
          path: req.path,
          url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          body: req.method === 'GET' ? req.query : req.body,
          key: req.params.favend
        },
        from: `efss/${req.params.favend}`
      }).then(jsres=>{
        if (sType(jsres) === 'object') {
          Object.assign($response, jsres.response || jsres)
        } else {
          $response.body = sString(jsres)
        }
      }).catch(e=>{
        $response.body += '\nerror on run js' + fend.target + errStack(e)
        clog.error('error on run js', fend.target, errStack(e))
      }).finally(()=>{
        res.writeHead(200, $response.headers || {'Content-Type': 'text/plain;charset=utf-8'})
        res.end($response.body)
      })
      break
    default:
      res.end(`unknow favend type ${fend.type}`)
    }
    return
  }
  clog.debug('efss favend match none, skip')
  next()
}

module.exports = app => {
  app.get("/efss/:favend*", favend)
  app.put("/efss/:favend*", favend)
  app.post("/efss/:favend*", favend)

  app.get('/sefss', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get efss resource')

    const efssF = file.get(CONFIG.efss.directory, 'path')
    res.end(JSON.stringify({
      config: CONFIG.efss,
      list: CONFIG.efss.enable ? file.aList(efssF, { max: CONFIG.efss.max, dot: CONFIG.efss.dotshow.enable, skip: CONFIG.efss.skip }) : {},
    }))
  })

  app.post('/sefss', (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "uploading efss file")

    if (!(CONFIG.efss && CONFIG.efss.enable)) {
      res.end({
        rescode: 403,
        message: 'efss is closed.'
      })
      return
    }
    const subpath = decodeURI(req.query.subpath || '')
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 200 * 1024 * 1024 // 限制为最大 200M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    // uploadfile.uploadDir = file.get(CONFIG.efss.directory, 'path')
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error(errStack(err, true))
        res.end('efss upload fail!' + err.message)
        return
      }

      if (!files.efss) {
        clog.info('no efss file to upload.')
        res.end('a file is expect.')
        return
      }
      const efssF = file.get(CONFIG.efss.directory + subpath, 'path')
      if (!file.isExist(efssF)) {
        clog.error('efss folder:', efssF, 'dont exist')
        res.end(efssF + ' dont exist')
        return
      }
      if (files.efss.length) {
        files.efss.forEach(sgfile=>{
          clog.notify('upload file:', sgfile.name, 'to efss')
          file.copy(sgfile.path, efssF + '/' + sgfile.name)
        })
      } else if (files.efss.name) {
        clog.notify('upload a file:', files.efss.name, 'to efss')
        file.copy(files.efss.path, efssF + '/' + files.efss.name)
      }
      res.end('upload success!')
    })
  })

  app.delete('/sefss', (req, res)=>{
    if (!(CONFIG.efss && CONFIG.efss.enable)) {
      res.end({
        rescode: 403,
        message: 'efss is closed.'
      })
      return
    }

    let fn = req.body.fn
    fn = fn.replace(/^\//, '')
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'delete efss file', fn)
    if (fn) {
      let fpath = file.get(CONFIG.efss.directory + '/' + fn, 'path')
      if (file.delete(fpath)) {
        res.end(JSON.stringify({
          rescode: 0,
          message: fpath + ' is deleted'
        }))
        clog.info(fpath, 'is deleted')
      } else {
        res.end(JSON.stringify({
          rescode: 404,
          message: fpath + ' fail to deleted'
        }))
        clog.info(fpath, 'fail to deleted')
      }
    } else {
      res.end(JSON.stringify({
        rescode: 100,
        message: 'a parameter fn is expect'
      }))
      clog.error('efss delete file error: a file name is expect')
    }
  })
}