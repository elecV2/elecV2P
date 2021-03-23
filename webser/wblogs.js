const { logger, LOGFILE, sType, escapeHtml } = require('../utils')
const clog = new logger({ head: 'wblogs' })

module.exports = app => {
  app.get("/logs/:filename?", (req, res)=>{
    const filename = req.params.filename || 'all'
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get logs", filename)
    const logs = LOGFILE.get(filename)
    if (!logs) {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      logs === undefined 
      ? res.end(`404: ${filename} don't exist`)
      : res.end(`${filename} don't have any content.`)
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
    res.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
    if (sType(logs) === 'array') {
      res.write(`<title>elecV2P LOGS - ${logs.length}</title><style>body{display: flex;flex-wrap: wrap;justify-content: space-between;}.item{height: fit-content;text-decoration: none;border-radius: 10px;padding: 8px 12px;margin: 4px 8px;background: #1890ff;color: white;font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}</style>`)
      if (logs.length === 0) {
        res.write('<div class="item">暂无 LOGS 日志</div>')
      } else {
        logs.forEach(log=>res.write(`<a class='item' href="/logs/${log}">${log}</a>`))
      }
      res.end()
    } else {
      res.write(`<title>${filename} - elecV2P</title><style>.logs{background:#1890ff;border-radius:10px;color:#fff;font-family:consolas, monospace;font-size:18px;height:fit-content; overflow-wrap:break-word;padding:8px 12px;text-decoration:none; white-space:pre-wrap; word-break:break-word;}</style>`)
      res.end(`<div class='logs'>${escapeHtml(logs)}</div>`)
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