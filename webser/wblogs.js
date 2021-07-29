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
      res.write(`<title>elecV2P LOGS - ${logs.length}</title><style>body{display: flex;flex-wrap: wrap;justify-content: space-between;}.item {height: 40px;border-radius: 10px;padding: 0 0 0 15px;margin: 4px 8px;background: #1890ff;color: white;font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.item_a {padding: 8px 0;color: white;text-decoration: none;}.item_delete {display: inline-flex;justify-content: center;align-items: center;width: 15px;cursor: pointer;opacity: 0;padding: 8px 0;border-radius: 0 10px 10px 0;background-color: red;}.item_delete:hover{opacity: 1;}</style>`)
      if (logs.length === 0) {
        res.write('<div class="item">暂无 LOGS 日志</div>')
      } else {
        logs.forEach(log=>{
          let rflog = `${filename !== 'all' ? (filename + '/') : ''}${log}`
          res.write(`<div class='item'><a class='item_a' href="/logs/${rflog}" target="_blank">${log}</a><span class='item_delete' onclick="logDel('${rflog}', this)">x</span></div>`)
        })
      }
      res.write(`<script type='text/javascript'>function logDel(n,o){confirm("确定删除日志 "+n+"？（不可恢复）")&&fetch("/logs",{method:"delete",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})}).then(e=>e.json()).then(e=>{0===e.rescode?o.parentElement.remove():alert(e.message||e)}).catch(e=>{alert(n+" 删除失败 "+e.message),console.log(e)})}</script>`)
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