const formidable = require('formidable')

const { logger, errStack, file } = require('../utils')
const clog = new logger({ head: 'wbcrt' })

const { clearCrt, newRootCrt, cacheClear, crt_path, crtHost } = require('../func')

module.exports = app => {
  app.get('/crt', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get rootCA.crt', req.query.type || 'pem')
    switch (req.query.type) {
    case 'p12':
      crt_path.p12
      ? res.download(crt_path.p12)
      : res.json({
          rescode: -1,
          message: 'p12 certificate not exist'
        })
      break
    case 'dot':
      crt_path.dot
      ? res.download(crt_path.dot)
      : res.json({
          rescode: -1,
          message: '.0 certificate not exist'
        })
      break
    default:
      res.download(crt_path.crt)
    }
  })

  app.put('/crt', (req, res)=>{
    let op = req.body.op
    switch(op){
      case 'new':
        newRootCrt(req.body.data).then(({ crtPath })=>{
          res.json({
            rescode: 0,
            message: 'new rootCA generated at: ' + crtPath
          })
        }).catch(error=>{
          res.json({
            rescode: -1,
            message: 'fail to generate new rootCA: ' + errStack(error)
          })
        })
        break
      case 'clearcrt':
        clearCrt()
        res.json({
          rescode: 0,
          message: 'all certificates cleared except rootCA'
        })
        break
      default: {
        res.status(405).json({
          rescode: 405,
          message: 'unknow operation ' + op
        })
      }
    }
  })

  app.post('/crt', (req, res) => {
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'uploading rootCA')
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 2 * 1024 * 1024 //限制为最大2M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error('rootCA upload Error', errStack(err))
        return res.json({
          rescode: -1,
          message: 'rootCA upload fail ' + err.message
        })
      }

      if (!(files['rootCA.crt'] && files['rootCA.key'])) {
        clog.info('no crt file to upload')
        return res.json({
          rescode: -1,
          message: 'root crt files are expect'
        })
      }
      for (const name in files) {
        const sgfile = files[name]
        clog.notify('upload rootCA file:', sgfile.originalFilename)
        file.copy(sgfile.filepath, file.get('rootCA/' + sgfile.originalFilename, 'path'))
      }
      return res.json({
        rescode: 0,
        message: 'upload success'
      })
    })
  })

  app.get('/crt/new/:hostname', (req, res)=>{
    const hostname = encodeURI(req.params.hostname)
    crtHost(hostname).then(root_dir=>{
      res.set('Content-Disposition', `attachment; filename="${hostname}.crt.zip"`)
      const crt_host = `${root_dir}/${hostname}`
      res.end(file.zip([`${crt_host}.crt`, `${crt_host}.key`]))
    }).catch(error=>{
      res.json({
        rescode: -1,
        message: `fail to generate certificate for ${hostname}, error: ${error}`
      })
    })
  })

  app.delete('/tempcaches', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'delete anyproxy temp cache')
    if (cacheClear()) {
      res.json({
        rescode: 0,
        message: 'anyproxy cache deleted'
      })
    } else {
      res.json({
        rescode: -1,
        message: 'fail to delete anyproxy cache'
      })
    }
  })
}