const vm = require('vm')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const { logger, feed, now, errStack, downloadfile } = require('../utils')
const clog = new logger({ head: 'runJSFile', level: 'debug' })

const { wsSer } = require('../func')

const context = require('./context')

const StoreFolder = path.join(__dirname, 'Store')
const JSFolder = path.join(__dirname, 'JSFile')
if(!fs.existsSync(StoreFolder)) fs.mkdirSync(StoreFolder)
if(!fs.existsSync(JSFolder)) fs.mkdirSync(JSFolder)

const config = {
  timeout_jsrun: 5000,
  intervals: 86400,       // 远程 JS 更新时间，单位：秒。 默认：一天
  numtofeed: 50,          // 每运行 {numtofeed} 次 JS, 添加一个 Feed item

  jslogfile: true,        // 是否将 JS 运行日志保存到 logs 文件

  SurgeEnable: false,     // 兼容 Surge 脚本
  QuanxEnable: false,     // 兼容 Quanx 脚本。都为 false 时，会进行自动判断
}

const runStatus = {
  start: now(),
  times: config.numtofeed
}

function taskCount(filename) {
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

  const newScript = new vm.Script(jscode)

  if (config.QuanxEnable == false && (config.SurgeEnable || /\$httpClient|\$persistentStore|\$notification/.test(jscode))) {
    clog.debug(`检测到 ${filename} 为 Surge 脚本，使用 Surge 兼容模式`)
    newContext.add({ surge: true })
    config.SurgeEnable = true
  }
  if (config.SurgeEnable == false && (config.QuanxEnable || /\$task|\$prefs|\$notify/.test(jscode))) {
    clog.debug(`检测到 ${filename} 为 Quantumult X 脚本，使用 Quantumult X 兼容模式`)
    newContext.add({ quanx: true })
    config.QuanxEnable = true
  }

  if (addContext) {
    if (addContext.cb) {
      newContext.final.console.setcb(addContext.cb)
    } else if (addContext.type) {
      newContext.final.console.setcb(wsSer.send.func(addContext.type))
    }
    if (addContext.$request) {
      addContext.$request.headers = addContext.$request.requestOptions.headers
      let reqData = addContext.$request.requestData
      addContext.$request.body = typeof(reqData) == 'object' ? (Buffer.isBuffer(reqData) ? reqData.toString() : JSON.stringify(reqData)) : reqData
    }
    if (addContext.$response) {
      addContext.$response.headers = addContext.$response.header
      let resData = addContext.$response.body
      addContext.$response.body = typeof(resData) == 'object' ? (Buffer.isBuffer(resData) ? resData.toString() : JSON.stringify(resData)) : resData
    }
    if (addContext.type) taskCount(filename)
    newContext.add({ addContext })
  }

  try {
    clog.notify('runjs:', filename)
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
          clog.error('运行', url, '出现错误，请尝试下载到服务器再运行')
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