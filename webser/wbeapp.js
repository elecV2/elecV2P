const { logger, errStack, sHash, list, wsSer } = require('../utils')
const clog = new logger({ head: 'wbeapp', cb: wsSer.send.func('eapp') })

const { runJSFile } = require('../script')
const { exec } = require('../func')
const { CONFIG } = require('../config')

CONFIG.eapp = Object.assign({
    enable: true,
    logo_type: 1,
    apps: [{
      "name": "说明文档",
      "type": "url",
      "target": "https://github.com/elecV2/elecV2P-dei/blob/master/docs/dev_note/webUI%20首页快捷运行程序%20eapp.md",
    }, {
      "name": "简易记事本",
      "type": "efh",
      "target": "https://raw.ev2.workers.dev/elecV2/elecV2P-dei/master/examples/JSTEST/efh/notepad.efh",
      "hash": "94f669c165f0f33ec73fd32f446b32e3"
    }, {
      "name": "清空日志",
      "logo": "https://raw.ev2.workers.dev/elecV2/elecV2P/master/efss/logo/dlog.png",
      "type": "js",
      "target": "https://raw.ev2.workers.dev/elecV2/elecV2P/master/script/JSFile/deletelog.js",
      "hash": "0e9288d021b42478b102a2ff1e19226d"
    }, {
      "name": "PY 安装",
      "logo": "/efss/logo/py_install.png",
      "type": "js",
      "target": "https://raw.ev2.workers.dev/elecV2/elecV2P/master/script/JSFile/python-install.js",
    }, {
      "name": "PM2 LS",
      "type": "shell",
      "target": "pm2 ls",
    }, {
      "name": "查看目录文件",
      "type": "shell",
      "target": "ls -cwd %ei%",
    }, {
      "name": "随机配色",
      "type": "eval",
      "target": "const s=['--secd-fc','--secd-bk','--icon-bk'],r=Math.random().toString(16).slice(2),f=[],ht=h=>h.reduce((a,c)=>a+c.toString(16).padStart(2,'0'),'');['--main-bk','--main-cl','--icon-run'].forEach((v,i)=>{let hc=r.slice(i*2,i*2+6);if (i<2){let hs=hc.match(/\\w{2}/g).map(s=>parseInt(s,16)),h1=160-Math.max(...hs);h1<0&&(hs=hs.map(s=>Math.max(0,s+h1)))&&(hc=ht(hs));i&&(f.push('--main-fc'+': #'+ht(hs.map(s=>255-s))));}f.push(v+': #'+hc);f.push(s[i]+': #'+hc+'b8');});document.body.style=f.join(';');",
      "note": "给当前页面生成一个随机配色方案",
    }]
}, CONFIG.eapp)
CONFIG.eapp.apps.forEach(app=>{
  if (!app.hash || app.hash.length !== 32) {
    app.hash = sHash(app.name + app.type + app.target + app.run)
  }
})

module.exports = app => {
  app.get('/eapp', (req, res)=>{
    res.json({
      rescode: 0,
      message: 'success get eapp config',
      resdata: CONFIG.eapp,
    })
  })

  app.put('/eapp', (req, res)=>{
    const { name, logo, type, target, run, note, idx } = req.body
    if (!(name && type && target)) {
      return res.json({
        rescode: -1,
        message: 'name and type and target are expect'
      })
    }
    const app = {
      name, logo, type, target,
    }
    run && (app.run = run)
    note && (app.note = note)

    app.hash = sHash(name + type + target + run)
    if (CONFIG.eapp.apps[idx]) {
      CONFIG.eapp.apps[idx] = app
    } else {
      CONFIG.eapp.apps.push(app)
    }
    res.json({
      rescode: 0,
      message: 'success put eapp ' + app.name,
      resdata: app.hash,
    })
    list.put('config.json', JSON.stringify(CONFIG, null, 2))
  })

  app.put('/eapp/logo_type', (req, res)=>{
    CONFIG.eapp.logo_type = req.body.logo_type || 1
    res.json({
      rescode: 0,
      message: 'eapp logo_type ' + CONFIG.eapp.logo_type,
    })
    list.put('config.json', JSON.stringify(CONFIG, null, 2))
  })

  app.post('/eapp', (req, res)=>{
    CONFIG.eapp.enable = req.body.enable !== false
    CONFIG.eapp.logo_type = req.body.logo_type
    const apps = req.body.apps
    if (apps?.length) {
      CONFIG.eapp.apps = apps.filter(app=>{
        if (app.name && app.type && app.target) {
          if (app.hash?.length !== 32) {
            app.hash = sHash(app.name + app.type + app.target + app.run)
          }
          return true
        }
        return false
      })
      res.json({
        rescode: 0,
        message: 'success save eapp lists'
      })
      list.put('config.json', JSON.stringify(CONFIG, null, 2))
    } else {
      return res.json({
        rescode: -1,
        message: 'eapp list is expect to save'
      })
    }
  })

  app.delete('/eapp/:idx', (req, res)=>{
    const app = CONFIG.eapp.apps[req.params.idx]
    let message = ''
    if (app) {
      message = `success delete ${app.name}`
      CONFIG.eapp.apps.splice(req.params.idx, 1)
    } else {
      message = `app index ${ req.params.idx } not exist`
    }
    res.json({
      rescode: 0,
      message,
    })
    list.put('config.json', JSON.stringify(CONFIG, null, 2))
  })

  app.post('/eapp/run', (req, res)=>{
    const app = req.body.app
    if (!app || !app.target) {
      clog.error('a eapp target is expect')
      return res.json({
        rescode: -1,
        message: 'a eapp target is expect'
      })
    }
    switch(app.type) {
    case 'js':
      runJSFile(app.target, {
        from: 'eapp',
        env: { wsid: req.body.id },
        cb: wsSer.send.func('eapp', req.body.id),
      }).catch(error=>{
        clog.error(errStack(error))
      })
      res.json({
        rescode: 0,
        message: app.target + ' running'
      })
      break
    case 'shell':
      // shell 执行日志发送到所有已连接客户端
      clog.notify(req.ip, 'running shell command')
      exec(app.target, {
        from: 'eapp',
        cb(data, error) {
          if (error) {
            clog.error(error)
          } else {
            clog.info(data)
          }
        }
      })
      res.json({
        rescode: 0,
        message: app.target + ' running'
      })
      break
    default:
      clog.error('eapp type', app.type, 'Not Implemented')
      res.json({
        rescode: 501,
        message: 'eapp type ' + app.type + ' Not Implemented'
      })
    }
  })
}