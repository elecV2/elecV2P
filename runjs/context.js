const fs = require('fs')
const axios = require('axios')
const path = require('path')
const qs = require('qs')

const { logger, errStack, feed } = require('../utils')
const clog = new logger({ head: 'context', level: 'debug' })

const { wsSer } = require('../func')

const config = {
  timeout_axios: 5000
}

function getHeaders(req) {
  if (req.headers) {
    delete req.headers['Content-Length']
    try {
      return typeof(req.headers) == 'object' ? req.headers : JSON.parse(req.headers)
    } catch(e) {
      clog.error('headers error:', errStack(e))
      return {}
    }
  } else {
    return {}
  }
}

function getBody(req) {
  if (req.body) return req.body
  if (/\?/.test(req.url)) {
    const spu = req.url.split('?')
    if (/json/.test(req.headers["Content-Type"])) {
      return qs.parse(spu[1])
    } else {
      return spu[1]
    }
  }
  return ''
}

const contextBase = {
  setTimeout,
  $axios(req) {
    // 普通 axios 请求
    req.timeout = config.timeout_axios
    return new Promise((resolve, reject)=>{
      axios(req).then(response=>{
        resolve(response)
      }).catch(error=>{
        clog.error('$axios error on', error)
        reject(error)
      })
    })
  },
  $store: {
    get(key) {
      clog.debug('get value for', key)
      if (fs.existsSync(path.join(__dirname, 'Store', key))) {
        return fs.readFileSync(path.join(__dirname, 'Store', key), 'utf8')
      }
      return false
    },
    put(value, key) {
      clog.debug('put value to', key)
      try {
        fs.writeFileSync(path.join(__dirname, 'Store', key), value, 'utf8')
        return true
      } catch {
        return false
      }
    }
  },
  $feed: {
    push(title, description) {
      feed.push(title, description)
    }
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
        data: getBody(req),
        timeout: config.timeout_axios,
        method: 'get'
      }).then(response=>{
        let newres = {
          status: response.status,
          headers: response.headers,
          body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
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
        data: getBody(req),
        timeout: config.timeout_axios,
        method: 'post'
      }).then(response=>{
        let newres = {
          status: response.status,
          headers: response.headers,
          body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
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
      return contextBase.$store.get(key)
    },
    write(value, key){
      return contextBase.$store.put(value, key)
    }
  }
  $notification = {
    // Surge 通知
    post: (...data) => {
      this.fconsole.notify(data.join(' '))
    }
  }
  $done = (data) => {
    if(data) {
      // this.fconsole.notify('$done:', data)
      return typeof(data) == 'object' ? data : { body: data }
    } 
    return {}
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
          data: getBody(req),
          method: req.method || 'get',
          timeout: config.timeout_axios
        }).then(response=>{
          let res = {
                statusCode: response.status,
                headers: response.headers,
                body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
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
      return contextBase.$store.get(key)
    },
    setValueForKey(value, key) {
      return contextBase.$store.put(value, key)
    }
  }
  $notify = (...data)=>{
    // Quantumultx 通知
    this.fconsole.notify(data.join(' '))
  }
  $done = (data)=>{
    if(data) {
      // this.fconsole.notify('$done:', data)
      return typeof(data) == 'object' ? data : { body: data }
    } 
    return {}
  }
}

module.exports = class {
  final = {...contextBase}

  constructor({ fconsole }){
    this.final.console = fconsole || clog
  }

  add({ surge, quanx, addContext }){
    if (surge) {
      Object.assign(this.final, new surgeContext({ fconsole: this.final.console }))
    } else if (quanx) {
      Object.assign(this.final, new quanxContext({ fconsole: this.final.console }))
    }
    if (addContext) {
      if (addContext.cb) {
        this.final.console.setcb(addContext.cb)
        delete addContext.cb
      } else if (addContext.type) {
        this.final.console.setcb(wsSer.send.func(addContext.type))
        delete addContext.type
      }
      Object.assign(this.final, addContext)
    }
  }
}