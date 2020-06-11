const fs = require('fs')
const path = require('path')

const { logger } = require('../utils')
const clog = new logger({ head: 'wbstore' })

const STOREPATH = path.join(__dirname, '../runjs/Store')

module.exports = app=>{
  app.get("/store", (req, res) => {
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " get store data")
    res.writeHead(200, { 'Content-Type' : 'text/plain;charset=utf-8' })
    const store = {}
    fs.readdirSync(STOREPATH).forEach(s=>{
      store[s] = fs.readFileSync(path.join(STOREPATH, s), 'utf8')
    })
    res.end(JSON.stringify(store))
  })

  app.put("/store", (req, res) => {
    let data = req.body.data
    if (!data) {
      res.end('no put data!')
      return
    }
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
      + " put store " + req.body.type)
    switch (req.body.type) {
      case "save":
        if (data.key && data.value) {
          fs.writeFileSync(path.join(STOREPATH, data.key), data.value)
          clog.notify(`保存 ${ data.key } 值: ${ data.value }`)
          res.end(data.key + ' 已保存')
        } else {
          res.end('no data to save!')
        }
        break
      case "delete":
        try {
          fs.unlinkSync(path.join(STOREPATH, data))
          clog.notify(data, 'deleted')
          res.end(data + ' 已删除')
        } catch(e) {
          clog.error('delete fail!', e)
          res.end('delete fail!' + e)
        }
        break
      default:{
        break
      }
    }
  })
}