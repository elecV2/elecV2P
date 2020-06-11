const vm = require('vm')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const { logger, feedAddItem, now, errStack, downloadfile } = require('../utils')
const clog = new logger({ head: 'runJSFile', level: 'debug' })

const context = require('./context')

const StoreFolder = path.join(__dirname, 'Store')
const JSFolder = path.join(__dirname, 'JSFile')
if(!fs.existsSync(StoreFolder)) fs.mkdirSync(StoreFolder)
if(!fs.existsSync(JSFolder)) fs.mkdirSync(JSFolder)

const CONFIG_RUNJS = {
  timeout_jsrun: 5000,
  intervals: 86400,       // 远程 JS 更新时间，单位：秒。 默认：一天
  numtofeed: 50,          // 每运行 { numtofeed } 次 JS, 添加一个 Feed item

  jslogfile: true,        // 是否将 JS 运行日志保存到 logs 文件夹

  SurgeEnable: false,     // 兼容 Surge 脚本
  QuanxEnable: false,     // 兼容 Quanx 脚本。都为 false 时，会进行自动判断
}

const runstatus = {
  start: now(),
  times: CONFIG_RUNJS.numtofeed
}

async function taskCount(filename) {
  if (/test/.test(filename)) return
  if (runstatus[filename]) {
    runstatus[filename]++
  } else {
    runstatus[filename] = 1
  }
  runstatus.times--

  clog.debug('JS 脚本运行次数统计：', runstatus)
  if (runstatus.times == 0) {
    let des = []
    for (let jsname in runstatus) {
      if (jsname != 'times' && jsname != 'start') {
        des.push(`${jsname}: ${runstatus[jsname]} 次`)
        delete runstatus[jsname]
      }
    }
    feedAddItem('运行 JS ' + CONFIG_RUNJS.numtofeed + ' 次啦！', `从 ${runstatus.start} 开始： ` + des.join(', '))
    runstatus.times = CONFIG_RUNJS.numtofeed
    runstatus.start = now()
  }
}

function runJS(filename, jscode, addContext) {
  const fconsole = new logger({ head: filename, file: CONFIG_RUNJS.jslogfile ? filename : '' })
  const newContext = new context({ fconsole })

  if (CONFIG_RUNJS.SurgeEnable || (CONFIG_RUNJS.QuanxEnable == false && /\$httpClient|\$persistentStore|\$notification/.test(jscode))) {
    clog.debug(`${filename} 使用 Surge 兼容模式运行`)
    newContext.add({ surge: true })
  } else if (CONFIG_RUNJS.QuanxEnable || /\$task|\$prefs|\$notify/.test(jscode)) {
    clog.debug(`${filename} 使用 Quantumult X 兼容模式运行`)
    newContext.add({ quanx: true })
  }

  if (addContext) {
    if (addContext.type) taskCount(filename)
    newContext.add({ addContext })
  }

  try {
    clog.notify('runjs:', filename)
    const newScript = new vm.Script(jscode)
    return newScript.runInNewContext(newContext.final, { displayErrors: true, timeout: CONFIG_RUNJS.timeout_jsrun })
  } catch(error) {
    let errmsg = errStack(error)
    fconsole.error(errmsg)
    return { error: errmsg }
  }
}

function runJSFile(filename, addContext) {
  if (/^https?:/.test(filename)) {
    var url = filename
    filename = url.split('/').pop()
    let filePath = path.join(__dirname, 'JSFile', filename)
    if (!fs.existsSync(filePath) || new Date().getTime() - fs.statSync(filePath).mtimeMs > CONFIG_RUNJS.intervals*1000) {
      return new Promise((resolve, reject)=>{
        downloadfile(url, filePath).then(()=>{
          resolve(runJS(filename, fs.readFileSync(filePath), addContext))
        }).catch(error=>{
          clog.error('运行', url, '出现错误，请尝试下载到服务器再运行', errStack(error))
          reject(error)
        })
      })
    }
  }

  if (addContext && addContext.type == 'jstest') {
    var JsStr = filename
    filename = 'jstest'
  } else {
    let filePath = path.join(__dirname, 'JSFile', filename)
    if (!fs.existsSync(filePath)) {
      clog.error(filename, '不存在')
      return filename + '不存在'
    }
    var JsStr = fs.readFileSync(filePath, 'utf8')
  }

  return runJS(filename, JsStr, addContext)
}

module.exports = { runJSFile }