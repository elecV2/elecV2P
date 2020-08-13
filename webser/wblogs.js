const { logger, LOGFILE } = require('../utils')
const clog = new logger({ head: 'wblogs' })

module.exports = app => {
  app.get("/logs/:filename", (req, res)=>{
    let filename = req.params.filename
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get logs", filename)
    let logs = LOGFILE.get(filename)
    if (logs === undefined) {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end(`404: ${filename} 文件不存在`)
      return
    }
    if (typeof(logs) === 'object') {
      res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
      res.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
      res.write(`<title>elecV2P logs - ${logs.length}</title>`)
      logs.forEach(log=>{
        res.write('<a href="/logs/' + log + '" >' + log + '</a><br>')
      })
      res.end()
    } else {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end(logs)
    }
  })

  app.delete("/logs", (req, res)=>{
    let name = req.body.name
    clog.notify(req.headers['x-forwarded-for'] || req.connection.remoteAddress, "delete log file", name)
    if (LOGFILE.delete(name)) {
      res.end(name + '日志文件删除成功')
    } else {
      res.end(name + '文件不存在')
    }
  })
}