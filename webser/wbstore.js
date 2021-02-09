const { logger, store, sJson, wsSer } = require('../utils')
const clog = new logger({ head: 'wbstore', cb: wsSer.send.func('jsmanage'), lever: 'debug' })

module.exports = app => {
  app.get("/store", (req, res) => {
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " get store data", req.query.key)
    res.writeHead(200, { 'Content-Type' : 'text/plain;charset=utf-8' })
    if (req.query.key) {
      res.end(store.get(req.query.key, 'raw'))
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
        } else {
          const key = data.key
          const value = data.value
          let finalval = ''
          switch (value.type) {
            case 'number':
              finalval = Number(value.value)
              break
            case 'boolean':
              finalval = Boolean(value.value)
              break
            case 'array':
            case 'object':
              finalval = sJson(value.value)
              break
            default:{
              finalval = value.value === undefined ? value : value.value
              if (typeof finalval === 'object') finalval = JSON.stringify(finalval)
            }
          }
          store.put(finalval, key, value.type)
          clog.debug(`save ${ data.key } value: `, finalval)
          res.end(data.key + ' saved')
        }
        break
      case "delete":
        if (store.delete(data)) {
          clog.notify(data, 'deleted')
          res.end(data + ' deleted')
        } else {
          clog.error('delete fail!', e)
          res.end('delete fail' + e.message)
        }
        break
      default:{
        break
      }
    }
  })
}