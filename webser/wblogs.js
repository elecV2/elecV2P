const { logger, LOGFILE, sType, escapeHtml } = require('../utils')
const clog = new logger({ head: 'wblogs' })

const { CONFIG } = require('../config')

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
      return res.status(404).json({
        rescode: 404,
        message: `${filename} not exist`
      })
    }
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
    res.write('<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><link rel="apple-touch-icon" href="/efss/logo/elecV2P.png">')
    let mainbk = '#2890EE', appbk = 'var(--main-fc)', style = ''
    if (CONFIG.webUI?.theme?.simple?.enable) {
      mainbk = CONFIG.webUI.theme.simple.mainbk || '#2890EE'
      appbk  = CONFIG.webUI.theme.simple.appbk  || 'var(--main-fc)'
      style  = CONFIG.webUI.theme.simple.style  || ''
    }
    if (sType(logs) === 'array') {
      res.write(`<title>elecV2P LOGS - ${logs.length}</title><style>:root {--main-bk: ${ mainbk };--main-fc: #FAFAFD;--delt-bk: #FF2828;}body{margin: 0;padding: 0;}#app{min-height: 100vh;background: ${appbk}}.logs{padding: 0;margin: 0;display: flex;flex-wrap: wrap;justify-content: space-between;}.logs_item {height: 40px;display: inline-flex;align-items: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0 0 0 15px;margin: 4px 8px;background: var(--main-bk);color: var(--main-fc);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.logs_a {color: var(--main-fc);text-decoration: none;}.logs_delete {width: 1em;text-align: center;cursor: pointer;opacity: 0;border-radius: 0 10px 10px 0;background-color: var(--delt-bk);}.logs_delete:hover{opacity: 1;}${style}</style></head><body><div id='app'>`)
      if (logs.length === 0) {
        res.write('<div class="logs_item"><span>暂无 LOGS 日志</span><span class="logs_delete"></span></div>')
      } else {
        res.write('<ul class="logs">')
        logs.forEach(log=>{
          let rflog = `${filename !== 'all' ? (filename + '/') : ''}${log}`
          res.write(`<li class='logs_item'><a class='logs_a' href="/logs/${rflog}" target="_blank">${log}</a><span class='logs_delete' data-name='${rflog}'>x</span></li>`)
        })
        res.write(`</ul><script type='text/javascript'>document.querySelector(".logs").addEventListener("click",t=>{let n=t.target.dataset.name;n&&confirm("确定删除日志 "+n+"？（不可恢复）")&&fetch("/logs",{method:"delete",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})}).then(e=>e.json()).then(e=>{0===e.rescode?t.target.parentElement.remove():alert(e.message||e)}).catch(e=>{alert(n+" 删除失败 "+e.message),console.log(e)})});</script>`)
      }
      res.end('</div></body>')
    } else {
      res.write(`<title>${filename} - elecV2P</title><style>:root {--main-bk: ${ mainbk };--main-fc: #FAFAFD;}body{margin: 0;padding: 0;}#app{padding: 3px 8px;box-sizing: border-box;min-height: 100vh;background: ${appbk}}.logs{background:var(--main-bk);border-radius:10px;color:var(--main-fc);font-family:consolas, monospace;font-size:18px;height:fit-content; overflow-wrap:break-word;padding:8px 12px;text-decoration:none; white-space:pre-wrap; word-break:break-word;}</style></head><body><div id='app'>`)
      logs.on('open', ()=>{
        res.write(`<div class='logs'>`)
      })
      logs.on('data', (chunk)=>{
        res.write(escapeHtml(chunk.toString()))
      })
      logs.on('close', ()=>{
        res.end('</div></div></body>')
      })
      logs.on('error', (err)=>{
        res.end(err)
      })
    }
  })

  app.delete("/logs", (req, res)=>{
    // 二级/多级目录问题 暂不可用 req.params
    const name = req.body.name
    clog.notify(req.headers['x-forwarded-for'] || req.connection.remoteAddress, 'delete log file', name)
    if (LOGFILE.delete(name)) {
      res.json({
        rescode: 0,
        message: name + ' success deleted'
      })
    } else {
      res.json({
        rescode: 404,
        message: name + ' not exist'
      })
    }
  })
}