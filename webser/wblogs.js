const { logger, LOGFILE, sType, escapeHtml } = require('../utils')
const clog = new logger({ head: 'wblogs' })

module.exports = app => {
  app.get(["/logs", "/logs*"], (req, res)=>{
    let filename = req.originalUrl.split('?')[0].replace(/\/$/, '').replace('/logs/', '')
    if (!filename || filename === '/logs') {
      filename = 'all'
    }
    filename = decodeURI(filename)
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get logs", filename)
    let logs = LOGFILE.get(filename)
    if (!logs) {
      res.writeHead(404, { 'Content-Type': 'text/plain;charset=utf-8' })
      return res.end(JSON.stringify({
        rescode: 404,
        message: `${filename} not exist`
      }))
    }
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
    res.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
    if (sType(logs) === 'array') {
      res.write(`<title>elecV2P LOGS - ${logs.length}</title><style>body{display: flex;flex-wrap: wrap;justify-content: space-between;}.item{height: fit-content;text-decoration: none;border-radius: 10px;padding: 8px 12px;margin: 4px 8px;background: #1890ff;color: white;font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}</style>`)
      if (logs.length === 0) {
        res.write('<div class="item">暂无 LOGS 日志</div>')
      } else {
        logs.forEach(log=>res.write(`<a class='item' href="/logs/${filename !== 'all' ? (filename + '/') : ''}${log}" target="_blank">${log}</a>`))
      }
      res.end()
    } else {
      res.write(`<title>${filename} - elecV2P</title><style>.logs{background:#1890ff;border-radius:10px;color:#fff;font-family:consolas, monospace;font-size:18px;height:fit-content; overflow-wrap:break-word;padding:8px 12px;text-decoration:none; white-space:pre-wrap; word-break:break-word;}</style>`)
      logs.on('open', ()=>{
        res.write(`<div class='logs'>`)
      })
      logs.on('data', (chunk)=>{
        res.write(escapeHtml(chunk.toString()))
      })
      logs.on("close", ()=>{
        res.end(`</div>`)
      })
      logs.on('error', (err)=>{
        res.end(err)
      })
    }
  })

  app.delete("/logs", (req, res)=>{
    const name = req.body.name
    clog.notify(req.headers['x-forwarded-for'] || req.connection.remoteAddress, "delete log file", name)
    if (LOGFILE.delete(name)) {
      res.end(JSON.stringify({
        rescode: 0,
        message: name + ' success deleted'
      }))
    } else {
      res.end(JSON.stringify({
        rescode: 404,
        message: name + ' not exist'
      }))
    }
  })
}