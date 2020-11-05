const qs = require('qs')
const cheerio = require('cheerio')

const { CONFIG } = require('../config')
const { logger, errStack, sType, sString, feedPush, iftttPush, store, eAxios, jsfile, file, downloadfile } = require('../utils')
const clog = new logger({ head: 'context', level: 'debug' })

const exec = require('../func/exec')

const formReq = {
  headers(req) {
    let newheaders = {}
    if (req.headers) {
      try {
        newheaders = sType(req.headers) === 'object' ? req.headers : JSON.parse(req.headers)
      } catch(e) {
        clog.error('req headers error:', errStack(e))
      }
      delete newheaders['Content-Length']
    }
    return newheaders
  },
  body(req) {
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
      headers: this.headers(req),
      method: req.method || method || 'get'
    }
    if (freq.method !== 'get') {
      freq.data = req.data || this.body(req)
    }
    return freq
  }
}

class contextBase {
  constructor({ fconsole = clog }){
    this.console = fconsole
  }

  __dirname = process.cwd()
  __home = CONFIG.homepage
  __efss = file.get(CONFIG.efss, 'path')
  $axios = eAxios
  $exec = exec
  $cheerio = cheerio
  $download = downloadfile
  $store = store
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
    this.$result = data !== undefined ? sType(data) === 'object' ? data : { body: data } : {}
    return this.$result
  }
}

class surgeContext {
  constructor({ fconsole = clog }){
    this.fconsole = fconsole
  }

  $httpClient = {
    get: (req, cb) => {
      let error = null,
          resps = {},
          sbody  = ''
      eAxios(formReq.uest(req)).then(response=>{
        resps = {
          status: response.status,
          headers: response.headers,
        }
        sbody = sString(response.data)
      }).catch(error=>{
        this.fconsole.error('httpClient.get error:', error.stack)
        if (error.response) {
          resps = {
            status: error.response.status,
            headers: error.response.headers,
          }
          sbody = sString(error.response.data)
        } else if (error.request) {
          error = 'request config error'
          sbody = sString(req)
        } else {
          sbody = error.message
          error = errStack(error)
        }
      }).finally(()=>{
        if(cb && sType(cb) === 'function') cb(error, resps, sbody)
      })
    },
    post: (req, cb) => {
      let error = null,
          resps = {},
          sbody  = ''
      eAxios(formReq.uest(req, 'post')).then(response=>{
        resps = {
          status: response.status,
          headers: response.headers,
        }
        sbody = sString(response.data)
      }).catch(error=>{
        this.fconsole.error('httpClient.post error:', error.stack)
        if (error.response) {
          resps = {
            status: error.response.status,
            headers: error.response.headers,
          }
          sbody = sString(error.response.data)
        } else if (error.request) {
          error = 'request config error'
          sbody = sString(req)
        } else {
          sbody = error.message
          error = errStack(error)
        }
      }).finally(()=>{
        if(cb && sType(cb) === 'function') cb(error, resps, sbody)
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
      this.fconsole.notify(data.map(arg=>sString(arg)).join(' '))
      iftttPush(data[0] + ' ' + data[1], data[2], data[3] ? data[3].url || data[3] : undefined)
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
                body: sString(response.data)
              }
          if (cb && sType(cb) === 'function') cb(res)
          resolve(res)
        }).catch(error=>{
          this.fconsole.error(error.stack)
          error = errStack(error)
          if(cb && sType(cb) === 'function') cb(error)
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
    this.fconsole.notify(data.map(arg=>sString(arg)).join(' '))
    iftttPush(data[0] + ' ' + data[1], data[2], data[3] ? data[3]["open-url"] || data[3]["media-url"] || data[3] : undefined)
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