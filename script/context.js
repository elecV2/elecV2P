const qs = require('qs')
const cheerio = require('cheerio')

const { CONFIG } = require('../config')
const { logger, errStack, feedPush, iftttPush, store, eAxios, jsfile } = require('../utils')
const clog = new logger({ head: 'context', level: 'debug' })

const exec = require('../func/exec')

const formReq = {
  getHeaders(req) {
    let newheaders = {}
    if (req.headers) {
      try {
        newheaders = typeof(req.headers) === 'object' ? req.headers : JSON.parse(req.headers)
      } catch(e) {
        clog.error('req headers error:', errStack(e))
      }
      delete newheaders['Content-Length']
    }
    return newheaders
  },
  getBody(req) {
    if (req.body) return req.body
    let url = req.url || req
    if (/\?/.test(url)) {
      const spu = url.split('?')
      if (req.headers && /json/.test(req.headers["Content-Type"])) {
        return qs.parse(spu[1])
      } else {
        return spu[1]
      }
    }
    return null
  },
  uest(req, method) {
    const freq = {
      url: encodeURI(req.url || req),
      headers: this.getHeaders(req),
      method: req.method || method || 'get'
    }
    if (freq.method !== 'get') {
      freq.data = this.getBody(req)
    }
    return freq
  }
}

function getResBody(body) {
  return typeof(body) === 'object' ? (Buffer.isBuffer(body) ? body.toString() : JSON.stringify(body)) : body
}

class contextBase {
  constructor({ fconsole = clog }){
    this.console = fconsole
  }

  __dirname = process.cwd()
  $axios = eAxios
  $exec = exec
  $cheerio = cheerio
  $store = {
    get: (key) => {
      this.console.debug('get value for', key)
      return store.get(key)
    },
    put: (value, key) => {
      this.console.debug('get value for', key)
      return store.put(value, key)
    },
    delete: (key) => {
      if(store.delete(key)) this.console.notify('delete store key:', key)
      else this.console.error('fail!', key, 'dont exist')
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
  constructor({ fconsole = clog }){
    this.fconsole = fconsole 
  }

  $httpClient = {
    get: (req, cb) => {
      eAxios(formReq.uest(req)).then(response=>{
        let newres = {
          status: response.status,
          headers: response.headers,
          body: getResBody(response.data)
        }
        if(cb) cb(null, newres, newres.body)
      }).catch(error=>{
        clog.error('httpClient.get error:', error)
        if(cb) {
          error = errStack(error)
          try {
            cb(error, null, `{error: '${error}'}`)
          } catch(err) {
            this.fconsole.error('httpClient.get cb error:', errStack(err))
          }
        }
      })
    },
    post: (req, cb) => {
      eAxios(formReq.uest(req, 'post')).then(response=>{
        let newres = {
          status: response.status,
          headers: response.headers,
          body: getResBody(response.data)
        }
        if(cb) cb(null, newres, newres.body)
      }).catch(error=>{
        clog.error('httpClient.post error:', error)
        if(cb) {
          error = errStack(error)
          try {
            cb(error, null, `{ error: '${ error }' }`)
          } catch(error) {
            this.fconsole.error(errStack(error))
          }
        }
      })
    }
  }
  $persistentStore = {
    read(key) {
      return store.get(key)
    },
    write(value, key){
      return store.put(value, key)
    }
  }
  $notification = {
    post: (...data) => {
      this.fconsole.notify(data.join(' '))
      if (CONFIG.JSIFTTT) iftttPush(data[0], data[1], data[2])
    }
  }
}

class quanxContext {
  constructor({ fconsole = clog }){
    this.fconsole = fconsole
  }

  $task = {
    fetch: (req, cb) => {
      return new Promise((resolve, reject) => {
        eAxios(formReq.uest(req)).then(response=>{
          let res = {
                statusCode: response.status,
                headers: response.headers,
                body: getResBody(response.data)
              }
          if (cb) cb(res)
          resolve(res)
        }).catch(error=>{
          error = errStack(error)
          this.fconsole.error(error)
          if(cb) cb(error)
          reject({ error })
        })
      })
    }
  }
  $prefs = {
    valueForKey(key) {
      return store.get(key)
    },
    setValueForKey(value, key) {
      return store.put(value, key)
    }
  }
  $notify = (...data)=>{
    this.fconsole.notify(data.join(' '))
    if (CONFIG.JSIFTTT) iftttPush(data[0], data[1], data[2])
  }
}

class context {
  constructor({ fconsole = clog }){
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
      if (/^\.\//.test($require)) {
        this.final[$require.split('/').pop().replace(/\.js$/, '')] = require(jsfile.get($require, 'path'))
      } else {
        this.final[$require] = require($require)
      }
    }
    if (addContext) {
      Object.assign(this.final, addContext)
    }
  }
}

module.exports = { context }