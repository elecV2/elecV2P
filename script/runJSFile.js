const vm = require('vm')

const { logger, feedAddItem, now, sType, errStack, downloadfile, jsfile, file } = require('../utils')
const clog = new logger({ head: 'runJSFile', level: 'debug' })

const { wsSer } = require('../func/websocket')
const { context } = require('./context')

const { CONFIG } = require('../config')

const CONFIG_RUNJS = {
  timeout_jsrun: 5000,    // JS 运行时间。单位：毫秒
  intervals: 86400,       // 远程 JS 更新时间，单位：秒。 默认：86400(一天)。0: 有则不更新
  numtofeed: 50,          // 每运行 { numtofeed } 次 JS, 添加一个 Feed item。0: 不通知

  jslogfile: true,        // 是否将 JS 运行日志保存到 logs 文件夹    
}

if (CONFIG.CONFIG_RUNJS) {
  Object.assign(CONFIG_RUNJS, CONFIG.CONFIG_RUNJS)
} else {
  CONFIG.CONFIG_RUNJS = CONFIG_RUNJS
}

if (CONFIG.init && CONFIG.init.runjs) {
  CONFIG.init.runjs.split(/,|，| /).filter(s=>s).forEach(js=>{
    runJSFile(js, { from: 'initialization' })
  })
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
  if (!filename || !jscode) {
    clog.error('don\'t have any code to run')
    return 'no code to run.'
  }
  let cb = addContext.cb
  delete addContext.cb
  clog.notify('run', filename, 'from', addContext.from || addContext.type || 'rule')
  if (addContext.type) {
    taskCount(filename)
    if (!cb) cb = wsSer.send.func(addContext.type)
    delete addContext.type
  }

  let fconsole = null
  if (/^\/\/ +@grant +quiet/im.test(jscode)) {
    fconsole = { log(){},err(){},info(){},error(){},notify(){},debug(){} }
  } else {
    fconsole = new logger({ head: filename, level: 'debug', file: CONFIG_RUNJS.jslogfile ? filename : false, cb })
  }
  const CONTEXT = new context({ fconsole })

  const compatible = {
    surge: false,          // 兼容 Surge 脚本
    quanx: false,          // 兼容 Quanx 脚本。都为 false 时，会进行自动判断
    require: false         // 启用 NodeJS require 函数。不开启时会自动进行判断
  }
  if (/^\/\/ +@grant +surge/im.test(jscode)) {
    compatible.surge = true
  }
  if (/^\/\/ +@grant +quanx/im.test(jscode)) {
    compatible.quanx = true
  }
  if (compatible.surge || (compatible.quanx === false && /\$httpClient|\$persistentStore|\$notification/.test(jscode))) {
    clog.debug(`${filename} compatible with Surge script`)
    CONTEXT.add({ surge: true })
  } else if (compatible.quanx || /\$task|\$prefs|\$notify/.test(jscode)) {
    clog.debug(`${filename} compatible with QuantumultX script`)
    CONTEXT.add({ quanx: true })
  } else if (/require\(/.test(jscode)) {
    compatible.require = true
  }
  if (compatible.require || /^\/\/ +@grant +require/im.test(jscode)) {
    CONTEXT.final.require = (path)=>{
      const locfile = file.path(jsfile.get(filename, 'dir'), /\.js$/i.test(path) ? path : path + '.js')
      if (file.isExist(locfile)) return require(locfile)
      else return require(path)
    }
    CONTEXT.final.require.cache = require.cache
    CONTEXT.final.require.resolve = require.resolve
  }
  if (/^\/\/ +@grant +silent/im.test(jscode)) {
    CONTEXT.final.$feed = { push(){}, bark(){}, ifttt(){} }
    if (CONTEXT.final.$notify) CONTEXT.final.$notify = ()=>{}
    if (CONTEXT.final.$notification) CONTEXT.final.$notification.post = ()=>{}
  }

  if (sType(addContext) === 'object' && Object.keys(addContext).length) CONTEXT.add({ addContext })

  try {
    const result = vm.runInNewContext(jscode, CONTEXT.final, { displayErrors: true, timeout: CONFIG_RUNJS.timeout_jsrun })
    if (CONTEXT.final.$result !== undefined) return CONTEXT.final.$result
    return result
  } catch(error) {
    fconsole.error(error.stack)
    return { error: error.message }
  }
}

/**
 * exports 函数
 * @param     {string}    filename      文件名。当 addContext.type = jstest 时为 jscode
 * @param     {object}    addContext    附加环境变量 context
 * @return    {string/object}           runJS() 的结果
 */
function runJSFile(filename, addContext={}) {
  filename = filename.trim()
  if (!filename) return Promise.resolve('a js file is expected.')
  if (/^https?:/.test(filename)) {
    const url = filename
    const sdurl = url.split(/\/|\?|#/)
    do {
      filename = sdurl.pop().trim()
    } while (filename === '')
    const jsIsExist = file.isExist(jsfile.get(filename, 'path'))
    if (!jsIsExist || addContext.type === 'webhook' || (CONFIG_RUNJS.intervals > 0 && new Date().getTime() - jsfile.get(filename, 'date') > CONFIG_RUNJS.intervals*1000)) {
      if (addContext.rename) filename = addContext.rename
      if (!/\.js$/.test(filename)) { filename += '.js' }
      clog.info('downloading', filename, 'from', url)
      return new Promise((resolve, reject)=>{
        downloadfile(url, jsfile.get(filename, 'path')).then(()=>{
          clog.info(`success download ${filename}, ready to run...`)
        }).catch(error=>{
          clog.error('run', url, 'error:', error)
          clog.info('tring run', filename, 'from local...')
          // reject(error)
        }).finally(()=>{
          resolve(runJS(filename, jsfile.get(filename), addContext))
        })
      })
    }
  }

  let rawjs = (addContext.type === 'rawcode') ? filename : jsfile.get(filename)
  if (!rawjs) {
    clog.error(filename, 'not exist.')
    return Promise.resolve(filename + ' not exist.')
  }
  if (addContext.type === 'rawcode') {
    filename = addContext.rename || addContext.from || 'rawcode.js'
  }
  if (addContext.rename) {
    jsfile.put(addContext.rename, rawjs)
  }

  return new Promise((resolve, reject)=>{
    const JSres = runJS(filename, rawjs, addContext)
    if (sType(JSres) === 'promise') {
      let finalres = ''
      JSres.then(res=>finalres=res).catch(err=>{
        clog.error(errStack(err))
        finalres = `run ${filename} error: ${err.message || err}`
        // reject(errStack(err))
      }).finally(()=>{
        if (finalres) clog.info(`run ${filename} result:`, finalres)
        resolve(finalres)
      })
    } else {
      if (JSres) clog.info(`run ${filename} result:`, JSres)
      resolve(JSres)
    }
  })
}

module.exports = { runJSFile, CONFIG_RUNJS }