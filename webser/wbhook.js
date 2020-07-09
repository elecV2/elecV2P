const { TASKS_WORKER, TASKS_INFO } = require('../func')

const { logger, LOGFILE, nStatus } = require('../utils')
const clog = new logger({ head: 'wbhook', level: 'debug' })

module.exports = (app, CONFIG) => {
  app.get("/webhook", (req, res)=>{
    if (!CONFIG.wbrtoken) {
      res.end('服务器端未设置 token, 无法运行 JS')
      return
    }
    if (req.query.token !== CONFIG.wbrtoken) {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      res.end('token 无效')
      return
    }
    let clientip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    clog.notify(clientip, "webhook:", req.query.type)
    if (req.query.type === 'runjs') {
      let fn = req.query.fn
      res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
      res.write('<style>li {list-style: none;white-space: pre-wrap;}</style>')
      res.write(`
        <script>
          const wsSer = location.origin.replace('http', 'ws') + '/elecV2P'
          const ws = new WebSocket(wsSer)
          ws.onopen = ()=>{
            ws.send(JSON.stringify({ type: 'ready', data: 'webhook' }))
            ws.send(JSON.stringify({ type: 'webhook', data: '${fn}' }))
          }
          ws.onmessage = msg => {
            let data = JSON.parse(msg.data)
            if (data.type === 'webhook') {
              document.body.insertAdjacentHTML('afterbegin', '<li>' + data.data + '</li>')
            }
          }
          ws.onclose = close => {
            console.error("WebSocket closed", close)
            document.body.insertAdjacentHTML('afterbegin', 'WebSocket closed, 无法获取 JS 运行日志，请在服务器端查看 JS 运行结果')
          }
          ws.onerror = error => {
            console.error('WebSocket error', error)
            document.body.insertAdjacentHTML('afterbegin', 'WebSocket error, 无法获取 JS 运行日志，请在服务器端查看 JS 运行结果')
          }
        </script>
      `)
      res.end()
    } else if (req.query.type === 'deletelog') {
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      let name = req.query.fn
      if (LOGFILE.delete(name)) {
        res.end(name + '日志文件删除成功')
      } else {
        res.end(name + '文件不存在')
      }
    } else if (req.query.type === 'status') {
      clog.info(clientip, 'get sever status')
      res.end(JSON.stringify(nStatus()))
    } else if (req.query.type === 'taskinfo') {
      const tn = req.query.tn
      clog.info(clientip, 'get taskinfo', tn)
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      if (tn === 'all') {
        res.end(JSON.stringify(TASKS_INFO, null, 2))
      } else {
        for (let tid in TASKS_INFO) {
          if (TASKS_INFO[tid].name === tn) {
            res.end(JSON.stringify(TASKS_INFO[tid], null, 2))
            return
          }
        }
        res.end(JSON.stringify({error: 'no task' + tn}))
      }
    } else if (req.query.type === 'taskstart') {
      clog.notify(clientip, 'start task', req.query.tn)
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      for (let tid in TASKS_INFO) {
        if (TASKS_INFO[tid].name === req.query.tn && TASKS_WORKER[tid]) {
          if (TASKS_INFO[tid].running === false) {
            TASKS_WORKER[tid].start()
            res.end(TASKS_INFO[tid].name + ' 开始运行，任务内容： ' + JSON.stringify(TASKS_INFO[tid]))
          } else {
            res.end(req.query.tn + ' 任务正在运行中，任务内容： ' + JSON.stringify(TASKS_INFO[tid]))
          }
          return
        }
      }
      res.end(req.query.tn + ' 任务不存在')
    } else if (req.query.type === 'taskstop') {
      clog.notify(clientip, 'stop task', req.query.tn)
      res.writeHead(200, { 'Content-Type': 'text/plain;charset=utf-8' })
      for (let tid in TASKS_INFO) {
        if (TASKS_INFO[tid].name === req.query.tn && TASKS_WORKER[tid]) {
          if (TASKS_INFO[tid].running === true) {
            TASKS_WORKER[tid].stop()
            res.end('停止任务 ' + TASKS_INFO[tid].name + '，任务内容： ' + JSON.stringify(TASKS_INFO[tid]))
          } else {
            res.end(req.query.tn + ' 任务已停止，任务内容： ' + JSON.stringify(TASKS_INFO[tid]))
          }
          return
        }
      }
      res.end(req.query.tn + ' 任务不存在')
    } else {
      res.end('wrong webhook type')
    }
  })
}