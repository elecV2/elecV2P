const vm = require('vm')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const { logger, feed, now, downloadfileSync } = require('../utils')
const { wsSer } = require('../func')

const clog = new logger({ head: 'runJSFile', level: 'debug' })
// clog.setlevel('debug', true)

const StoreFolder = path.join(__dirname, 'Store')
const JSFolder = path.join(__dirname, 'JSFile')
if(!fs.existsSync(StoreFolder)) fs.mkdirSync(StoreFolder)
if(!fs.existsSync(JSFolder)) fs.mkdirSync(JSFolder)


const config = {
  timeout_jsrun: 5000,
  timeout_axios: 5000,
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

module.exports = (filename, addContext) => {
  if (addContext && addContext.type == 'jstest') {
    var JsStr = filename
    filename = 'jstest'
  } else {
    if (/^https?:/.test(filename)) {
      var url = filename
      filename = url.split('/').pop()
    }
    let filePath = path.join(__dirname, 'JSFile', filename)
    if (url && (!fs.existsSync(filePath) || new Date().getTime() - fs.statSync(filePath).mtimeMs > config.intervals*1000)) {
      try {
        downloadfileSync(url, filePath)
      } catch(e) {
        clog.error(e)
        return
      }
    } else if (!fs.existsSync(filePath)) {
      clog.error(filename, '不存在')
      return
    }

    var JsStr = fs.readFileSync(path.join(JSFolder, filename), 'utf8')
  }


  let fconsole = new logger({ head: filename, file: config.jslogfile ? filename : '' })

  if (addContext) {
    if (addContext.cb) {
      fconsole.setcb(addContext.cb)
    } else if (addContext.type) {
      fconsole.setcb(wsSer.send.func(addContext.type))
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
  }

  const newContext = {
    console: fconsole,
    setTimeout,
    $done: (data) => {
      if(data) {
        // fconsole.notify('$done:', data)
        return data
      }
    },
    $axios: async (req, cb)=>{
      // 普通 axios 请求
      req.timeout = config.timeout_axios
      try {
        const response = await axios(req)
        if(cb) cb(response)
        return response
      } catch (error) {
        fconsole.error(error)
        if(cb) cb({ error })
        return { error }
      }
    },
    $httpClient: {
      // surge http 请求
      get: async (req, cb)=>{
        req.timeout = config.timeout_axios
        if (req.body) {
          req.data = req.body
        }
        let error, response
        req.method = 'get'
        try {
          response = await axios(req)
        } catch (err) {
          error = err
        }
        if(response) {
          let newres = {
            status: response.status,
            headers: response.headers,
            body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
          }
          if(cb) cb(error, newres, newres.body)
        } else {
          if(cb) cb(error, null, '$httpClient post have no response')
        }
      },
      post: async (req, cb)=>{
        const spu = req.url.split('?')
        const newreq = {
          url: spu[0],
          headers: req.headers,
          data: req.body || spu[1] || '',
          timeout: config.timeout_axios,
          method: 'post'
        }
        let error, response
        try {
          response = await axios(newreq)
        } catch (err) {
          error = err
        }
        if(response) {
          let newres = {
            status: response.status,
            headers: response.headers,
            body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
          }
          if(cb) cb(error, newres, newres.body)
        } else {
          if(cb) cb(error, null, '$httpClient post have no response')
        }
      }
    },
    $task: {
      // Quantumult X 网络请求
      fetch: async (req, cb)=>{
        let newreq = req
        if (/post/i.test(req.method)) {
          const spu = req.url.split('?')
          newreq = {
            url: spu[0],
            headers: req.headers,
            data: req.body || spu[1] || '',
            method: 'post'
          }
        } else if (req.body) {
          newreq.data = req.body
        }
        newreq.timeout = config.timeout_axios

        let error, response
        try {
          response = await axios(newreq)
        } catch (err) {
          error = err
        }

        return new Promise((resolve, reject) => {
          if (response) {
            let res = {
                  statusCode: response.status,
                  headers: response.headers,
                  body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
                }
            if (cb) cb(res)
            resolve(res)
          } else {
            reject({ error })
          }
        })
      }
    },
    $store: {
      get: (key) => {
        fconsole.debug('get value for', key)
        if (fs.existsSync(path.join(__dirname, 'Store', key))) {
          return fs.readFileSync(path.join(__dirname, 'Store', key), 'utf8')
        }
        return false
      },
      put: (value, key) => {
        fconsole.debug('put value to', key)
        try {
          fs.writeFileSync(path.join(__dirname, 'Store', key), value, 'utf8')
          return true
        } catch {
          return false
        }
      }
    },
    $persistentStore: {
      read: (key)=>{
        return newContext.$store.get(key)
      },
      write: (value, key)=>{
        return newContext.$store.put(value, key)
      }
    },
    $prefs: {
      valueForKey: (key)=>{
        return newContext.$store.get(key)
      },
      setValueForKey: (value, key)=>{
        return newContext.$store.put(value, key)
      }
    },
    $notification: {
      // Surge 通知
      post: (...data) => {
        fconsole.notify(data.join(' '))
      }
    },
    $notify: (...data) => {
      // Quantumultx 通知
      fconsole.notify(data.join(' '))
    }
  }

  if ((config.SurgeEnable || config.QuanxEnable) == false && /\$httpClient|\$persistentStore|\$notification/.test(JsStr)) {
    clog.debug(`检测到 ${filename} 为 Surge 脚本，使用 Surge 兼容模式`)
    config.SurgeEnable = true
  }
  if ((config.SurgeEnable || config.QuanxEnable) == false && /\$task|\$prefs|\$notify/.test(JsStr)) {
    clog.debug(`检测到 ${filename} 为 Quantumult X 脚本，使用 Quantumult X 兼容模式`)
    config.QuanxEnable = true
  }

  if (config.QuanxEnable == false) {
    Object.assign(newContext, {$task: undefined, $prefs: undefined, $notify: undefined})
  }
  if (config.SurgeEnable == false) {
    Object.assign(newContext, {$httpClient: undefined, $persistentStore: undefined, $notification: undefined})
  }

  const newScript = new vm.Script(JsStr)

  try {
    clog.notify('runjs:', filename)
    var fdata = newScript.runInNewContext({ ...newContext, ...addContext}, { displayErrors: true, timeout: config.timeout_jsrun })

    if (addContext.type) {
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
  } catch(error) {
    var fdata = { error }
    clog.error(error)
  }

  return fdata
}