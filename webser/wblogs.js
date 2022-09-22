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
      res.write(`<title>elecV2P LOGS - ${logs.length}</title><style>:root {--main-bk: ${ mainbk };--main-fc: #FAFAFD;--delt-bk: #FF2828;}body{margin: 0;padding: 0;height: 100vh;}#app{padding: 3px 8px;box-sizing: border-box;min-height: 100vh;background: ${appbk}}.logs{padding: 0;margin: 0;margin-bottom: 5em;display: flex;flex-wrap: wrap;justify-content: space-between;gap: 0 .5em;}.logs_item {height: 40px;display: inline-flex;align-items: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0 0 0 15px;margin: 4px 0;white-space: pre;overflow: auto hidden;background: var(--main-bk);color: var(--main-fc);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.logs_a {color: var(--main-fc);text-decoration: none;}.logs_delete {width: 1em;text-align: center;cursor: pointer;opacity: 0;border-radius: 0 10px 10px 0;background-color: var(--delt-bk);}.logs_delete:hover{opacity: 1;}${style}.logsnav{position: fixed;bottom: .8em;left: 0;width: 100%;padding: 0;margin: 0;display: flex;flex-wrap: wrap;justify-content: space-between;}.logsnav_item{height: 40px;display: inline-flex;align-items: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0 1em;margin: 4px 8px;white-space: pre;overflow: auto hidden;background: var(--main-fc);color: var(--main-bk);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.logsnav_a{color: var(--main-bk);text-decoration: none;}</style></head><body><div id='app'>`)
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
      res.end('<ul class="logsnav"><li class="logsnav_item"><a class="logsnav_a" href="/">HOME</a></li><li class="logsnav_item"><a class="logsnav_a" href="/efss/">EFSS</a></li></ul></div></body>')
      if (filename === 'all') {
        LOGS_LIST_CACHE = logs
      }
    } else {
      res.write(`<title>${filename} - elecV2P</title><style>:root {--main-bk: ${ mainbk };--main-fc: #FAFAFD;--delt-bk: #FF2828;--main-cl: #2890EE;scroll-behavior: smooth;}body{margin: 0;padding: 0;height: 100vh;}#app{padding: 3px 8px;box-sizing: border-box;min-height: 100vh;background: ${appbk}}.logs{background:var(--main-bk);border-radius:10px;color:var(--main-fc);font-family:consolas, monospace;font-size:18px;height:fit-content; overflow-wrap:break-word;margin-bottom: 208px;padding:8px 12px;text-decoration:none; white-space:pre-wrap; word-break:break-word;}.logsnav{position: fixed;bottom: 0.8em;left: 8px;width: calc(100% - 16px);padding: 0;margin: 0;display: flex;border: 4px solid var(--main-fc);border-radius: 10px;box-sizing: border-box;}.logslist, .logsbtn{display: inline-flex;list-style: none;padding: 0;margin: 0;height: 176px;overflow-y: auto;flex-wrap: wrap;justify-content: space-between;background: var(--main-fc);scroll-behavior: smooth;}.logsnav_item,.logsbtn_item{height: 40px;display: inline-flex;align-items: center;justify-content: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0 1em;margin: 2px 6px;white-space: pre;overflow: auto hidden;background: var(--main-bk);color: var(--main-fc);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;cursor: pointer;}.logsnav_item--curt{background-color: var(--main-cl);}.logsbtn {width: 66px;min-width: 66px;}.logsbtn_item{width: 54px;padding: 0;}.logsbtn_item--delete{color: var(--delt-bk);font-weight: bold;  cursor: pointer;}.logsnav_a{color: var(--main-fc);text-decoration: none;}.loading {background-image: linear-gradient(to right, var(--main-bk) 0%, var(--main-cl) 68%, var(--main-bk) 100%);background-size: 20%;background-repeat: no-repeat;animation: loading 3s ease-in-out infinite;}@keyframes loading {0%{ background-position-x: -20%; }100%{ background-position-x: 120%; }}</style></head><body><div id='app'>`)
      logs.on('open', ()=>{
        res.write(`<div class='logs'>`)
      })
      logs.on('data', (chunk)=>{
        res.write(escapeHtml(chunk.toString()))
      })
      logs.on('close', ()=>{
        res.write(`</div><div id="bottom"></div><div class="logsnav"><ul class="logslist">`)
        LOGS_LIST_CACHE.forEach(log=>{
          res.write(`<li class="logsnav_item${log===filename ? ' logsnav_item--curt' : ''}">${log}</li>`)
        })
        res.end(`</ul><ul class="logsbtn"><li class="logsbtn_item" title="Go to top"><a class="logsnav_a" href="#" target="_self">▲</a></li><li class="logsbtn_item logsbtn_item--delete" data-name="${filename}">X</li><li class="logsbtn_item"><a class="logsnav_a" href="/logs/">🏠</a></li><li class="logsbtn_item" title="Go to bottom"><a class="logsnav_a" href="#bottom" target="_self">▼</a></li></ul></div></div><script>document.querySelector(".logslist").addEventListener("click",e=>{if(!e.target.className.includes("logsnav_item"))return;const t=e.target.innerText;e.target.classList.add('loading');fetch("/log/"+t).then(e=>e.text()).then(c=>{document.querySelector(".logs").innerHTML=c,document.title=t+" - elecV2P",history.replaceState({},"","/logs/"+t),document.querySelector('.logsnav_item--curt').classList.remove('logsnav_item--curt'),e.target.classList.add('logsnav_item--curt'),document.querySelector(".logsbtn_item--delete").dataset.name =t}).catch(e=>{alert('获取 '+t+' 失败 '+e.message),console.error("获取日志",t,"失败",e)}).finally(()=>e.target.classList.remove('loading'))});document.querySelector(".logsbtn_item--delete").addEventListener("click",t=>{let n=t.target.dataset.name;n&&confirm("确定删除日志 "+n+"？（不可恢复）")&&fetch("/logs",{method:"delete",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})}).then(e=>e.json()).then(e=>{0===e.rescode?(document.querySelector('.logsnav_item--curt').nextSibling || document.querySelector('.logsnav_item')).click():alert(e.message||e)}).catch(e=>{alert(n+" 删除失败 "+e.message),console.log(e)})});document.querySelector('.logsnav_item--curt').scrollIntoView();</script></body>`)
      })
      logs.on('error', (err)=>{
        res.end(err)
      })
    }
  })

  app.get('/log/*', (req, res)=>{
    const filename = decodeURI(req.originalUrl.replace(/\/$/, '').replace('/log/', ''))
    clog.info(req.ip, 'get log', filename)
    const logcont = LOGFILE.get(filename)
    if (logcont) {
      res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
      logcont.on('data', (chunk)=>{
        res.write(escapeHtml(chunk.toString()))
      })
      logcont.on('close', ()=>res.end())
      logcont.on('error', (err)=>{
        res.end(err)
      })
    } else {
      res.status(404).json({
        rescode: 404,
        message: `log ${filename} not exist`
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
      const logs_idx = LOGS_LIST_CACHE.indexOf(name)
      LOGS_LIST_CACHE.splice(logs_idx, 1)
    } else {
      res.json({
        rescode: 404,
        message: name + ' not exist'
      })
    }
  })
}