const axios = require('axios')

const { CONFIG, CONFIG_Port } = require('../config')

const { list } = require('./file')

const ustr = list.get('useragent.list')
const uagent = ustr ? JSON.parse(ustr) : {}

const CONFIG_Axios = {
  proxy:   false,           // axios 请求代理
  timeout: 5000,            // axios 请求超时时间。单位：毫秒
  uagent:  'iPhone'         // 通用 User-Agent，相关列表为 script/Lists/useragent.list
}

if (CONFIG.CONFIG_Axios) {
  Object.assign(CONFIG_Axios, CONFIG.CONFIG_Axios)
} else {
  CONFIG.CONFIG_Axios = CONFIG_Axios
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
function eAxios(request, proxy) {
  if (typeof(request) === 'string') {
    request = {
      url: request
    }
  }
  if (!request.timeout) request.timeout = CONFIG_Axios.timeout
  if (!request.headers) {
    request.headers = {
      "User-Agent": getUagent()
    }
  } else if (!request.headers['User-Agent']) {
    request.headers['User-Agent'] = getUagent()
  }

  const isForceSkipProxy = proxy === false
  if (!isForceSkipProxy && (proxy || CONFIG_Axios.proxy)) {
    request.proxy = proxy || CONFIG_Axios.proxy
    if (!request.proxy.port) {
      request.proxy.port = CONFIG_Port.proxy
    }
  }

  return new Promise((resolve, reject)=>{
    axios(request).then(res=>resolve(res)).catch(e=>reject(e))
  })
}

module.exports = { eAxios, CONFIG_Axios }