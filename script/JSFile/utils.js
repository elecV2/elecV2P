// 一些常用函数，可在其他 JS 文件中使用 require 进行调用
// 比如 const { wait } = require('utils.js'); wait(3).then(()=>console.log('done'))
// Author: https://t.me/elecV2
// 默认函数仅供参考，可随意删除或者添加自己常用的函数
// require 有缓存，本文件修改后，可能在其他引用脚本中并不会马上生效

function now(time, ms=true){
  const tzoffset = (new Date()).getTimezoneOffset() * 60000
  time = time ? (Number(time) || Date.parse(time)) : Date.now()
  return new Date(time - tzoffset).toISOString().slice(0, ms ? -1 : -5).replace('T', ' ')
}

/**
 * 等待 s 秒，返回数据 data
 * @param     {Number}     s       等待时间，单位：秒。
 * @param     {Boolean}    show    是否显示倒计时时间（可省略）
 * @param     {any type}   data    最终Promise resolve 的返回数据（可省略）
 * @return    {Promise}            
 */
function wait(s, show=false, data=null) {
  console.log('waiting', s, 'seconds')
  if (typeof s !== 'number' || s <= 0) return Promise.resolve(data)
  return new Promise(resolve=>{
    let newit = setInterval(()=>{
      show && console.log('waiting', s);
      s--;
      if (s <= 0) {
        clearInterval(newit);
        resolve(data);
      }
    }, 1000)
  })
}

function sType(obj) {
  if (typeof obj !== 'object') {
    return typeof obj
  }
  return Object.prototype.toString.call(obj).slice(8, -1).toLocaleLowerCase()
}

/**
 * JSON 化输入值，成功返回 JSON 化后的值，不可转化则返回 false
 * @param     {String}     str      需要转化的变量
 * @param     {Boolean}    force    强制转化为 JSON 返回。结果为 {} 或 { 0: str }
 * @return    {Object}     返回 JSON object 或者 false
 */
function sJson(str, force=false) {
  if (!str) {
    return force ? {} : false
  }
  if (/^(object|array)$/.test(sType(str))) {
    return str
  }
  try {
    let jobj = JSON.parse(str)
    if (typeof(jobj) === 'object') {
      return jobj
    }
    return force ? { 0: jobj } : false
  } catch(e) {
    try {
      let obj = (new Function("return " + str))()
      if (/^(object|array)$/.test(sType(obj))) {
        return obj
      }
    } catch(e) {}
    if (force) {
      return { 0: str }
    }
    return false
  }
}

function sString(obj) {
  if (obj === undefined || obj === null) {
    return ''
  }
  let type = sType(obj)
  if (type === 'string') {
    return obj.trim()
  }
  if (/object|array/.test(type)) {
    try {
      if (obj[Symbol.toPrimitive]) {
        return obj[Symbol.toPrimitive]()
      }
      return JSON.stringify(obj)
    } catch(e) {
      return e.message
    }
  }
  return String(obj).trim()
}

function sBool(val) {
  if (!val) {
    return false
  }
  if (typeof val === 'boolean') {
    return val
  }
  if (typeof val !== 'string') {
    return true
  }
  val = val.trim()
  switch(val) {
  case '':
  case '0':
  case 'false':
  case 'null':
  case 'undefined':
  case 'NaN':
    return false
  default:
    return true
  }
}

function bEmpty(obj) {
  if (sString(obj).trim() === '' || (/^(object|array)$/.test(sType(obj)) && Object.keys(obj).length === 0)) {
    return true
  }
  return false
}

function btoa(str = 'Hello elecV2P!') {
  return Buffer.from(str).toString('base64')
}

function atob(b64 = 'SGVsbG8gZWxlY1YyUCE=') {
  return Buffer.from(b64, 'base64').toString()
}

module.exports = { now, wait, sType, sJson, sString, sBool, bEmpty, btoa, atob }