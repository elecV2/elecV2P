const vm = require('vm')

const { logger, feedAddItem, now, errStack, downloadfile, jsfile, file } = require('../utils')
const clog = new logger({ head: 'runJSFile', level: 'debug' })

const { wsSer } = require('../func/websocket')
const { context } = require('./context')

const { CONFIG } = require('../config')

const CONFIG_RUNJS = {
  timeout_jsrun: 5000,    // JS 运行时间。单位：毫秒
  intervals: 86400,       // 远程 JS 更新时间，单位：秒。 默认：86400(一天)。0: 有则不更新
  numtofeed: 50,          // 每运行 { numtofeed } 次 JS, 添加一个 Feed item。0: 不通知

  jslogfile: true,        // 是否将 JS 运行日志保存到 logs 文件夹

  SurgeEnable: false,     // 兼容 Surge 脚本
  QuanxEnable: false,     // 兼容 Quanx 脚本。都为 false 时，会进行自动判断
}

if (CONFIG.CONFIG_RUNJS) {
  Object.assign(CONFIG_RUNJS, CONFIG.CONFIG_RUNJS)
} else {
  CONFIG.CONFIG_RUNJS = CONFIG_RUNJS
}

const runstatus = {
  start: now(),
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
  if (/test/.test(filename) || CONFIG_RUNJS.numtofeed === 0) return
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

  clog.debug('JS 脚本运行次数统计：', runstatus)
  if (runstatus.times === 0) {
    let des = []
    for (let jsname in runstatus.detail) {
      des.push(`${jsname}: ${runstatus.detail[jsname]} 次`)
    }
    runstatus.detail = {}
    feedAddItem('运行 JS ' + CONFIG_RUNJS.numtofeed + ' 次啦！', `从 ${runstatus.start} 开始： ` + des.join(', '))
    runstatus.times = CONFIG_RUNJS.numtofeed
    runstatus.start = now()
  }
}

/**
 * JS 执行函数
 * @param  {string} filename   JS 文件名
 * @param  {string} jscode     JS 执行代码
 * @param  {object} addContext 附加环境变量 context
 * @return {string/object}     JS 执行结果
 */
function runJS(filename, jscode, addContext={}) {
  let cb = addContext.cb
  delete addContext.cb
  clog.notify('run', filename, 'from', addContext.from || addContext.type || 'rule')
  if (addContext.type) {
    taskCount(filename)
    if (!cb) cb = wsSer.send.func(addContext.type)
    delete addContext.type
  }
  const fconsole = new logger({ head: filename, file: CONFIG_RUNJS.jslogfile ? filename : false, cb })
  const CONTEXT = new context({ fconsole })

  if (CONFIG_RUNJS.SurgeEnable || (CONFIG_RUNJS.QuanxEnable === false && /\$httpClient|\$persistentStore|\$notification/.test(jscode))) {
    clog.debug(`${filename} 使用 Surge 兼容模式运行`)
    CONTEXT.add({ surge: true })
  } else if (CONFIG_RUNJS.QuanxEnable || /\$task|\$prefs|\$notify/.test(jscode)) {
    clog.debug(`${filename} 使用 Quantumult X 兼容模式运行`)
    CONTEXT.add({ quanx: true })
  }

  if (/\/\/ @require +/.test(jscode)) {
    try {
      [...jscode.matchAll(/\/\/ @require +(.+)/g)].forEach(rq=>{
        rq[1].split(',').forEach(r=>{
          CONTEXT.add({ $require: r.trim().replace(/^('|"|`)|('|"|`)$/g, '') })
        })
      })
    } catch(e) {
      fconsole.error('@require error', errStack(e))
    }
  }

  const inTime = jscode.match(/setTimeout|setInterval|clearInterval|clearTimeout/g)
  if (inTime) {
    if (inTime.indexOf('setTimeout') > -1) CONTEXT.final.setTimeout = setTimeout
    if (inTime.indexOf('setInterval') > -1) CONTEXT.final.setInterval = setInterval
    if (inTime.indexOf('clearTimeout') > -1) CONTEXT.final.clearTimeout = clearTimeout
    if (inTime.indexOf('clearInterval') > -1) CONTEXT.final.clearInterval = clearInterval
  }

  if (Object.keys(addContext).length) CONTEXT.add({ addContext })

  try {
    const result = vm.runInNewContext(jscode, CONTEXT.final, { displayErrors: true, timeout: CONFIG_RUNJS.timeout_jsrun })
    if (CONTEXT.final.$result !== undefined) return CONTEXT.final.$result
    return result
  } catch(error) {
    fconsole.error(errStack(error, true))
    return { body: errStack(error) }
  }
}

/**
 * exports 函数
 * @param     {string}    filename      文件名。当 addContext.type = jstest 时为 jscode
 * @param     {object}    addContext    附加环境变量 context
 * @return    {string/object}           runJS() 的结果
 */
function runJSFile(filename, addContext={}) {
  if (/^https?:/.test(filename)) {
    const url = filename
    filename = addContext.rename || url.split('/').pop()
    const jsIsExist = file.isExist(jsfile.get(filename, 'path'))
    if (!jsIsExist || addContext.type === 'webhook' || (CONFIG_RUNJS.intervals > 0 && new Date().getTime() - jsfile.get(filename, 'date') > CONFIG_RUNJS.intervals*1000)) {
      clog.info('ready to download JS file', filename, '...')
      return new Promise((resolve, reject)=>{
        downloadfile(url, jsfile.get(filename, 'path')).then(()=>{
          resolve(runJS(filename, jsfile.get(filename), addContext))
        }).catch(error=>{
          error = errStack(error)
          clog.error('run', url, 'error:', error)
          reject(error)
        })
      })
    }
  }

  if (addContext.type === 'rawcode') {
    var JsStr = filename
    filename = addContext.rename || 'rawcode.js'
  } else {
    var JsStr = jsfile.get(filename)
    if (!JsStr) {
      clog.error(filename, '不存在')
      return filename + '不存在'
    }
  }

  return runJS(filename, JsStr, addContext)
}

module.exports = { runJSFile, CONFIG_RUNJS }