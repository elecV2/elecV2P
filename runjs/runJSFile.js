const vm = require('vm')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const { logger, feed, now, errStack, downloadfile } = require('../utils')
const clog = new logger({ head: 'runJSFile', level: 'debug' })

const context = require('./context')

const StoreFolder = path.join(__dirname, 'Store')
const JSFolder = path.join(__dirname, 'JSFile')
if(!fs.existsSync(StoreFolder)) fs.mkdirSync(StoreFolder)
if(!fs.existsSync(JSFolder)) fs.mkdirSync(JSFolder)

const config = {
  timeout_jsrun: 5000,
  intervals: 86400,       // 远程 JS 更新时间，单位：秒。 默认：一天
  numtofeed: 50,          // 每运行 { numtofeed } 次 JS, 添加一个 Feed item

  jslogfile: true,        // 是否将 JS 运行日志保存到 logs 文件夹

  SurgeEnable: false,     // 兼容 Surge 脚本
  QuanxEnable: false,     // 兼容 Quanx 脚本。都为 false 时，会进行自动判断
}

const runStatus = {
  start: now(),
  times: config.numtofeed
}

async function taskCount(filename) {
  if (/test/.test(filename)) return
  if (runStatus[filename]) {
    runStatus[filename]++
  } else {
    runStatus[filename] = 1
  }
  runStatus.times--

  clog.debug('JS 脚本运行次数统计：', runStatus)
  if (runStatus.times == 0) {
    let des = []
    for (let jsname in runStatus) {
      if (jsname != 'times' && jsname != 'start') {
        des.push(`${jsname}: ${runStatus[jsname]} 次`)
        delete runStatus[jsname]
      }
    }
    feed.addItem('运行 JS ' + config.numtofeed + ' 次啦！', `从 ${runStatus.start} 开始： ` + des.join(', '))
    runStatus.times = config.numtofeed
    runStatus.start = now()
  }
}

function runJS(filename, jscode, addContext) {
  const fconsole = new logger({ head: filename, file: config.jslogfile ? filename : '' })
  const newContext = new context({ fconsole })

  if (config.SurgeEnable || (config.QuanxEnable == false && /\$httpClient|\$persistentStore|\$notification/.test(jscode))) {
    clog.debug(`${filename} 使用 Surge 兼容模式运行`)
    newContext.add({ surge: true })
  } else if (config.QuanxEnable || /\$task|\$prefs|\$notify/.test(jscode)) {
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
    return newScript.runInNewContext(newContext.final, { displayErrors: true, timeout: config.timeout_jsrun })
  } catch(error) {
    let errmsg = errStack(error)
    fconsole.error(errmsg)
    return { error: errmsg }
  }
}

module.exports = (filename, addContext) => {
  if (/^https?:/.test(filename)) {
    var url = filename
    filename = url.split('/').pop()
    let filePath = path.join(__dirname, 'JSFile', filename)
    if (!fs.existsSync(filePath) || new Date().getTime() - fs.statSync(filePath).mtimeMs > config.intervals*1000) {
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