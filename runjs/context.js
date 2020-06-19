const fs = require('fs')
const axios = require('axios')
const path = require('path')
const qs = require('qs')

const { logger, errStack, feedPush, iftttPush, store } = require('../utils')
const clog = new logger({ head: 'context', level: 'debug' })

const exec = require('../func/exec')

const CONFIG_CONTEXT = {
  timeout_axios: 5000
}

function getHeaders(req) {
  if (req.headers) {
    // delete Content-Length 能解决部分问题，也可能引入新的 bug（待观察）
    delete req.headers['Content-Length']
    try {
      return typeof(req.headers) == 'object' ? req.headers : JSON.parse(req.headers)
    } catch(e) {
      clog.error('req headers error:', errStack(e))
    }
  } 
  return {}
}

function getReqBody(req) {
  if (req.body) return req.body
  if (/\?/.test(req.url)) {
    const spu = req.url.split('?')
    if (/json/.test(req.headers["Content-Type"])) {
      return qs.parse(spu[1])
    } else {
      return spu[1]
    }
  }
  return null
}

function getResBody(body) {
  return typeof(body) == 'object' ? (Buffer.isBuffer(body) ? body.toString() : JSON.stringify(body)) : body
}

class contextBase {
  constructor({ fconsole }){
    this.console = fconsole || clog
  }

  __dirname = process.cwd()
  setTimeout = setTimeout
  setInterval = setInterval
  $axios = axios
  $exec = exec
  $store = {
    get: (key) => {
      this.console.debug('get value for', key)
      store.get(key)
    },
    put: (value, key) => {
      this.console.debug('get value for', key)
      store.put(value, key)
    },
    delete: (key) => {
      if(store.delete(key)) this.console.notify('delete store key:', key)
      else this.console.error('fail!', key, '可能并不存在')
    }
  }
  $feed = {
    push(title, description, url) {
      feedPush(title, description, url)
    },
    ifttt(title, description, url) {
      iftttPush(title, description, url)
    }
  }
  $done = (data) => {
    this.console.debug('$done:', data)
    this.$result = data ? typeof(data) === 'object' ? data : { body: data } : {}
    return this.$result
  }
}

class surgeContext {
  constructor({ fconsole }){
    this.fconsole = fconsole || clog
  }

  $httpClient = {
    // surge http 请求
    get: (req, cb) => {
      axios({
        url: req.url,
        headers: getHeaders(req),
        data: getReqBody(req),
        timeout: CONFIG_CONTEXT.timeout_axios,
        method: 'get'
      }).then(response=>{
        let newres = {
          status: response.status,
          headers: response.headers,
          body: getResBody(response.data)
        }
        if(cb) cb(null, newres, newres.body)
      }).catch(error=>{
        clog.error('httpClient.get error:', error)
        if(cb) {
          try {
            cb(error, null, "{error: '$httpClient.get no response'}")
          } catch(err) {
            this.fconsole.error('httpClient.get cb error:', errStack(err))
          }
        }
      })
    },
    post: (req, cb) => {
      axios({
        url: req.url,
        headers: getHeaders(req),
        data: getReqBody(req),
        timeout: CONFIG_CONTEXT.timeout_axios,
        method: 'post'
      }).then(response=>{
        let newres = {
          status: response.status,
          headers: response.headers,
          body: getResBody(response.data)
        }
        if(cb) cb(null, newres, newres.body)
      }).catch(error=>{
        clog.error('httpClient.post error:', error)
        if(cb) {
          try {
            cb(error, null, `{ error: ${ error } }`)
          } catch(error) {
            this.fconsole.error(errStack(error))
          }
        }
      })
    }
  }
  $persistentStore = {
    read(key) {
      return store.get(key, this.fconsole.debug)
    },
    write(value, key){
      return store.put(value, key, this.fconsole.debug)
    }
  }
  $notification = {
    // Surge 通知
    post: (...data) => {
      this.fconsole.notify(data.join(' '))
    }
  }
}

class quanxContext {
  constructor({ fconsole }){
    this.fconsole = fconsole || clog
  }

  $task = {
    // Quantumult X 网络请求
    fetch: (req, cb) => {
      return new Promise((resolve, reject) => {
        axios({
          url: req.url,
          headers: getHeaders(req),
          data: getReqBody(req),
          method: req.method || 'get',
          timeout: CONFIG_CONTEXT.timeout_axios
        }).then(response=>{
          let res = {
                statusCode: response.status,
                headers: response.headers,
                body: getResBody(response.data)
              }
          if (cb) cb(res)
          resolve(res)
        }).catch(error=>{
          let err = errStack(error)
          this.fconsole.error(err)
          if(cb) cb(err)
          reject({ error: err })
        })
      })
    }
  }
  $prefs = {
    valueForKey(key) {
      return store.get(key, this.fconsole.debug)
    },
    setValueForKey(value, key) {
      return store.put(value, key, this.fconsole.debug)
    }
  }
  $notify = (...data)=>{
    // Quantumultx 通知
    this.fconsole.notify(data.join(' '))
  }
}

module.exports = class {
  constructor({ fconsole }){
    this.final = new contextBase({ fconsole })
  }

  add({ surge, quanx, addContext, $require }){
    if (surge) {
      this.final.console.debug('启用 surge 兼容模式')
      Object.assign(this.final, new surgeContext({ fconsole: this.final.console }))
    } else if (quanx) {
      this.final.console.debug('启用 quanx 兼容模式')
      Object.assign(this.final, new quanxContext({ fconsole: this.final.console }))
    }
    if ($require) {
      this.final.console.debug('require module', $require)
      this.final[$require] = require($require)
    }
    if (addContext) {
      Object.assign(this.final, addContext)
    }
  }
}