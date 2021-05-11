const fs = require('fs')
const path = require('path')
const axios = require('axios')
const HttpProxyAgent = require('http-proxy-agent')
const HttpsProxyAgent = require('https-proxy-agent')

const { logger } = require('./logger')
const clog = new logger({ head: 'eAxios', level: 'debug' })

const { sJson, sType, errStack, surlName, progressBar } = require('./string')

const { CONFIG, CONFIG_Port } = require('../config')

const { list, file } = require('./file')
const uagent = sJson(list.get('useragent.list')) || {
  "iPhone": {
    "name": "iPhone 6s",
    "header": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1"
  },
  "chrome": {
    "name": "chrome85 win10",
    "header": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36"
  }
}

const CONFIG_Axios = {
  proxy:   false,           // axios 请求代理
  timeout: 5000,            // axios 请求超时时间。单位：毫秒
  uagent:  'iPhone'         // 通用 User-Agent，相关列表位于 script/Lists/useragent.list
}

if (CONFIG.CONFIG_Axios) {
  Object.assign(CONFIG_Axios, CONFIG.CONFIG_Axios)
} else {
  CONFIG.CONFIG_Axios = CONFIG_Axios
}

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
    return CONFIG_Axios.proxy ? this.new(CONFIG_Axios.proxy, 'http') : null
  },
  https(){
    return CONFIG_Axios.proxy ? this.new(CONFIG_Axios.proxy) : null
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
    gap: 1000*60*30,        // 更新检查间隔时间，单位 ms
  }
}

function getUagent() {
  return uagent[CONFIG_Axios.uagent] ? uagent[CONFIG_Axios.uagent].header : null
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
  if (request.data === undefined) {
    request.data = request.body
  }
  if (request.timeout === undefined) {
    request.timeout = CONFIG_Axios.timeout
  }
  if (request.headers === undefined || typeof(request.headers) !== 'object') {
    request.headers = {
      "User-Agent": getUagent()
    }
  } else if (request.headers['User-Agent'] === undefined && request.headers['user-agent'] === undefined) {
    request.headers['User-Agent'] = getUagent()
  }
  // 移除空参数 undefined
  Object.keys(request.headers).forEach(key => request.headers[key] === undefined && delete request.headers[key])

  if (proxy !== false && (proxy || CONFIG_Axios.proxy)) {
    if (request.url.startsWith('https')) {
      request['httpsAgent'] = proxy ? axProxy.new(proxy) : eData.https
    } else {
      request['httpAgent'] = proxy ? axProxy.new(proxy, 'http') : eData.http
    }
    request.proxy = false
  }

  return new Promise((resolve, reject)=>{
    axios(request).then(res=>resolve(res)).catch(e=>reject(e))
  })
}

function downloadfile(durl, dest, cb) {
  // 在 elecV2P 中占非常重要的部分，如无必要不要改动
  // very important, don't change if not necessary
  if (!durl.startsWith('http')) {
    return Promise.reject(durl + ' is not a valid url')
  }
  let folder = '', fname = '', isFolder = false
  if (dest) {
    if (sType(dest) === 'object') {
      folder = dest.folder || ''
      fname  = dest.name || ''
      dest   = path.join(folder, fname)
    }
    dest = path.normalize(dest)
    isFolder = Boolean(folder) || file.isExist(dest, true)
  } 
  if ((!dest || isFolder) && fname === '') {
    fname = surlName(durl)
  }
  if (isFolder) {
    folder = folder || dest
  } else if (dest && dest.indexOf(path.sep) !== -1) {
    folder = folder || dest.slice(0, dest.lastIndexOf(path.sep))
    fname = fname || dest.slice(dest.lastIndexOf(path.sep) + 1)
  } else {
    folder = file.get(CONFIG.efss.directory || 'web/dist', 'path')
  }
  
  dest = path.join(folder, fname || dest)
  folder = path.dirname(dest)
  if (!fs.existsSync(folder)) {
    clog.info('mkdir', folder, 'for download', fname)
    fs.mkdirSync(folder, { recursive: true })
  }
  return new Promise((resolve, reject)=>{
    eAxios({
      url: durl,
      responseType: 'stream'
    }).then(response=>{
      if (response.status == 404) {
        clog.error(durl + ' 404! file dont exist')
        reject('404! file dont exist')
        return
      }
      let totalLength = response.headers['content-length']
      let currentLength = 0
      let file = fs.createWriteStream(dest)
      response.data.on('data', (chunk) => {
        currentLength += chunk.length
        let progress = progressBar({ step: currentLength, total: totalLength, name: fname })
        clog.debug(progress)
        if (cb) {
          cb({ progress })
        }
      })
      response.data.pipe(file)
      file.on('finish', ()=>{
        clog.notify(`success download ${durl} to ${dest}`)
        file.close()
        resolve(dest)
        if (cb) {
          cb({ finish: `success download ${durl} to ${dest}`})
        }
      })
    }).catch(e=>{
      reject('download fail! ' + e.message)
      clog.error(durl, 'download fail!', errStack(e))
    })
  })
}

async function checkupdate(force = false){
  if (force === false && eData.update.body && eData.update.lastcheck && (Date.now() - eData.update.lastcheck < eData.update.gap)) {
    return eData.update.body
  }
  let body = {
    version: ''
  }
  try {
    clog.info('checkupdate from cloudflare cdn...')
    let res = await eAxios('https://version.elecv2.workers.dev/')
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
      body.message = 'unenable to check the new version of elecV2P'
    }
  }

  if (body.version && body.version !== CONFIG.version) {
    body.update = true
    body.updateversion = body.version
    CONFIG.newversion = body.updateversion
    body.message = `a new version of elecV2P v${body.updateversion} is available`
  } else {
    body.update = false
    body.message = body.message || 'elecV2P v' + CONFIG.version + ' is the lastest version'
  }
  clog.notify(body.message)
  body.version = CONFIG.version
  eData.update.body = body
  eData.update.lastcheck = Date.now()
  return eData.update.body
}

module.exports = { CONFIG_Axios, axProxy, eAxios, downloadfile, checkupdate }