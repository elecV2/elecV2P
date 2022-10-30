const fs = require('fs')
const path = require('path')
const axios = require('axios')
const HttpProxyAgent = require('http-proxy-agent')
const HttpsProxyAgent = require('https-proxy-agent')

const { logger } = require('./logger')
const clog = new logger({ head: 'eAxios', level: 'debug' })

const { sJson, sType, errStack, surlName, progressBar, sTypetoExt } = require('./string')

const { CONFIG, CONFIG_Port } = require('../config')

const { list, file } = require('./file')
const uagent = list.get('useragent.list')

const CONFIG_Axios = {
  proxy: {
    enable: false,          // axios 请求代理
  },
  timeout: 5000,            // axios 请求超时时间。单位：毫秒
  uagent:  'iPhone',        // 通用 User-Agent，相关列表位于 script/Lists/useragent.list
  block: {                  // 阻止发送的网络请求。匹配方式 new RegExp('regexp').test(url)
    enable: false,
    regexp: ''
  },
  only: {                   // 启用时，表示仅允许符合该规则的 url 通过
    enable: false,
    regexp: ''
  },
  "reject_unauthorized": true
}

if (CONFIG.CONFIG_Axios) {
  if (CONFIG.CONFIG_Axios.proxy) {
    if (CONFIG.CONFIG_Axios.proxy.enable === undefined) {
      CONFIG.CONFIG_Axios.proxy.enable = true
    }
  } else {
    CONFIG.CONFIG_Axios.proxy = CONFIG_Axios.proxy
  }
  Object.assign(CONFIG_Axios, CONFIG.CONFIG_Axios)
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = CONFIG_Axios.reject_unauthorized === false ? 0 : 1
}
// 同步 CONFIG 数据
CONFIG.CONFIG_Axios = CONFIG_Axios

const axProxy = {
  new(proxy = null, type = 'https'){
    if (proxy) {
      let option = {
        protocol: proxy.protocol || 'http',
        host: proxy.host || '127.0.0.1',
        port: proxy.port || CONFIG_Port.proxy,
        auth: proxy.auth ? (proxy.auth.username + ':' + proxy.auth.password) : '',
        rejectUnauthorized: false
      }
      return type === 'http' ? new HttpProxyAgent(option) : new HttpsProxyAgent(option)
    } else {
      clog.error('make new proxy fail: a proxy object is expect')
      return null
    }
  },
  http(){
    return CONFIG_Axios.proxy.enable ? this.new(CONFIG_Axios.proxy, 'http') : null
  },
  https(){
    return CONFIG_Axios.proxy.enable ? this.new(CONFIG_Axios.proxy) : null
  },
  update(){
    eData.http = this.http()
    eData.https = this.https()
  } 
}

const eData = {
  http: axProxy.http(),
  https: axProxy.https(),
  update: {
    gap: CONFIG.update_check_gap ?? 1000*60*30,        // 更新检查最少间隔时间，单位 ms。默认 30 分钟
  }
}

function getUagent() {
  return uagent[CONFIG_Axios.uagent]?.header || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36'
}

function isBlock(request) {
  if (request.token) {
    if (request.token === CONFIG.wbrtoken) {
      clog.debug('request.token is correct, skip block check')
      delete request.token
      return false
    }
    delete request.token
  }
  if (CONFIG_Axios.only.enable) {
    return new RegExp(CONFIG_Axios.only.regexp).test(request.url) === false
  }
  if (CONFIG_Axios.block.enable) {
    return new RegExp(CONFIG_Axios.block.regexp).test(request.url)
  }
  return false
}

/**
 * axios 简易封装
 * @param     {object/string}    request      axios 请求内容
 * @param     {[object json]}    proxy        代理，会覆盖 config 设置
 * @return    {promise}                 axios promise
 */
function eAxios(request, proxy=null) {
  if (typeof(request) === 'string') {
    request = {
      url: request
    }
  }
  if (isBlock(request)) {
    let res = {
      rescode: -1,
      message: 'error: ' + request.url + ' is blocked(You can reset on webUI->SETTING)'
    }
    if (request.headers && /json/i.test(request.headers.Accept)) {
      return Promise.reject(res)
    }
    return Promise.reject(res.message)
  }
  if (!/%/.test(request.url)) {
    // unescaped-characters 处理
    request.url = encodeURI(request.url)
  }
  if (!request.method) {
    request.method = 'get'
  }
  if (request.timeout === undefined) {
    request.timeout = CONFIG_Axios.timeout
  }
  request.headers = sJson(request.headers, true)
  // 移除 headers 中多余参数
  Object.keys(request.headers).forEach(key => {
    if (key === 'Content-Length' || key === 'content-length' || request.headers[key] === undefined) {
      delete request.headers[key]
    }
  })
  // 补充一些 headers 参数
  request.headers['Accept'] = request.headers['Accept'] || request.headers['accept'] || '*/*'
  request.headers['Accept-Encoding'] = request.headers['Accept-Encoding'] || request.headers['accept-encoding'] || '*'
  request.headers['Accept-Language'] = request.headers['Accept-Language'] || request.headers['accept-language'] || 'zh,zh-CN;q=0.9,en;q=0.7,*;q=0.5'
  request.headers['Connection'] = request.headers['Connection'] || request.headers['connection'] || 'keep-alive'
  request.headers['Content-Type'] = request.headers['Content-Type'] || request.headers['content-type'] || 'application/x-www-form-urlencoded; charset=UTF-8'
  request.headers['Date'] = request.headers['Date'] || request.headers['date'] || new Date().toUTCString()
  request.headers['User-Agent'] = request.headers['User-Agent'] || request.headers['user-agent'] || getUagent()

  // request data/body 处理
  if (request.data === undefined) {
    request.data = request.body
  }
  // 非 GET 请求 url 参数移动到 body 内
  // if (request.method.toLowerCase() !== 'get' && !request.data && /\?/.test(request.url)) {
  //   request.data = request.url.split('?').pop()
  // }
  if (request.data === undefined || request.data === '') {
    request.data = null
  }
  if (request.validateStatus === undefined) {
    request.validateStatus = status=>status < 500
  }

  // 网络请求代理处理
  if (proxy !== false && (proxy || CONFIG_Axios.proxy.enable)) {
    if (request.url.startsWith('https')) {
      request['httpsAgent'] = proxy ? axProxy.new(proxy) : eData.https
    } else {
      request['httpAgent'] = proxy ? axProxy.new(proxy, 'http') : eData.http
    }
    request.proxy = false
  }

  return axios(request)
}

function stream(url = '', orgheaders = {}) {
  clog.debug('stream', url)
  const { authorization, cookie, host, origin, referer, ...headers } = orgheaders
  return eAxios({
    url, headers,
    maxRedirects: 0,
    decompress: false,
    responseType: 'stream',
  }).catch(error=>{
    clog.error('stream', url, 'fail', error)
    return errStack(error)
  })
}

function downloadfile(durl, options, cb) {
  // 在 elecV2P 中占非常重要的位置，如无必要不要改动
  // very important, don't change if not necessary
  if (!/^https?:\/\/\S{4,}/.test(durl)) {
    return Promise.reject(durl + ' is not a valid url')
  }
  let folder = '', fname  = ''
  if (options) {
    if (sType(options) === 'object') {
      if (options.folder) {
        folder = options.folder
      }
      if (options.name) {
        fname = options.name
      }
    } else {
      if (file.isExist(options, true)) {
        folder = options
      } else if (path.dirname(options) !== '.') {
        folder = path.dirname(options)
        fname = path.basename(options)
      } else {
        fname = options
      }
    }
  }
  if (!folder) {
    folder = file.get(CONFIG.efss.directory || 'web/dist', 'path')
  }
  if (!fname) {
    fname  = surlName(durl)
  }

  let dest = path.resolve(folder, fname)
  if (options.existskip && fs.existsSync(dest)) {
    clog.info(dest, 'exist, skip download')
    return Promise.resolve(`${dest} exist, skip download`)
  }
  folder = path.dirname(dest)   // fname 中包含目录的情况
  fname  = path.basename(dest)  // fname 最终值
  if (!fs.existsSync(folder)) {
    clog.info('mkdir', folder, 'for download', fname)
    fs.mkdirSync(folder, { recursive: true })
  }
  return new Promise((resolve, reject)=>{
    eAxios({
      url: durl, timeout: options.timeout,
      responseType: 'stream'
    }).then(response=>{
      if (response.status == 404) {
        clog.error(durl, '404! file dont exist')
        reject('404! file dont exist')
        return
      }
      if (sType(options?.cb) === 'function') {
        cb = options.cb
      }
      if (!path.extname(fname) && !/stream/.test(response.headers['content-type'])) {
        fname += sTypetoExt(response.headers['content-type']);
        dest = path.resolve(folder, fname);
      }
      const total = Number(response.headers['content-length']);
      if (sType(cb) === 'function') {
        let dsize = 0, step = 0;
        let bname = fname.length < 23 ? fname : fname.slice(0,7) + '...' + fname.slice(-12);
        Promise.resolve(cb({
          progress: progressBar({ step: 0, total: 1, name: bname }),
          name: fname, start: dest,
          chunk: 0, dsize: 0, total,
        })).catch(e=>{
          // calllback 错误不影响下载，不 reject
          clog.error(fname, 'start download callback error', errStack(e))
        })
        response.data.on('data', (chunk) => {
          dsize += chunk.length;
          step++;
          let progress = progressBar({ step: dsize, total: total, name: bname })
          clog.debug(progress, '\x1b[F')
          Promise.resolve(cb({
            progress,
            dsize, total,
            chunk: step,
            name: fname
          })).catch(e=>{
            // calllback 错误不影响下载，不 reject
            clog.error(fname, 'download callback error', errStack(e))
          })
        })
      }
      let file = fs.createWriteStream(dest)
      response.data.pipe(file)
      file.on('finish', ()=>{
        clog.notify(`success download ${durl} to ${dest}`)
        file.close()
        resolve(dest)
        if (sType(cb) === 'function') {
          new Promise(resolve=>{
            resolve(cb({
              progress: progressBar({ step: 2, total: 1, name: fname }),
              finish: dest,
              dsize: total, total,
              name: fname
            }))
          }).catch(e=>{
            clog.error(fname, 'download callback error', errStack(e))
          })
        }
      })
      file.on('error', err=>{
        reject(`${fname} download fail ${err.message}`)
        clog.error(durl, 'download fail', errStack(err))
      })
    }).catch(e=>{
      reject('download fail! ' + (e.message || e))
      clog.error(durl, 'download fail!', errStack(e))
    })
  })
}

async function checkupdate(force = false){
  if (force === false && CONFIG.update_check === false) {
    clog.debug('skip update check')
    return {
      version: CONFIG_Port.version
    }
  }
  if (force === false
    && eData.update.gap > 0
    && eData.update.body
    && eData.update.lastcheck
    && (Date.now() - eData.update.lastcheck < eData.update.gap)
  ) {
    return eData.update.body
  }
  let body = {
    version: ''
  }
  try {
    clog.info('checkupdate from cloudflare cdn...')
    let res = await eAxios('https://ver.elecv2.workers.dev/')
    Object.assign(body, res.data)
  } catch(e) {
    clog.error('check update fail', errStack(e))
  }
  if (!body.version) {
    clog.info('checkupdate from cdn is fail, try to get from github...')
    try {
      let res = await eAxios('https://raw.githubusercontent.com/elecV2/elecV2P/master/package.json')
      body.version = res.data.version
    } catch(e) {
      clog.error('check update from github is fail', errStack(e))
      body.update = false
      body.message = 'unable to check the new version of elecV2P'
    }
  }

  if (body.version && Number(body.version.replace(/\D/g, '')) > CONFIG_Port.vernum) {
    body.update = true
    body.updateversion = body.version
    CONFIG_Port.newversion = body.updateversion
    body.message = `a new version of elecV2P v${body.updateversion} is available`
  } else {
    body.update = false
    body.message = body.message || 'elecV2P v' + CONFIG_Port.version + ' is the lastest version'
  }
  clog.notify(body.message)
  body.version = CONFIG_Port.version
  eData.update.body = body
  eData.update.lastcheck = Date.now()
  return eData.update.body
}

module.exports = { CONFIG_Axios, axProxy, eAxios, stream, downloadfile, checkupdate }