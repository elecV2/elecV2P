const { logger, LOGFILE, sType, escapeHtml } = require('../utils')
const clog = new logger({ head: 'wblogs' })

const { CONFIG } = require('../config')

let LOGS_LIST_CACHE = LOGFILE.get('all')

module.exports = app => {
  app.get(["/logs", "/logs*"], (req, res)=>{
    let filename = req.originalUrl.split('?')[0].replace(/\/$/, '').replace('/logs/', '')
    if (!filename || filename === '/logs') {
      filename = 'all'
    } else {
      filename = decodeURI(filename)
    }
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get logs", filename)
    let logs = LOGFILE.get(filename)
    if (!logs) {
      return res.status(404).json({
        rescode: 404,
        message: `${filename} not exist`
      })
    }
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
    let mainbk = '#2890EE', appbk = 'var(--main-fc)', style = ''
    if (CONFIG.webUI?.theme?.simple?.enable) {
      mainbk = CONFIG.webUI.theme.simple.mainbk || '#2890EE'
      appbk  = CONFIG.webUI.theme.simple.appbk  || 'var(--main-fc)'
      style  = CONFIG.webUI.theme.simple.style  || ''
    }
    res.write(`<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><meta name="theme-color" content="${mainbk}"><link rel="apple-touch-icon" href="/efss/logo/elecV2P.png">`)
    if (sType(logs) === 'array') {
      res.write(`<title>elecV2P LOGS - ${logs.length}</title><style>:root {--main-bk: ${ mainbk };--main-fc: #FAFAFD;--delt-bk: #FF2828;}body{margin: 0;padding: 0;}#app{padding: 3px 8px;box-sizing: border-box;min-height: 100vh;background: ${appbk}}.logs{padding: 0;margin: 0;margin-bottom: 5em;display: flex;flex-wrap: wrap;justify-content: space-between;}.logs_item {height: 40px;display: inline-flex;align-items: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0 0 0 15px;margin: 4px 0;white-space: pre;overflow: auto hidden;background: var(--main-bk);color: var(--main-fc);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.logs_a {color: var(--main-fc);text-decoration: none;}.logs_delete {width: 1em;text-align: center;cursor: pointer;opacity: 0;border-radius: 0 10px 10px 0;background-color: var(--delt-bk);}.logs_delete:hover{opacity: 1;}${style}.logsnav{position: fixed;bottom: .8em;left: 0;width: 100%;padding: 0;margin: 0;display: flex;flex-wrap: wrap;justify-content: space-between;}.logsnav_item{height: 40px;display: inline-flex;align-items: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0 1em;margin: 4px 8px;white-space: pre;overflow: auto hidden;background: var(--main-fc);color: var(--main-bk);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.logsnav_a{color: var(--main-bk);text-decoration: none;}</style></head><body><div id='app'>`)
      if (logs.length === 0) {
        res.write('<div class="logs_item"><span>暂无 LOGS 日志</span><span class="logs_delete"></span></div>')
      } else {
        res.write('<ul class="logs">')
        let rflog = filename !== 'all' ? (filename + '/') : ''
        logs.forEach(log=>{
          res.write(`<li class='logs_item'><a class='logs_a' href="/logs/${rflog}${log}">${log}</a><span class='logs_delete' data-name='${rflog}${log}'>x</span></li>`)
        })
        res.write(`</ul><script type='text/javascript'>document.querySelector(".logs").addEventListener("click",t=>{let n=t.target.dataset.name;n&&confirm("确定删除日志 "+n+"？（不可恢复）")&&fetch("/logs",{method:"delete",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})}).then(e=>e.json()).then(e=>{0===e.rescode?t.target.parentElement.remove():alert(e.message||e)}).catch(e=>{alert(n+" 删除失败 "+e.message),console.log(e)})});</script>`)
      }
      res.end('<ul class="logsnav"><li class="logsnav_item"><a class="logsnav_a" href="/">HOME</a></li></ul></div></body>')
      if (filename === 'all') {
        LOGS_LIST_CACHE = logs
      }
    } else {
      res.write(`<title>${filename} - elecV2P</title><style>:root {--main-bk: ${ mainbk };--main-fc: #FAFAFD;scroll-behavior: smooth;}body{margin: 0;padding: 0;}#app{padding: 3px 8px;box-sizing: border-box;min-height: 100vh;background: ${appbk}}.logs{background:var(--main-bk);border-radius:10px;color:var(--main-fc);font-family:consolas, monospace;font-size:18px;height:fit-content; overflow-wrap:break-word;margin-bottom: 5em;padding:8px 12px;text-decoration:none; white-space:pre-wrap; word-break:break-word;}.logsnav{position: fixed;bottom: .8em;left: 0;width: 100%;padding: 0;margin: 0;display: flex;flex-wrap: wrap;justify-content: space-between;}.logsnav_item{height: 40px;display: inline-flex;align-items: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0 1em;margin: 4px 8px;white-space: pre;overflow: auto hidden;background: var(--main-fc);color: var(--main-bk);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.logsnav_a{color: var(--main-bk);text-decoration: none;}</style></head><body><div id='app'>`)
      logs.on('open', ()=>{
        res.write(`<div class='logs'>`)
      })
      logs.on('data', (chunk)=>{
        res.write(escapeHtml(chunk.toString()))
      })
      logs.on('close', ()=>{
        res.write('</div><div id="bottom"></div><ul class="logsnav"><li class="logsnav_item"><a class="logsnav_a" href="/logs/">LOGS</a></li><li class="logsnav_item" title="Go to top"><a class="logsnav_a" href="#" target="_self">▲</a></li><li class="logsnav_item" title="Go to bottom"><a class="logsnav_a" href="#bottom" target="_self">▼</a></li>')
        let logs_idx = LOGS_LIST_CACHE.indexOf(filename)
        let last_idx = LOGS_LIST_CACHE.length - 1
        ;[LOGS_LIST_CACHE[logs_idx === 0 ? last_idx : logs_idx-1], LOGS_LIST_CACHE[logs_idx === last_idx ? 0 : logs_idx+1]].forEach(log=>{
          if (log) {
            res.write(`<li class="logsnav_item"><a class="logsnav_a" href="/logs/${log}">${log}</a></li>`)
          }
        })
        res.end(`</ul></div></body>`)
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