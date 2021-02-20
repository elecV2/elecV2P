const formidable = require('formidable')

const { logger, file, errStack } = require('../utils')
const clog = new logger({ head: 'wbefss' })

const { CONFIG } = require('../config')

const CONFIG_efss = {
  max: 600,        // 最大文件显示数。默认：600，-1 表示不限制
}

module.exports = app => {
  app.get('/sefss', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get efss resource')

    const efssF = file.get(CONFIG.efss.directory, 'path')
    res.end(JSON.stringify({
      config: CONFIG.efss,
      list: CONFIG.efss.enable ? file.aList(efssF, CONFIG_efss.max) : {},
    }))
  })

  app.post('/sefss', (req, res)=>{
    const subpath = decodeURI(req.query.subpath)
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "uploading efss file")
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
    const fn = req.body.fn
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete efss file", fn)
    if (fn) {
      if (file.delete(fn, file.get(CONFIG.efss.directory, 'path'))) {
        res.end(JSON.stringify({
          rescode: 0,
          message: fn + ' is deleted!'
        }))
        clog.info(fn, 'is deleted!')
      } else {
        res.end(JSON.stringify({
          rescode: 404,
          message: fn + ' fail to deleted!'
        }))
        clog.info(fn, 'fail to deleted!')
      }
    } else {
      res.end(JSON.stringify({
        rescode: 100,
        message: 'a parameter fn is expect.'
      }))
      clog.error('a file name is expect.')
    }
  })
}