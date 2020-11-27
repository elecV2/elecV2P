const formidable = require('formidable')

const { logger, file, errStack } = require('../utils')
const clog = new logger({ head: 'wbefss' })

const { CONFIG } = require('../config')

const CONFIG_efss = {
  max: 200,        // 最大文件显示数
  deep: -1,        // 显示文件的最大目录深度。-1: 所有子文件夹，0: 不显示，1: 显示1级目录文件。
}

module.exports = app => {
  app.get('/efss', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get efss resource')

    if (CONFIG.efss === false) {
      res.end('efss is closed!')
      return
    }
    const efssF = file.get(CONFIG.efss, 'path')
    if (!file.isExist(efssF)) {
      clog.error('efss folder dont exist')
      res.end(efssF + ' dont exist')
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
    res.write(`
    <meta name="HandheldFriendly" content="True">
    <meta name="MobileOptimized" content="320">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, minimal-ui">
    <title>elecV2P file storage system</title>
    <style>
      .efssa{display:flex;justify-content:space-between;align-items:center;margin:6px 0;padding:6px;border-radius:6px;text-decoration:none;background:#080846;color:#F8F8FF;font-size:18px}.efss_span{font-size:14px;opacity:0}.efssa:hover>.efss_span{opacity:.6}
    </style>`)
    file.aList(efssF, { deep: CONFIG_efss.deep, limit: CONFIG_efss.max }).forEach(fpath=>{
      const spath = fpath.path.replace(efssF, '').slice(1).replace(/\\/g, '/')
      res.write(`<a class='efssa' href='/efss/${ spath }' target='_blank'>${ spath } <span class='efss_span'>${ fpath.size }</span></a>`)
    })
    res.end()
  })

  app.post('/efss', (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "uploading efss file")
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 200 * 1024 * 1024 // 限制为最大 200M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    // uploadfile.uploadDir = file.get(CONFIG.efss, 'path')
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
      const efssF = file.get(CONFIG.efss, 'path')
      if (files.efss.length) {
        files.efss.forEach(sgfile=>{
          clog.notify('upload file:', sgfile.name, 'to efss')
          file.copy(sgfile.path, efssF + '/' + sgfile.name)
        })
      } else {
        clog.notify('upload file:', files.efss.name, 'to efss')
        file.copy(files.efss.path, efssF + '/' + files.efss.name)
      }
      res.end('upload success!')
    })
  })

  app.delete('/efss', (req, res)=>{
    const fn = req.body.fn
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete efss file", fn)
    if (fn) {
      if (file.delete(fn, file.get(CONFIG.efss, 'path'))) {
        res.end(fn + ' is deleted!')
      } else {
        res.end(fn + ' not existed!')
      }
    } else {
      clog.error('a file name is expect!')
      res.end('a parameter fn is expect.')
    }
  })
}