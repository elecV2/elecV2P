const { logger, store } = require('../utils')
const clog = new logger({ head: 'wbstore' })

module.exports = app => {
  app.get("/store", (req, res) => {
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " get store data")
    res.writeHead(200, { 'Content-Type' : 'text/plain;charset=utf-8' })
    res.end(JSON.stringify(store.all()))
  })

  app.put("/store", (req, res) => {
    let data = req.body.data
    if (!data) {
      res.end('no put data!')
      return
    }
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
      + " put store " + req.body.type)
    switch (req.body.type) {
      case "get":
        res.end(store.get(data))
        break
      case "save":
        if (store.put(data.value, data.key)) {
          clog.notify(`保存 ${ data.key } 值: ${ data.value }`)
          res.end(data.key + ' 已保存')
        } else {
          res.end('保存失败!')
        }
        break
      case "delete":
        if (store.delete(data)) {
          clog.notify(data, 'deleted')
          res.end(data + ' 已删除')
        } else {
          clog.error('delete fail!', e)
          res.end('删除失败' + e.message)
        }
        break
      default:{
        break
      }
    }
  })
}