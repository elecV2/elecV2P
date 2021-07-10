const vm = require('vm')
const EventEmitter = require('events')

const { logger, feedAddItem, now, sType, sString, surlName, euid, errStack, downloadfile, Jsfile, file, wsSer } = require('../utils')
const clog = new logger({ head: 'runJSFile', level: 'debug' })

const vmEvent = new EventEmitter()
vmEvent.on('error', err=>clog.error(errStack(err)))

const { context } = require('./context')
const { CONFIG } = require('../config')

const CONFIG_RUNJS = {
  timeout: 5000,          // JS 运行时间。单位：毫秒
  intervals: 86400,       // 远程 JS 更新时间，单位：秒。 默认：86400(一天)。0: 有则不更新
  numtofeed: 50,          // 每运行 { numtofeed } 次 JS, 添加一个 Feed item。0: 不通知

  jslogfile: true,        // 是否将 JS 运行日志保存到 logs 文件夹
  eaxioslog: false,       // 打印/保存网络请求 url 到日志
  proxy: true,            // 是否应用网络请求设置中的代理（如有）

  white: {                // 白名单脚本。放行所有网络请求，不进行屏蔽检测
    enable: false,
    list: []
  }
}

if (CONFIG.CONFIG_RUNJS) {
  Object.assign(CONFIG_RUNJS, CONFIG.CONFIG_RUNJS)
}
// 同步 CONFIG 数据
CONFIG.CONFIG_RUNJS = CONFIG_RUNJS

// 初始化脚本运行
if (CONFIG.init && CONFIG.init.runjs) {
  CONFIG.init.runjs.split(/ ?, ?|，| /).filter(s=>s).forEach(js=>{
    runJSFile(js, { from: 'initialization' })
  })
}

// websocket/通知触发 JS
wsSer.recv.runjs = (data={})=>runJSFile(data.fn, data.addContext)

const runstatus = {
  start: now(null, false),
  times: CONFIG_RUNJS.numtofeed,
  detail: {},
  total: 0
}

/**
 * JS 运行统计
 * @param  {string} filename JS 文件名
 * @return {none}          
 */
async function taskCount(filename) {
  if (/test/.test(filename) || CONFIG_RUNJS.numtofeed === 0) {
    clog.debug(filename, 'match key word: test, or skip count run times by set')
    return
  }
  if (runstatus.detail[filename]) {
    runstatus.detail[filename]++
  } else {
    runstatus.detail[filename] = 1
  }
  runstatus.total++
  runstatus.times--

  wsSer.send({
    type: 'jsrunstatus',
    data: { total: runstatus.total, detail: runstatus.detail }
  })

  clog.debug('JS run status：', runstatus)
  if (runstatus.times === 0) {
    let des = []
    for (let jsname in runstatus.detail) {
      des.push(`${jsname}: ${runstatus.detail[jsname]}`)
    }
    runstatus.detail = {}
    feedAddItem('run javascript ' + CONFIG_RUNJS.numtofeed + ' times', des.join(', ') + ` from ${runstatus.start}`)
    runstatus.times = CONFIG_RUNJS.numtofeed
    runstatus.start = now(null, false)
  }
}

/**
 * JS 执行函数
 * @param  {string} filename   JS 文件名
 * @param  {string} jscode     JS 执行代码
 * @param  {object} addContext 附加环境变量 context
 * @return {promise}     JS 执行结果
 */
function runJS(filename, jscode, addContext={}) {
  if (!filename || !jscode) {
    clog.error('don\'t have any javascript code to run')
    return Promise.resolve('no javascript code to run')
  }
  let cb = addContext.cb
  delete addContext.cb
  clog.notify('run', filename, 'from', addContext.from || addContext.type || 'rule')
  if (addContext.type) {
    taskCount(filename)
    if (cb === undefined) {
      cb = wsSer.send.func(addContext.type)
    }
    delete addContext.type
  }

  let fconsole = null,
      bGrant   = false
  if (/^\/\/ +@grant/m.test(jscode)) {
    bGrant = true
  }
  const compatible = {
    surge: false,          // Surge 脚本调试模式
    quanx: false,          // Quanx 脚本调试模式。都为 false 时，会进行自动判断
    nodejs: false,         // nodejs 运行模式，不对脚本进行兼容判断
    require: false         // 启用 nodeJS require 函数。不开启时会自动进行判断
  }
  if (bGrant) {
    // compatiable 判断
    if (/^\/\/ +@grant +nodejs$/m.test(jscode)) {
      compatible.nodejs = true
    } else if (/^\/\/ +@grant +surge$/m.test(jscode)) {
      compatible.surge = true
    } else if (/^\/\/ +@grant +quanx$/m.test(jscode)) {
      compatible.quanx = true
    }
    // 日志显示类型判断
    if (/^\/\/ +@grant +(still|silent)$/m.test(jscode)) {
      fconsole = { log(){},err(){},info(){},error(){},notify(){},debug(){},clear(){} }
    } else if (/^\/\/ +@grant +calm$/m.test(jscode)) {
      fconsole = new logger({ head: filename, level: 'error', file: CONFIG_RUNJS.jslogfile ? filename : false })
    }
  }
  if (!fconsole) {
    fconsole = new logger({ head: filename, level: 'debug', file: CONFIG_RUNJS.jslogfile ? filename : false, cb })
  }
  const CONTEXT = new context({ fconsole, name: filename })

  if (compatible.nodejs) {
    CONTEXT.final.module = module
    CONTEXT.final.process = process
  } else if (compatible.surge || (compatible.quanx === false && /\$httpClient|\$persistentStore|\$notification/.test(jscode))) {
    clog.debug(`${filename} compatible with Surge script`)
    CONTEXT.add({ surge: true })
  } else if (compatible.quanx || /\$task|\$prefs|\$notify/.test(jscode)) {
    clog.debug(`${filename} compatible with QuantumultX script`)
    CONTEXT.add({ quanx: true })
  } else if (/require\(/.test(jscode)) {
    compatible.require = true
  }
  if (compatible.nodejs || compatible.require || (bGrant && /^\/\/ +@grant +require/m.test(jscode))) {
    CONTEXT.final.require = (path)=>{
      const locfile = file.path(Jsfile.get(filename, 'dir'), /\.js$/i.test(path) ? path : path + '.js')
      if (file.isExist(locfile)) {
        return require(locfile)
      }
      return require(path)
    }
    CONTEXT.final.require.cache = require.cache
    CONTEXT.final.require.resolve = require.resolve
  }
  if (bGrant && /^\/\/ +@grant +(quiet|silent)$/m.test(jscode)) {
    CONTEXT.final.$feed = { push(){}, bark(){}, ifttt(){}, cust(){} }
    if (CONTEXT.final.$notify) {
      CONTEXT.final.$notify = ()=>{}
    }
    if (CONTEXT.final.$notification) {
      CONTEXT.final.$notification.post = ()=>{}
    }
  }

  if (sType(addContext) === 'object' && Object.keys(addContext).length) {
    if (addContext.from === 'feedPush') {
      CONTEXT.final.$feed.push = ()=>fconsole.notify(filename, 'is triggered by notification, $feed.push is disabled to avoid circle callback')
    }
    CONTEXT.add({ addContext })
  }

  let bDone = /^(?!\/\/).*\$done/m.test(jscode)   // 判断脚本中是否使用 $done 函数。（待优化多选注释

  return new Promise((resolve, reject)=>{
    try {
      let tout = addContext.timeout === undefined ? CONFIG_RUNJS.timeout : addContext.timeout
      if (bDone) {
        CONTEXT.final.ok = euid() + Date.now()
        let vmtout = null
        if (tout > 0) {
          vmtout = setTimeout(()=>{
            let message = `run ${filename} timeout of ${tout} ms`
            if (addContext.timeout !== undefined) {
              message = `${filename} still running...`
            }
            if (addContext.from === 'favend') {
              message += `\ncheck the favend setting on webUI/efss`
            }
            vmEvent.emit(CONTEXT.final.ok, message)
            clog.debug(message)
          }, tout)
        }

        vmEvent.once(CONTEXT.final.ok, (data)=>{
          resolve(data)
          clearTimeout(vmtout)
        })
        CONTEXT.final.$vmEvent = vmEvent
      }
      let option = {
        filename, timeout: tout > 0 ? Number(tout) : undefined
      }
      let $result = vm.runInNewContext(jscode, CONTEXT.final, option)

      if (bDone === false) {
        resolve($result)
      }
    } catch(error) {
      fconsole.error(error.stack)
      let result = { error: error.message }
      if (addContext.from === 'rule' || addContext.from === 'webhook') {
        result.rescode = -1
        result.stack = error.stack
      }
      resolve(result)
    }
  })
}

/**
 * exports 函数
 * @param     {string}    filename      文件名。当 addContext.type = rawcode 时表示此项为纯 JS 代码
 * @param     {object}    addContext    附加环境变量 context
 * @return    {Promise}                 runJS() 的结果
 */
async function runJSFile(filename, addContext={}) {
  filename = filename.trim()
  if (filename === undefined || filename === '') {
    return Promise.resolve('a javascript filename or code is expected')
  }

  // filename 附带参数处理
  if (addContext.type !== 'rawcode') {
    if (/ -local/.test(filename)) {
      addContext.local = true
      filename = filename.replace(' -local', '')
    }

    // -rename 参数处理
    let ren = filename.match(/ -rename ([^\- ]+)/)
    if (ren && ren[1]) {
      if (!ren[1].endsWith('.js')) {
        ren[1] = ren[1] + '.js'
      }
      addContext.rename = ren[1]
      filename = filename.replace(/ -rename ([^\- ]+)/, '')
    }

    let jobenvs = filename.split(' -env ')
    if (jobenvs[1] !== undefined) {
      let envlist = jobenvs[1].trim().split(' ')
      envlist.forEach(ev=>{
        let ei = ev.match(/(.*?)=(.*)/)
        if (ei.length === 3) {
          addContext[ei[1].startsWith('$') ? ei[1] : ('$' + ei[1])] = decodeURI(ei[2])
        }
      })
      filename = jobenvs[0]
    }
  }
  // end filename 附带参数处理

  let runclog = clog
  if (addContext.cb) {
    runclog = new logger({ head: (addContext.from || addContext.type || 'rule') + 'RunJS', level: 'debug', file: CONFIG_RUNJS.jslogfile ? (addContext.rename || addContext.filename || (/^https?:/.test(filename) && surlName(filename)) || ((addContext.type === 'rawcode') && (addContext.from || 'rawcode.js')) || filename) : false, cb: addContext.cb })
  }
  if (/^https?:/.test(filename)) {
    let url = filename
    filename = surlName(url)
    let jsIsExist = file.isExist(Jsfile.get(filename, 'path'))
    if (jsIsExist && addContext.local) {
      runclog.info('run', filename, 'locally')
      delete addContext.local
    } else if (!jsIsExist || addContext.type === 'webhook' || (CONFIG_RUNJS.intervals > 0 && new Date().getTime() - Jsfile.get(filename, 'date') > CONFIG_RUNJS.intervals*1000)) {
      if (addContext.rename) {
        filename = addContext.rename
      }
      if (!/\.js$/i.test(filename)) {
        filename += '.js'
      }
      runclog.info('downloading', filename, 'from', url)
      try {
        await downloadfile(url, Jsfile.get(filename, 'path'))
        runclog.info(`success download ${filename}, ready to run`)
      } catch(error) {
        runclog.error(`run ${url}, error: ${error}`)
        runclog.info(`try to run ${filename} locally`)
      }
    }
  }

  let rawjs = (addContext.type === 'rawcode') ? filename : Jsfile.get(filename)
  if (rawjs === false) {
    runclog.error(`${filename} not exist`)
    return Promise.resolve(`${filename} not exist`)
  }
  if (addContext.rename) {
    if (!/\.js$/i.test(addContext.rename)) {
      addContext.rename += '.js'
    }
    Jsfile.put(addContext.rename, rawjs)
    filename = addContext.rename
  } else if (addContext.type === 'rawcode') {
    filename = addContext.filename || addContext.from || 'rawcode.js'
    if (!/\.js$/i.test(filename)) {
      filename += '.js'
    }
  }

  return new Promise((resolve, reject)=>{
    runJS(filename, rawjs, addContext).then(res=>{
      resolve(res)
      if (res !== undefined) {
        res = sString(res)
        if (res.length > 480) {
          runclog.debug(`run ${filename} result: ${res}`)
          res = res.slice(0, 480) + '...'
        }
        runclog.info(`run ${filename} result: ${res}`)
      }
    }).catch(e=>{
      resolve(e.message)
      runclog.error(`run ${filename}, error: ${errStack(e)}`)
    })
  })
}

module.exports = { runJSFile, CONFIG_RUNJS }