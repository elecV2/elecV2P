const vm = require('vm')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const { logger } = require('../utils')
const { wsSerSend } = require('../func')

const clog = new logger({ head: 'runJSFile', cb: wsSerSend.logs })

const StoreFolder = path.join(__dirname, 'Store')
const JSFolder = path.join(__dirname, 'JSFile')
const timeout_jsrun = 5000
const timeout_axios = 5000

const SurgeEnable = true      // 兼容 Surge 脚本（默认）
const QuanxEnable = false     // 兼容 Quanx 脚本

if(!fs.existsSync(StoreFolder)) fs.mkdirSync(StoreFolder)
if(!fs.existsSync(JSFolder)) fs.mkdirSync(JSFolder)

function storeGet(key) {
  clog.debug('get value for', key)
  if (fs.existsSync(path.join(__dirname, 'Store', key))) {
    return fs.readFileSync(path.join(__dirname, 'Store', key), 'utf8')
  }
  return ''
}

function storePut(value, key) {
  fs.writeFileSync(path.join(__dirname, 'Store', key), value, 'utf8')
  return true
}

module.exports = function (filename, addContext) {
  if (!fs.existsSync(path.join(JSFolder, filename))) {
    clog.error(filename, '不存在')
    return
  }
  const newContext = {
    console: new logger({ head: filename, cb: wsSerSend.logs }),
    setTimeout,
    $evData: {},
    $done: (data) => {
      if(data) {
        clog.debug(filename, '$done data:', data)
        newContext.$evData = data
      }
    },
    $axios: async (req, cb)=>{
      // 普通 axios 请求
      req.timeout = timeout_axios
      try {
        const response = await axios(req)
        cb(response)
      } catch (error) {
        clog.error(error)
      }
    },
    $httpClient: {
      // surge http 请求
      get: async (req, cb)=>{
        req.timeout = timeout_axios
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
          cb(error, newres, newres.body)
        } else {
          cb(error, null, '$httpClient post have no response')
        }
      },
      post: async (req, cb)=>{
        const spu = req.url.split('?')
        const newreq = {
          url: spu[0],
          headers: req.headers,
          data: req.body || spu[1] || '',
          timeout: timeout_axios,
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
          cb(error, newres, newres.body)
        } else {
          cb(error, null, '$httpClient post have no response')
        }
      }
    },
    $task: {
      // Quantumult X 网络请求
      fetch: (req)=>{
        req.timeout = timeout_axios
        if (req.body) {
          req.data = req.body
        }
        return new Promise(async (resolve, reject) => {
          const response = await axios(req)
          if (response) {
            resolve({
              status: response.status,
              headers: response.headers,
              body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
            })
          } else {
            resolve({ body: 'no response' })
          }
        })
      }
    },
    $persistentStore: {
      read: (key)=>{
        return storeGet(key)
      },
      write: (value, key)=>{
        storePut(value, key)
      }
    },
    $prefs: {
      valueForKey: (key)=>{
        return storeGet(key)
      },
      setValueForKey: (value, key)=>{
        storePut(value, key)
      }
    },
    $notification: {
      // Surge 通知，别动 function
      post: function () {
        clog.notify([...arguments].join(' '))
      }
    },
    $notify: function () {
      // Quantumultx 通知
      clog.notify([...arguments].join(' '))
    }
  }

  if (QuanxEnable == false) {
    Object.assign(newContext, {$task: undefined, $prefs: undefined, $notify: undefined})
  }
  if (SurgeEnable == false) {
    Object.assign(newContext, {$httpClient: undefined, $persistentStore: undefined, $notification: undefined})
  }

  if (addContext && addContext.$request) {
    addContext.$request.headers = addContext.$request.requestOptions.headers
    let reqData = addContext.$request.requestData
    addContext.$request.body = typeof(reqData) == 'object' ? (Buffer.isBuffer(reqData) ? reqData.toString() : JSON.stringify(reqData)) : reqData
  }
  if (addContext && addContext.$response) {
    addContext.$response.headers = addContext.$response.header
  }

  const newScript = new vm.Script(fs.readFileSync(path.join(JSFolder, filename), 'utf8'))

  try {
    clog.info('runjs:', filename)
    newScript.runInNewContext({ ...newContext, ...addContext}, { timeout: timeout_jsrun })
  } catch(error) {
    clog.error(error)
  }

  return newContext.$evData ? (typeof(newContext.$evData) == "object" ? newContext.$evData : newContext.$evData) : ''
}