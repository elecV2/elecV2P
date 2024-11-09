const cheerio = require('cheerio')

const { CONFIG, CONFIG_Port } = require('../config')
const { errStack, euid, sType, sString, sJson, bEmpty, feedPush, iftttPush, barkPush, custPush, store, eAxios, jsfile, file, downloadfile, wsSer, sseSer, message } = require('../utils')

const { exec } = require('../func/exec')

const $cache = {
  vals: new Map(),
  get(key){
    return this.vals.get(key)
  },
  set(key, value){
    return this.vals.set(key, value)
  },
  put(value, key) {
    return this.vals.set(key, value)
  },
  delete(key){
    return this.vals.delete(key)
  },
  keys(){
    return [...this.vals.keys()]
  },
  clear(){
    return this.vals.clear()
  }
}

const $cacheProxy = new Proxy($cache, {
  set(target, prop, val){
    switch (prop) {
    case 'size':
      throw new Error('forbid redefine $cache prop ' + prop)
    case 'get':
    case 'set':
    case 'put':
    case 'keys':
    case 'delete':
    case 'clear':
      throw new Error('forbid redefine $cache method ' + prop)
    default:
      return target.vals.set(prop, val)
    }
  },
  get(target, prop){
    switch (prop) {
    case 'size':
      return target.vals.size
    case 'get':
    case 'set':
    case 'put':
    case 'keys':
    case 'delete':
    case 'clear':
      return target[prop].bind(target)
    default:
      return target.vals.get(prop)
    }
  }
})

class contextBase {
  constructor({ fconsole, name }){
    this.console = fconsole
    this.__name  = name

    this.$axios.get = (url, config = {})=>{
      return this.$axios({ url, method: 'get', ...config })
    }
    this.$axios.post = (url, config = {})=>{
      return this.$axios({ url, method: 'post', ...config })
    }
  }

  setTimeout = setTimeout
  setInterval = setInterval
  clearTimeout = clearTimeout
  clearInterval = clearInterval

  URL = URL
  module = module
  process = process
  exports = exports
  Buffer = Buffer
  TextEncoder = TextEncoder
  TextDecoder = TextDecoder
  URLSearchParams = URLSearchParams

  __version = CONFIG_Port.version
  __vernum  = CONFIG_Port.vernum
  __userid  = CONFIG_Port.userid
  __home = CONFIG.homepage
  __efss = file.get(CONFIG.efss.directory, 'path')
  $ws = {
    sse: sseSer.Send.bind(sseSer),
    send: wsSer.send
  }
  $exec = exec
  $cache = $cacheProxy
  $store = {
    get: (key, type) => {
      this.console.log('get store value from:', key)
      return store.get(key, type)
    },
    put: (value, key, options) => {
      // this 指向当前 class，不要修改此箭头函数的形式
      if (sType(options) === 'object') {
        if (!options.belong) {
          options.belong = this.__name
        }
      } else {
        options = {
          belong: this.__name,
          type: options
        }
      }
      this.console.log('put store value into:', key)
      return store.put(value, key, options)
    },
    set(key, value, options){
      // this 指向当前 $store
      return this.put(value, key, options)
    }
  }
  $prefs = {
    valueForKey(key) {
      return store.get(key, 'string')
    },
    setValueForKey: (value, key)=>{
      return store.put(value, key, { belong: this.__name })
    }
  }
  $persistentStore = {
    read(key) {
      return store.get(key, 'string')
    },
    write: (value, key) => {
      return store.put(value, key, { belong: this.__name })
    }
  }
  $axios = (request)=>{
    if (typeof(request) === 'string') {
      request = {
        url: request
      }
    }
    if (CONFIG.CONFIG_RUNJS.white?.enable && CONFIG.CONFIG_RUNJS.white.list?.length && CONFIG.CONFIG_RUNJS.white.list.includes(this.__name)) {
      // 白名单检测
      request.token = CONFIG.wbrtoken
    } else if (CONFIG.CONFIG_RUNJS.eaxioslog) {
      // 白名单之外才显示 url
      this.console.log(request.method || 'GET', request.url)
    }
    return eAxios(request, (CONFIG.CONFIG_RUNJS.proxy === false) ? false : null).then(res=>{
      return {
        status: res.status,
        statusCode: res.status,
        statusText: res.statusText,
        headers: res.headers,
        data: res.data,
        body: res.data,
      }
    }).catch(error=>{
      let err = new Error(`$axios ${request.method || 'GET'} ${request.url} Error: ${error.message || error}`);
      if (error.response) {
        let { request, config, ...res } = error.response;
        err.response = res;
      }
      if (error.stack) {
        err.stack = error.stack;
      }
      if (CONFIG.gloglevel === 'debug' && error.config) {
        err.config = {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
          headers: error.config.headers,
          timeout: error.config.timeout,
          responseType: error.config.responseType
        };
      }
      this.console.debug(err);
      throw err;
    });
  }
  $task = {
    fetch: (req, cb) => {
      if (typeof(req) === 'string') {
        req = {
          url: req
        }
      }
      if (CONFIG.CONFIG_RUNJS.white?.enable && CONFIG.CONFIG_RUNJS.white.list?.length && CONFIG.CONFIG_RUNJS.white.list.includes(this.__name)) {
        req.token = CONFIG.wbrtoken
      } else if (CONFIG.CONFIG_RUNJS.eaxioslog) {
        this.console.log(req.method || 'GET', req.url)
      }
      let resp = null
      return new Promise((resolve, reject) => {
        eAxios(req, (CONFIG.CONFIG_RUNJS.proxy === false) ? false : null).then(response=>{
          resp = {
            status: response.status,
            statusCode: response.status,
            headers: response.headers,
            body: sString(response.data)
          }
          if (resp['headers'] && resp['headers']['set-cookie'] && sType(resp['headers']['set-cookie']) === 'array') {
            resp['headers']['Set-Cookie'] = resp['headers']['set-cookie'].join(',')
          }
          resolve(resp)
        }).catch(error=>{
          resp = errStack(error)
          this.console.error('$task.fetch', req.url, resp)
          reject({ error: resp })
        }).finally(()=>{
          if(cb && sType(cb) === 'function') {
            return cb(resp)
          }
        }).catch(err=>{
          this.console.error('$task.fetch callback', errStack(err, true))
        })
      })
    }
  }
  httpRequest(req, cb) {
    if (typeof(req) === 'string') {
      req = {
        url: req
      }
    }
    if (CONFIG.CONFIG_RUNJS.white?.enable && CONFIG.CONFIG_RUNJS.white.list?.length && CONFIG.CONFIG_RUNJS.white.list.includes(this.__name)) {
      req.token = CONFIG.wbrtoken
    } else if (CONFIG.CONFIG_RUNJS.eaxioslog) {
      this.console.log(req.method || 'GET', req.url)
    }
    let error = null,
        resps = {},
        sbody  = ''
    eAxios(req, (CONFIG.CONFIG_RUNJS.proxy === false) ? false : null).then(response=>{
      resps = {
        status: response.status,
        headers: response.headers,
      }
      if (resps['headers'] && resps['headers']['set-cookie'] && sType(resps['headers']['set-cookie']) === 'array') {
        resps['headers']['Set-Cookie'] = resps['headers']['set-cookie'].join(',')
      }
      sbody = sString(response.data)
    }).catch(err=>{
      error = errStack(err)
      this.console.error('$httpClient', req.method || 'GET', req.url || req, error)
      if (err.response) {
        resps = {
          status: err.response.status,
          headers: err.response.headers,
        }
        sbody = sString(err.response.data)
      } else if (err.request) {
        error = `$httpClient ${req.method} ${req.url} error: ${error}`
        sbody = sString(req)
      } else {
        sbody = error
      }
    }).finally(()=>{
      if(cb && sType(cb) === 'function') {
        return cb(error, resps, sbody)
      }
    }).catch(err=>{
      this.console.error('$httpClient', req.method, req.url, 'callback', errStack(err, true))
    })
  }
  $httpClient = {
    get: (req, cb) => {
      this.httpRequest(req, cb)
    },
    post: (req, cb) => {
      if (sType(req) === 'string') {
        req = { url: req }
      }
      req.method = 'post'
      this.httpRequest(req, cb)
    },
    put: (req, cb) => {
      if (sType(req) === 'string') {
        req = { url: req }
      }
      req.method = 'put'
      this.httpRequest(req, cb)
    },
    delete: (req, cb) => {
      if (sType(req) === 'string') {
        req = { url: req }
      }
      req.method = 'delete'
      this.httpRequest(req, cb)
    }
  }
  $environment = {
    'surge-version': true
  }
  $cheerio = cheerio
  $message = message
  alert = message.success
  $download = downloadfile
  $evui = (obj, callback) => {
    if (sType(obj) !== 'object') {
      this.console.error('$evui expect a object in first arguments')
      return Promise.reject('$evui expect a object in first argument')
    }
    if (wsSer.recverlists.size === 0) {
      return Promise.reject('websocket is not ready yet, cant transfer $evui data to client')
    }
    if (obj.id === undefined) {
      obj.id = `evui_${euid(4)}`
    }
    wsSer.send({ type: 'evui', data: { type: 'neweu', data: obj }}, this.$env?.wsid)

    if (sType(callback) !== 'function' && (obj.cb || obj.callback)) {
      callback = obj.cb || obj.callback
    }

    return new Promise((resolve, reject)=>{
      if (obj.cbable) {
        wsSer.recv[obj.id] = data => {
          this.console.debug('$evui id:', obj.id, ', title:', obj.title, ', return data:', data)
          if (data === 'close') {
            wsSer.recv[obj.id] = null
            resolve(obj.title + ' is closed')
          } else if (sType(callback) === 'function') {
            // 保持和前端的持续交互，不 resolve
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
    push:  feedPush,
    ifttt: iftttPush,
    bark:  barkPush,
    cust:  custPush
  }
  $notify = (...data)=>{
    this.console.notify(data.map(arg=>sString(arg)).join(' '))
    feedPush(data[0] + ' ' + data[1], data[2], data[3])
  }
  $notification = {
    post: (...data) => {
      this.console.notify(data.map(arg=>sString(arg)).join(' '))
      feedPush(data[0] + ' ' + data[1], data[2], data[3])
    }
  }
  $fend = async (key, fn) => {
    // 待优化：
    // - 无 $fend 匹配问题
    // - 多 $fend 匹配优化(done)
    if (!this.$request) {
      return this.$done(`$fend ${key || ''} error: $request is expect`);
    }
    if (this.fendkey === undefined) {
      let body = this.$request.body;
      if (!key || !body) {
        this.fendkey = '';
        return this.$done('$fend error: key and body are expect');
      }
      try {
        body = JSON.parse(body);
        this.fendkey = body.key || '';
        this.fendata = body.data;
      } catch(e) {
        this.fendkey = '';
        return this.$done(`$fend ${key} error: $request.body can\'t be JSON.parse`);
      }
    }
    if (this.fendkey === '') {
      return this.$done('$fend error: a $request body key is expect');
    }
    if (this.fendkey === key) {
      if (typeof fn === 'function') {
        try {
          fn = await fn(this.fendata);
        } catch(e) {
          fn = '$fend ' + key + ' error: ' + e.message;
          this.console.error('$fend', key, e);
        }
      }
      return this.$done(fn);
    }
  };
  $done = (data) => {
    if (this.$vmEvent) {
      this.$vmEvent.emit(this.ok, data);
    }
    let dstr = sString(data);
    if (dstr.length > 1200) {
      dstr = dstr.slice(0, 1200) + '...';
    } else if (!dstr) {
      dstr = 'no result';
    }
    this.console.debug('$done:', dstr);
    return data;
  }
}

class context {
  constructor({ fconsole, name }){
    this.final = new contextBase({ fconsole, name })
  }
}

module.exports = { context }