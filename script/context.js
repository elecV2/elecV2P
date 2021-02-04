const qs = require('qs')
const cheerio = require('cheerio')

const { CONFIG } = require('../config')
const { errStack, euid, sType, sString, sJson, feedPush, iftttPush, barkPush, custPush, store, eAxios, jsfile, file, downloadfile } = require('../utils')
const { wsSer, message } = require('../func/websocket')
const exec = require('../func/exec')
// const clog = new logger({ head: 'context', level: 'debug' })

const formReq = {
  headers(req) {
    const newheaders = sJson(req.headers, true)
    delete newheaders['Content-Length']
    delete newheaders['content-length']
    if (!newheaders['Content-Type'] && !newheaders['content-type']) newheaders['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    return newheaders
  },
  body(req) {
    // if (sType(req) === 'string' || !req.method || req.method.toLowerCase() === 'get') return null
    const reqb = req.data || req.body
    if (reqb) {
      if (!req.headers || Object.keys(req.headers).length === 0) return reqb
      if (sType(reqb) === 'string' && /json/i.test(req.headers["Content-Type"])) {
        return sJson(reqb, true)
      }
      if (sType(reqb) === 'object' && /x-www-form-urlencoded/i.test(req.headers["Content-Type"])) {
        return qs.stringify(reqb)
      }
      return reqb
    }
    return null
  },
  uest(req, method) {
    delete req.opts
    return {
      url: req.url || req,
      headers: this.headers(req),
      method: req.method || method || 'get',
      data: this.body(req)
    }
  }
}

class contextBase {
  constructor({ fconsole }){
    this.console = fconsole
  }

  setTimeout = setTimeout
  setInterval = setInterval
  clearTimeout = clearTimeout
  clearInterval = clearInterval

  __dirname = process.cwd()
  __home = CONFIG.homepage
  __efss = file.get(CONFIG.efss.directory, 'path')
  $ws = wsSer
  $exec = exec
  $store = store
  $axios = eAxios
  $cheerio = cheerio
  $message = message
  $download = downloadfile
  $evui = (obj, callback) => {
    if (sType(obj) !== 'object') {
      this.console.error('$evui expect a object in first arguments')
      return
    }
    if (wsSer.recverlists.length === 0) {
      return Promise.reject('websocket is not ready yet, cant transfer $evui data to client')
    }
    if (!obj.id) obj.id = euid()
    wsSer.send({ type: 'evui', data: { type: 'neweu', data: obj }})

    if (!callback && (obj.cb || obj.callback)) {
      callback = obj.cb || obj.callback
      delete obj.cb
      delete obj.callback
    }

    return new Promise((resolve, reject)=>{
      if (obj.cbable) {
        wsSer.recv[obj.id] = data => {
          this.console.debug('$evui id:', obj.id, ', title:', obj.title, ', return data:', data)
          if (data === 'close') {
            wsSer.recv[obj.id] = null
            resolve(obj.title + ' is closed')
          } else if (typeof callback === 'function') {
            callback(data)
          } else {
            this.console.debug('a callback function is expect to handle the data')
          }
        }
      } else {
        resolve('$evui is finished')
      }
    })
  }
  $feed = {
    push(title, description, url) {
      feedPush(title, description, url)
    },
    ifttt(title, description, url) {
      iftttPush(title, description, url)
    },
    bark(title, description, url) {
      barkPush(title, description, url)
    },
    cust(title, description, url) {
      custPush(title, description, url)
    }
  }
  $done = (data) => {
    this.console.debug('$done:', data)
    this.$result = data !== undefined ? sType(data) === 'object' ? data : { body: data } : {}
    return this.$result
  }
}

class surgeContext {
  constructor({ fconsole }){
    this.fconsole = fconsole
  }

  surgeRequest(req, cb) {
    let error = null,
        resps = {},
        sbody  = ''
    eAxios(formReq.uest(req)).then(response=>{
      resps = {
        status: response.status,
        headers: response.headers,
      }
      sbody = sString(response.data)
    }).catch(err=>{
      this.fconsole.error('$httpClient', req.method, req.url, err.message)
      if (err.response) {
        error = err.message
        resps = {
          status: err.response.status,
          headers: err.response.headers,
        }
        sbody = sString(err.response.data)
      } else if (err.request) {
        error = `$httpClient ${req.method} ${req.url} error: ${err.message}`
        sbody = sString(req)
      } else {
        error = err.message
        sbody = errStack(err)
      }
    }).finally(()=>{
      if(cb && sType(cb) === 'function') {
        try {
          let cbres = cb(error, resps, sbody)
          if (sType(cbres) === 'promise') {
            cbres.catch(err=>this.fconsole.error('$httpClient', req.method, req.url, 'async cb error:', errStack(err, true)))
          }
        } catch(err) {
          this.fconsole.error('$httpClient', req.method, req.url, 'cb error:', errStack(err, true))
        }
      }
    })
  }

  $httpClient = {
    get: (req, cb) => {
      this.surgeRequest(req, cb)
    },
    post: (req, cb) => {
      if (sType(req) === 'string') req = { url: req }
      req.method = 'post'
      this.surgeRequest(req, cb)
    },
    put: (req, cb) => {
      if (sType(req) === 'string') req = { url: req }
      req.method = 'put'
      this.surgeRequest(req, cb)
    },
    delete: (req, cb) => {
      if (sType(req) === 'string') req = { url: req }
      req.method = 'delete'
      this.surgeRequest(req, cb)
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
      feedPush(data[0] + ' ' + data[1], data[2], data[3])
    }
  }
}

class quanxContext {
  constructor({ fconsole }){
    this.fconsole = fconsole
  }

  $task = {
    fetch: (req, cb) => {
      let resp = null
      return new Promise((resolve, reject) => {
        eAxios(formReq.uest(req)).then(response=>{
          resp = {
                statusCode: response.status,
                headers: response.headers,
                body: sString(response.data)
              }
          resolve(resp)
        }).catch(error=>{
          this.fconsole.error('$task.fetch', req.url, error.stack)
          resp = errStack(error)
          reject({ error: resp })
        }).finally(()=>{
          if(cb && sType(cb) === 'function') {
            try {
              let cbres = cb(resp)
              if (sType(cbres) === 'promise') {
                cbres.catch(err=>this.fconsole.error('$task.fetch async cb error:', errStack(err, true)))
              }
            } catch(err) {
              this.fconsole.error('$task.fetch cb error:', errStack(err, true))
            }
          }
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
    feedPush(data[0] + ' ' + data[1], data[2], data[3])
  }
}

class context {
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
    if (addContext) {
      Object.assign(this.final, addContext)
    }
  }
}

module.exports = { context }