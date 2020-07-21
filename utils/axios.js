const axios = require('axios')

const { CONFIG_Port } = require('../config')

const CONFIG_Axios = {
  proxy:   false,           // 请求是否通过内部代理
  timeout: 5000,            // axios 网络请求超时时间。单位：毫秒
  usagent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1'  // 通用 User-Agent. 关闭： false
}

/**
 * axios 简易封装
 * @param     {object/string}    request      axios 请求内容
 * @param     {boolean}    skipproxy    强制跳过使用内部代理
 * @return    {promise}                 axios promise
 */
function eAxios(request, skipproxy) {
  if (typeof(request) === 'string') {
    request = {
      url: request
    }
  }
  if (!request.timeout) request.timeout = CONFIG_Axios.timeout
  if (!request.headers) {
    request.headers = {
      "User-Agent": CONFIG_Axios.usagent
    }
  } else if (!request.headers['User-Agent']) {
    request.headers['User-Agent'] = CONFIG_Axios.usagent
  }
  if (!skipproxy && CONFIG_Axios.proxy) {
    request.proxy = {
      port: CONFIG_Port.proxy
    }
  }
  return new Promise((resolve, reject)=>{
    axios(request).then(res=>resolve(res)).catch(e=>reject(e.stack))
  })
}

module.exports = { eAxios, CONFIG_Axios }