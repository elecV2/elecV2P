const formidable = require('formidable')
const homedir = require('os').homedir()

const { logger, errStack, file } = require('../utils')
const clog = new logger({ head: 'wbcrt' })

const { rootCrtSync, clearCrt, newRootCrt, cacheClear } = require('../func')

module.exports = app => {
  app.get("/crt", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "download rootCA.crt")
    res.download(homedir + '/.anyproxy/certificates/rootCA.crt')
  })

  app.put("/crt", (req, res)=>{
    let op = req.body.op
    switch(op){
      case 'new':
        newRootCrt(req.body.data).then(({ crtPath })=>{
          res.end(JSON.stringify({
            rescode: 0,
            message: 'new rootCA generated at: ' + crtPath
          }))
        }).catch(error=>{
          res.end(JSON.stringify({
            rescode: -1,
            message: 'fail to generate new rootCA: ' + errStack(error)
          }))
        })
        break
      case 'rootsync':
        rootCrtSync().then(()=>{
          res.end(JSON.stringify({
            rescode: 0,
            message: 'success move rootCA.crt/rootCA.key to anyproxy certificates directory'
          }))
        }).catch(e=>{
          res.end(JSON.stringify({
            rescode: 404,
            message: 'rootCA not found\n' + errStack(e)
          }))
        })
        break
      case 'clearcrt':
        clearCrt()
        res.end('all certificates is cleared except rootCA')
        break
      default: {
        res.end("unknow operation " + op)
        break
      }
    }
  })

  app.post('/crt', (req, res) => {
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "uploading rootCA")
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 2 * 1024 * 1024 //限制为最大2M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error('rootCA upload Error', errStack(err))
        return res.end(JSON.stringify({
          rescode: -1,
          message: 'rootCA upload fail ' + err.message
        }))
      }

      if (!files.crt) {
        clog.info('no crt file to upload')
        return res.end(JSON.stringify({
          rescode: 404,
          message: 'no crt file to upload'
        }))
      }
      if (files.crt.length) {
        files.crt.forEach(sgfile=>{
          clog.notify('upload crt file:', sgfile.name)
          file.copy(sgfile.path, file.get('rootCA/' + sgfile.name, 'path'))
        })
      } else {
        clog.notify('upload crt file:', files.crt.name)
        file.copy(files.crt.path, file.get('rootCA/' + files.crt.name, 'path'))
      }
      return res.end(JSON.stringify({
        rescode: 0,
        message: 'upload success'
      }))
    })
  })

  app.delete("/tempcaches", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete anyproxy temp cache")
    if (cacheClear()) {
      res.end(JSON.stringify({
        rescode: 0,
        message: 'anyproxy cache is deleted'
      }))
    } else {
      res.end(JSON.stringify({
        rescode: -1,
        message: 'fail to delete anyproxy cache'
      }))
    }
  })
}