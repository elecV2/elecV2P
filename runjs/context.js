const fs = require('fs')
const axios = require('axios')
const path = require('path')

const { logger, errStack } = require('../utils')

const clog = new logger({ head: 'context', level: 'debug' })

const config = {
  timeout_axios: 5000
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
  }
}

class surgeContext {
  constructor({ fconsole }){
    this.fconsole = fconsole || clog
  }

  $httpClient = {
    // surge http 请求
    get: (req, cb) => {
      if (req.headers) {
        try {
          req.headers = typeof(req.headers) == 'object' ? req.headers : JSON.parse(req.headers)
        } catch(e) {
          this.fconsole.error('post headers error:', errStack(e))
          req.headers = {}
        }
      } else {
        req.headers = {}
      }
      req.timeout = config.timeout_axios
      if (req.body) {
        req.data = req.body
      }
      req.method = 'get'
      axios(req).then(response=>{
        let newres = {
          status: response.status,
          headers: response.headers,
          body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
        }
        if(cb) {
          try {
            cb(null, newres, newres.body)
          } catch(error) {
            this.fconsole.error('cb error on', errStack(error))
          }
        }
      }).catch(error=>{
        if(cb) {
          try {
            cb(error, null, "{error: '$httpClient.get no response'}")
          } catch(error) {
            this.fconsole.error('httpClient.get cb error:', error)
          }
        } else {
          clog.error('httpClient.get error:', error)
        }
      })
    },
    post: (req, cb) => {
      if (req.headers) {
        try {
          req.headers = typeof(req.headers) == 'object' ? req.headers : JSON.parse(req.headers)
        } catch(e) {
          this.fconsole.error('post headers error:', errStack(e))
          req.headers = {}
        }
      } else {
        req.headers = {}
      }
      const spu = req.url.split('?')
      const newreq = {
        url: spu[0],
        headers: req.headers,
        data: req.body || spu[1] || '',
        timeout: config.timeout_axios,
        method: 'post'
      }
      axios(newreq).then(response=>{
        let newres = {
          status: response.status,
          headers: response.headers,
          body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
        }
        if(cb) {
          try {
            cb(null, newres, newres.body)
          } catch(error) {
            this.fconsole.error('$httpClient.post cb error on', errStack(error))
          }
        }
      }).catch(error=>{
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
      if (req.headers) {
        try {
          req.headers = typeof(req.headers) == 'object' ? req.headers : JSON.parse(req.headers)
        } catch(e) {
          this.fconsole.error('task fetch headers error:', errStack(e))
          req.headers = {}
        }
      } else {
        req.headers = {}
      }
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

      return new Promise((resolve, reject) => {
        axios(newreq).then(response=>{
          let res = {
                statusCode: response.status,
                headers: response.headers,
                body: typeof(response.data) == 'object' ? (Buffer.isBuffer(response.data) ? response.data.toString() : JSON.stringify(response.data)) : response.data
              }
          if (cb) {
            try {
              cb(res)
            } catch(error) {
              this.fconsole.error('task fetch cb error', errStack(error))
            }
          }
          resolve(res)
        }).catch(error=>{
          clog.error(error)
          reject({ error })
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
      Object.assign(this.final, addContext)
    }
  }
}