const { logger, LOGFILE, sType, escapeHtml } = require('../utils')
const clog = new logger({ head: 'wblogs' })

const { CONFIG } = require('../config')

let LOGS_LIST_CACHE = LOGFILE.get('all')

module.exports = app => {
  app.get(["/logs", "/logs/*"], (req, res)=>{
    let filename = req.params[0]?.replace(/\/$/, '') || 'all'
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "get logs", filename)
    let logs = LOGFILE.get(filename)
    if (!logs) {
      return res.status(404).json({
        rescode: 404,
        message: `${filename} not exist`
      })
    }
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
    let mainbk = '#003153', maincl = '#2890EE', appbk = '', style = ''
    if (CONFIG.webUI?.theme?.simple?.enable) {
      mainbk = CONFIG.webUI.theme.simple.mainbk || '#003153'
      maincl = CONFIG.webUI.theme.simple.maincl || '#2890EE'
      appbk  = CONFIG.webUI.theme.simple.appbk  || ''
      style  = CONFIG.webUI.theme.simple.style  || ''
    }
    let d_color = [`--main-bk: ${ mainbk };`, '--secd-fc: ' + (mainbk.startsWith('#') ? `${ mainbk.padEnd(7, 8).slice(0, 7) }B8;` : '#003153B8;'), `--main-cl: ${ maincl };`, '--secd-bk: ' + (maincl.startsWith('#') ? `${ maincl.padEnd(7, 8).slice(0, 7) }B8;` : '#2890EEB8;')]
    appbk = appbk ? `background: ${appbk};` : 'background-image: linear-gradient(110deg, var(--secd-fc) 25%, transparent 0%),linear-gradient(315deg, transparent 30%, var(--tras-bk) 30%),linear-gradient(45deg, transparent 66%, var(--secd-bk) 0%),linear-gradient(333deg, var(--icon-bk) 53%, transparent 0%);'
    style = `:root {${ d_color.join('') };--main-fc: #FAFAFD;--delt-bk: #FF2828;--icon-run: #66FF00;--icon-bk: #66FF0088;--tras-bk: #A7A8BD88;}html,body{height: 100%;width: 100%;margin: 0;padding: 0;overflow: auto;overflow: overlay;scroll-behavior: smooth;}body{${appbk}}#app{padding: 3px 8px;box-sizing: border-box;min-height: 100vh;}${style}`
    res.write(`<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"><meta name="theme-color" content="${mainbk}"><link rel="apple-touch-icon" href="/efss/logo/elecV2P.png">`)
    if (sType(logs) === 'array') {
      res.write(`<title>elecV2P LOGS - ${logs.length}</title><style>${style}.logs{padding: 0;margin: 0;margin-bottom: 5em;display: flex;flex-wrap: wrap;justify-content: space-between;gap: 0 .5em;}.logs_item {height: 40px;display: inline-flex;align-items: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0 0 0 15px;margin: 4px 0;white-space: pre;overflow: auto hidden;background: var(--secd-fc);color: var(--main-fc);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.logs_a {color: var(--main-fc);text-decoration: none;}.logs_delete {width: 1em;text-align: center;cursor: pointer;opacity: 0;border-radius: 0 10px 10px 0;background-color: var(--delt-bk);}.logs_delete:hover{opacity: 1;}.logsnav{position: fixed;bottom: .8em;left: 0;width: 100%;padding: 0;margin: 0;display: flex;flex-wrap: wrap;justify-content: space-between;}.logsnav_item{height: 40px;display: inline-flex;align-items: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0;margin: 4px 8px;white-space: pre;overflow: auto hidden;background: var(--main-fc);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.logsnav_a{padding: 0 1em;color: var(--secd-fc);font-weight: 600;text-decoration: none;}</style></head><body><div id='app'>`)
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
      res.write(`<title>${filename} - elecV2P</title><style>${style}.logs{background:var(--main-bk);border-radius:10px;color:var(--main-fc);font-family:consolas, monospace;font-size:18px;height:fit-content; overflow-wrap:break-word;margin-bottom: 208px;padding:8px 12px;text-decoration:none; white-space:pre-wrap; word-break:break-all;}.logsnav{position: fixed;bottom: 0.8em;left: 8px;width: calc(100% - 16px);padding: 0;margin: 0;display: flex;border: 4px solid var(--main-fc);border-radius: 10px;box-sizing: border-box;background: var(--main-fc);}.logslist,.logsbtn{display: inline-flex;list-style: none;padding: 0;margin: 0;height: 176px;overflow-y: auto;flex-wrap: wrap;justify-content: space-between;scroll-behavior: smooth;}.logslist{flex-grow: 1;}.logsnav_item,.logsbtn_item{height: 40px;display: inline-flex;align-items: center;justify-content: center;line-height: 40px;list-style: none;border-radius: 10px;padding: 0 1em;margin: 2px 6px;white-space: pre;overflow: auto hidden;background: var(--secd-fc);color: var(--main-fc);font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;cursor: pointer;user-select: none;}.logsnav_item--curt{background-color: var(--main-cl);}.logsbtn {width: 66px;min-width: 66px;}.logsbtn_item{width: 54px;padding: 0;}.logsbtn_item--delete{color: var(--delt-bk);font-weight: bold;  cursor: pointer;}.logsnav_a{width: 100%;color: var(--main-fc);text-decoration: none;text-align: center;}.loading {background-image: linear-gradient(to right, transparent, var(--main-cl), transparent);background-size: 20%;animation: loading 3s ease-in-out infinite;}@keyframes loading {0%{ background-position-x: 0%; }100%{ background-position-x: 100%; }}</style></head><body><div id="top"></div><div id='app'>`)
      logs.on('open', ()=>{
        res.write(`<div class='logs'>`)
      })
      logs.on('data', (chunk)=>{
        res.write(escapeHtml(chunk.toString()))
      })
      logs.on('close', ()=>{
        res.write(`</div><div class="logsnav"><noscript><strong>Please enable JavaScript to continue.</strong></noscript><ul class="logslist">`)
        LOGS_LIST_CACHE.forEach(log=>{
          res.write(`<li class="logsnav_item${log===filename ? ' logsnav_item--curt' : ''}">${log}</li>`)
        })
        res.end(`</ul><ul class="logsbtn"><li class="logsbtn_item" title="Go to top"><a class="logsnav_a" href="#top" target="_self">▲</a></li><li class="logsbtn_item logsbtn_item--delete" data-name="${filename}">X</li><li class="logsbtn_item"><a class="logsnav_a" href="/logs/">🏠</a></li><li class="logsbtn_item" title="Go to bottom"><a class="logsnav_a" href="#bottom" target="_self">▼</a></li></ul></div></div><div id="bottom"></div><script>document.querySelector(".logslist").addEventListener("click",e=>{if(!e.target.className.includes("logsnav_item"))return;const t=e.target.innerText;e.target.classList.add('loading');fetch("/log/"+t).then(e=>e.text()).then(c=>{document.querySelector(".logs").innerHTML=c,document.title=t+" - elecV2P",history.replaceState({},"","/logs/"+t),document.querySelector('.logsnav_item--curt').classList.remove('logsnav_item--curt'),e.target.classList.add('logsnav_item--curt'),document.querySelector(".logsbtn_item--delete").dataset.name =t}).catch(e=>{alert('获取 '+t+' 失败 '+e.message),console.error("获取日志",t,"失败",e)}).finally(()=>e.target.classList.remove('loading'))});document.querySelector(".logsbtn_item--delete").addEventListener("click",t=>{let n=t.target.dataset.name;n&&confirm("确定删除日志 "+n+"？（不可恢复）")&&fetch("/logs",{method:"delete",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n})}).then(e=>e.json()).then(e=>{0===e.rescode?(document.querySelector('.logsnav_item--curt').nextSibling || document.querySelector('.logsnav_item')).click():alert(e.message||e)}).catch(e=>{alert(n+" 删除失败 "+e.message),console.log(e)})});document.querySelector('.logsnav_item--curt').scrollIntoView();</script></body>`)
      })
      logs.on('error', (err)=>{
        res.end(err)
      })
    }
  })

  app.get('/log/*', (req, res)=>{
    const filename = req.params[0].replace(/\/$/, '')
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