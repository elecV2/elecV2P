const { logger, LOGFILE, sType } = require('../utils')
const clog = new logger({ head: 'wblogs' })

module.exports = app => {
  app.get("/logs/:filename", (req, res)=>{
    const filename = req.params.filename
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get logs", filename)
    const logs = LOGFILE.get(filename)
    if (!logs) {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end(`404: ${filename} don't exist`)
      return
    }
    if (sType(logs) === 'array') {
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
    const name = req.body.name
    clog.notify(req.headers['x-forwarded-for'] || req.connection.remoteAddress, "delete log file", name)
    if (LOGFILE.delete(name)) {
      res.end(name + ' success deleted!')
    } else {
      res.end(name + ' don\'t exist')
    }
  })
}