const formidable = require('formidable')
const { logger, store, sString, sJson, wsSer, file } = require('../utils')
const clog = new logger({ head: 'wbstore', cb: wsSer.send.func('jsmanage'), lever: 'debug' })

module.exports = app => {
  app.get("/store", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get store data', req.query.key || 'list')
    if (req.query.key) {
      res.send(sString(store.get(req.query.key, 'raw')))
    } else {
      res.json(store.all())
    }
  })

  app.get("/store/:key", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get store', req.params.key);
    res.send(sString(store.get(req.params.key, 'raw')));
  })

  app.get("/backup/store", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get store backup');
    res.set('Content-Disposition', 'attachment; filename=elecV2P_store.zip');
    res.set('Content-Transfer-Encoding', 'binary');
    // res.set('Content-Type', 'application/octet-stream');
    res.send(store.backup());
  })

  app.post("/store/backup", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), req.method, 'uploading store backup');
    const uploadfile = new formidable.IncomingForm();
    // uploadfile.maxFieldsSize = 100 * 1024 * 1024; // 限制为最大 100M, 默认 200M
    uploadfile.keepExtensions = true;
    uploadfile.multiples = false;
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error('upload store backup Error', errStack(err));
        return res.json({
          rescode: -1,
          message: 'store backup upload fail ' + err.message
        })
      }

      if (!files.backup) {
        clog.info('no backup file to upload');
        return res.json({
          rescode: 204,
          message: 'no backup file upload'
        })
      }
      clog.notify('upload store backup file:', files.backup.name);
      if (file.unzip(files.backup.path, store.path, { overwrite: true })) {
        return res.json({
          rescode: 0,
          message: 'store backup upload success',
          resdata: store.all()
        })
      } else {
        return res.json({
          rescode: -1,
          message: 'fail to unzip store backup file'
        })
      }
    })
  })

  app.put("/store", (req, res)=>{
    let data = req.body.data
    if (data === undefined) {
      return res.json({
        rescode: -1,
        message: 'a data is expect'
      })
    }
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "put store", req.body.type, data.key || data)
    switch (req.body.type) {
      case "get":
        res.send(store.get(data))
        break
      case "save":
        if (data.key === undefined || data.value === undefined) {
          return res.json({
            rescode: -1,
            message: 'a key and value is expect'
          })
        }
        let value = data.value.value
        delete data.value.value
        let options = data.value
        delete options.update
        if (store.put(value, data.key, options)) {
          clog.debug(`save ${ data.key } value:`, value, 'from wbstore')
          res.json({
            rescode: 0,
            message: data.key + ' saved'
          })
        } else {
          res.json({
            rescode: -1,
            message: data.key + ' fail to save. maybe data length is over limit'
          })
        }
        break
      case "delete":
        if (store.delete(data)) {
          clog.notify(data, 'deleted')
          res.json({
            rescode: 0,
            message: data + ' deleted'
          })
        } else {
          clog.error('delete fail')
          res.json({
            rescode: -1,
            message: 'delete fail'
          })
        }
        break
      default:{
        res.json({
          rescode: -1,
          message: 'unexpect type ' + req.body.type
        })
      }
    }
  })
}