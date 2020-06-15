const fs = require('fs')
const path = require('path')

const { logger } = require('../utils')
const clog = new logger({ head: 'wblogs' })

const LOGSPATH = path.join(__dirname, '../logs')

module.exports = app=>{
  app.get("/logs/:filename", (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress) + " get logs")
    let filename = req.params.filename
    if (filename === 'all') {
      res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
      res.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
      let logs = fs.readdirSync(LOGSPATH)
      res.write(`<title>elecV2P logs - ${logs.length}</title>`)
      logs.forEach(log=>{
        res.write('<a href="/logs/' + log + '" >' + log + '</a><br>')
      })
      res.end()
    } else if (fs.existsSync(path.join(LOGSPATH, filename))) {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end(fs.readFileSync(path.join(LOGSPATH, filename), "utf8"))
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end(`404: ${filename} 文件不存在`)
    }
  })

  app.delete("/logs", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete log file " + req.body.name)
    let name = req.body.name
    if (name == 'all') {
      fs.readdirSync(LOGSPATH).forEach(file=>{
        clog.info('delete log file:', file)
        fs.unlinkSync(path.join(LOGSPATH, file))
      })
      res.end('所有 log 文件已删除')
    } else if(fs.existsSync(path.join(LOGSPATH, name))){
      clog.info('delete log file', name)
      fs.unlinkSync(path.join(LOGSPATH, name))
      res.end(name + ' 已删除')
    } else {
      res.end('log 文件不存在')
    }
  })
}