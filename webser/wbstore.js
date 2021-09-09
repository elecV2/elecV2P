const { logger, store, sString, sJson, wsSer } = require('../utils')
const clog = new logger({ head: 'wbstore', cb: wsSer.send.func('jsmanage'), lever: 'debug' })

module.exports = app => {
  app.get("/store", (req, res) => {
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get store data", req.query.key || 'list')
    if (req.query.key) {
      res.send(sString(store.get(req.query.key, 'raw')))
    } else {
      res.json(store.all())
    }
  })

  app.put("/store", (req, res) => {
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