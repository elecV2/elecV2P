const vm = require('vm')
const EventEmitter = require('events')

const { logger, feedAddItem, now, sType, sString, euid, errStack, downloadfile, Jsfile, file, wsSer } = require('../utils')
const clog = new logger({ head: 'runJSFile', level: 'debug' })

const vmEvent = new EventEmitter()
vmEvent.on('error', err=>clog.error(err))

const { context } = require('./context')
const { CONFIG } = require('../config')

const CONFIG_RUNJS = {
  timeout: 5000,          // JS 运行时间。单位：毫秒
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
  if (/test/.test(filename) || CONFIG_RUNJS.numtofeed === 0) {
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
    return Promise.resolve('no code to run')
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

  let fconsole = null
  if (/^\/\/ +@grant +(still|silent)$/m.test(jscode)) {
    fconsole = { log(){},err(){},info(){},error(){},notify(){},debug(){} }
  } else if (/^\/\/ +@grant +calm$/m.test(jscode)) {
    fconsole = new logger({ head: filename, level: 'error', file: CONFIG_RUNJS.jslogfile ? filename : false })
  } else {
    fconsole = new logger({ head: filename, level: 'debug', file: CONFIG_RUNJS.jslogfile ? filename : false, cb })
  }
  const CONTEXT = new context({ fconsole })

  const compatible = {
    surge: false,          // 兼容 Surge 脚本
    quanx: false,          // 兼容 Quanx 脚本。都为 false 时，会进行自动判断
    require: false         // 启用 NodeJS require 函数。不开启时会自动进行判断
  }
  if (/^\/\/ +@grant +surge$/m.test(jscode)) {
    compatible.surge = true
  } else if (/^\/\/ +@grant +quanx$/m.test(jscode)) {
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
  if (compatible.require || /^\/\/ +@grant +require/m.test(jscode)) {
    CONTEXT.final.require = (path)=>{
      const locfile = file.path(Jsfile.get(filename, 'dir'), /\.js$/i.test(path) ? path : path + '.js')
      if (file.isExist(locfile)) return require(locfile)
      else return require(path)
    }
    CONTEXT.final.require.cache = require.cache
    CONTEXT.final.require.resolve = require.resolve
  }
  if (/^\/\/ +@grant +(quiet|silent)$/m.test(jscode)) {
    CONTEXT.final.$feed = { push(){}, bark(){}, ifttt(){} }
    if (CONTEXT.final.$notify) CONTEXT.final.$notify = ()=>{}
    if (CONTEXT.final.$notification) CONTEXT.final.$notification.post = ()=>{}
  }

  if (sType(addContext) === 'object' && Object.keys(addContext).length) {
    CONTEXT.add({ addContext })
  }

  let bDone = false     // 是否使用 $done 函数提前返回脚本执行结果

  if (/\$done/.test(jscode)) {
    bDone = true
  }

  return new Promise((resolve, reject)=>{
    try {
      if (bDone) {
        CONTEXT.final.ok = euid() + Date.now()
        let vmtout = null
        if (CONFIG_RUNJS.timeout > 0) {
          vmtout = setTimeout(()=>{
            vmEvent.emit(CONTEXT.final.ok, 'run ' + filename + ' timeout of ' + CONFIG_RUNJS.timeout + ' ms')
            clog.debug('run', filename, 'timeout of', CONFIG_RUNJS.timeout, 'ms')
          }, CONFIG_RUNJS.timeout)
        }

        vmEvent.once(CONTEXT.final.ok, (data)=>{
          resolve(data)
          clearTimeout(vmtout)
        })
        CONTEXT.final.$vmEvent = vmEvent
      }
      let option = {
        filename
      }
      if (CONFIG_RUNJS.timeout && CONFIG_RUNJS.timeout > 0) {
        option.timeout = CONFIG_RUNJS.timeout
      }
      let $result = vm.runInNewContext(jscode, CONTEXT.final, option)

      if (bDone === false) {
        resolve($result)
      }
    } catch(error) {
      fconsole.error(error.stack)
      resolve({ error: error.message })
    }
  })
}

/**
 * exports 函数
 * @param     {string}    filename      文件名。当 addContext.type = rawcode 时表示此项为纯 JS 代码
 * @param     {object}    addContext    附加环境变量 context
 * @return    {Promise}                 runJS() 的结果
 */
function runJSFile(filename, addContext={}) {
  filename = filename.trim()
  if (filename === undefined || filename === '') {
    return Promise.resolve('a js file is expected')
  }
  if (/^https?:/.test(filename)) {
    const url = filename
    const sdurl = url.split(/\/|\?|#/)
    do {
      filename = sdurl.pop().trim()
    } while (filename === '')
    const jsIsExist = file.isExist(Jsfile.get(filename, 'path'))
    if (!jsIsExist || addContext.type === 'webhook' || (CONFIG_RUNJS.intervals > 0 && new Date().getTime() - Jsfile.get(filename, 'date') > CONFIG_RUNJS.intervals*1000)) {
      if (addContext.rename) {
        filename = addContext.rename
      }
      if (!/\.js$/i.test(filename)) {
        filename += '.js'
      }
      clog.info('downloading', filename, 'from', url)
      return new Promise((resolve, reject)=>{
        downloadfile(url, Jsfile.get(filename, 'path')).then(()=>{
          clog.info(`success download ${filename}, ready to run`)
        }).catch(error=>{
          clog.error('run', url, 'error:', error)
          clog.info('try to run', filename, 'locally')
          // reject(error)
        }).finally(()=>{
          runJS(filename, Jsfile.get(filename), addContext).then(res=>{
            resolve(res)
            if (res !== undefined) {
              res = sString(res)
              if (res.length > 480) {
                clog.debug(`run ${filename} result:`, res)
                res = res.slice(0, 480) + '...'
              }
              clog.info(`run ${filename} result:`, res)
            }
          }).catch(e=>{
            resolve(e.message)
            clog.error('run', filename, 'error:', errStack(e))
          })
        })
      })
    }
  }

  let rawjs = (addContext.type === 'rawcode') ? filename : Jsfile.get(filename)
  if (rawjs === false) {
    clog.error(filename, 'not exist.')
    return Promise.resolve(filename + ' not exist.')
  }
  if (addContext.type === 'rawcode') {
    filename = addContext.rename || addContext.from || 'rawcode.js'
  }
  if (addContext.rename) {
    Jsfile.put(addContext.rename, rawjs)
  }

  return new Promise((resolve, reject)=>{
    runJS(filename, rawjs, addContext).then(res=>{
      resolve(res)
      if (res !== undefined) {
        res = sString(res)
        if (res.length > 480) {
          clog.debug(`run ${filename} result:`, res)
          res = res.slice(0, 480) + '...'
        }
        clog.info(`run ${filename} result:`, res)
      }
    }).catch(e=>{
      clog.error('run', filename, 'error:', errStack(e))
      resolve(e.message)
    })
  })
}

module.exports = { runJSFile, CONFIG_RUNJS }