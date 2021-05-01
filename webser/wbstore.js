const { logger, store, sString, sJson, wsSer } = require('../utils')
const clog = new logger({ head: 'wbstore', cb: wsSer.send.func('jsmanage'), lever: 'debug' })

module.exports = app => {
  app.get("/store", (req, res) => {
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " get store data", req.query.key)
    res.writeHead(200, { 'Content-Type' : 'text/plain;charset=utf-8' })
    if (req.query.key) {
      res.end(sString(store.get(req.query.key, 'raw')))
    } else {
      res.end(JSON.stringify(store.all()))
    }
  })

  app.put("/store", (req, res) => {
    let data = req.body.data
    if (data === undefined) {
      res.end('no put data!')
      return
    }
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
      + " put store " + req.body.type, data.key)
    switch (req.body.type) {
      case "get":
        res.end(store.get(data))
        break
      case "save":
        if (data.key === undefined || data.value === undefined) {
          res.end('no key or value')
          return
        }
        let value = data.value.value
        delete data.value.value
        let options = data.value
        if (store.put(value, data.key, options)) {
          clog.debug(`save ${ data.key } value:`, value, 'from wbstore')
          res.end(JSON.stringify({
            rescode: 0,
            message: data.key + ' saved'
          }))
        } else {
          res.end(JSON.stringify({
            rescode: -1,
            message: data.key + ' fail to save. maybe data length is over limit'
          }))
        }
        break
      case "delete":
        if (store.delete(data)) {
          clog.notify(data, 'deleted')
          res.end(JSON.stringify({
            rescode: 0,
            message: data + ' deleted'
          }))
        } else {
          clog.error('delete fail')
          res.end(JSON.stringify({
            rescode: -1,
            message: 'delete fail'
          }))
        }
        break
      default:{
        break
      }
    }
  })
}