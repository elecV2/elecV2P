/* 一些关于字符操作的基础函数
** Author: http://t.me/elecV2
** Update: https://raw.githubusercontent.com/elecV2/elecV2P/master/utils/string.js
**/

const crypto = require('crypto')

function sType(obj) {
  if (typeof obj !== 'object') {
    return typeof obj
  }
  if (Buffer.isBuffer(obj)) {
    return 'buffer'
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
    return force ? Object.create(null) : false
  }
  let type = sType(str)
  switch (type) {
  case 'array':
  case 'object':
    return str
  case 'buffer':
    return str.toJSON()
  case 'set':
    return Array.from(str)
  case 'map':
    return Array.from(str).reduce((obj, [key, value]) => {
      obj[key] = value
      return obj
    }, {})
  }
  try {
    let jobj = JSON.parse(str)
    if (typeof(jobj) === 'object') {
      return jobj
    }
  } catch(e) {
    try {
      let obj = (new Function("return " + str))();
      if (/^(object|array)$/.test(sType(obj))) {
        return obj
      }
    } catch(e) {}
  }
  if (force) {
    return { 0: str }
  }
  return false
}

function sString(obj) {
  if (obj === undefined || obj === null) {
    return ''
  }
  let type = sType(obj)
  switch (type) {
  case 'string':
    return obj.trim()
  case 'map':
  case 'set':
  case 'buffer':
    return JSON.stringify({
      type, data: Array.from(obj)
    })
  case 'array':
  case 'object':
    try {
      if (obj[Symbol.toPrimitive]) {
        return String(obj[Symbol.toPrimitive]())
      }
      return JSON.stringify(obj)
    } catch(e) {
      return e.message
    }
  default:
    return String(obj).trim()
  }
}

function strJoin() {
  return [...arguments].map(s=>sString(s)).join(' ')
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

function sUrl(url){
  try {
    return new URL(url)
  } catch(e) {
    return false
  }
}

function euid(len = 8) {
  // 获取一个随机字符，默认长度为 8, 可自定义
  let b62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let str = b62[Math.floor(Math.random()*52)]
  len--
  while(len--){
    str += b62[Math.floor(Math.random()*62)]
  }
  return str
}

function UUID(){
  return crypto.randomUUID()
}

function iRandom(min, max) {
  if (max === undefined) {
    max = min
    min = 0
  }
  return Math.floor(Math.random()*(max - min + 1)) + min
}

function errStack(error, stack = false) {
  if (error === undefined) {
    return 'no error information'
  }
  if (error.stack) {
    if (stack) {
      return error.stack
    }
    let errline = error.stack.match(/evalmachine\.<anonymous>:([0-9]+(:[0-9]+)?)/)
    if (errline && errline[1]) {
      return 'line ' + errline[1] + ' error: ' + error.message
    }
    return error.stack
  }
  if (error.message) {
    return error.message
  }
  return error
}

function kSize(size, k = 1024) {
  if (size < k) {
    return size + ' B'
  }
  if (size < k*k) {
    return (size/k).toFixed(2) + ' K'
  }
  if (size < k*k*k) {
    return (size/(k*k)).toFixed(2) + ' M'
  }
  return (size/(k*k*k)).toFixed(2) + ' G'
}

function nStatus() {
  let musage = process.memoryUsage()
  for (let key in musage) {
    musage[key] = (Math.round(musage[key]/1024) / 1024).toFixed(2) + ' MB'
  }
  return musage
}

function escapeHtml(str) {
  const tagsToReplace = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  }
  return str.replace(/[&<>]/g, tag=>tagsToReplace[tag] || tag)
}

function surlName(url) {
  if (!url) {
    return ''
  }
  let name = ''
  let sdurl = url.split(/\/|\\|\?|#/)
  while (name === '' && sdurl.length) {
    name = sdurl.pop()
  }
  return name
}

function progressBar({step=0, total, name='file', initLength=50}) {
  // 简易下载进度条
  let procbar = '', endtip = ''
  if (total === undefined) {
    endtip = 'downloading'
    while(initLength > 0) {
      procbar += Math.random() > 0.5 ? '>' : '='
      initLength--
    }
    return `${name} [${procbar}] ${endtip}`
  }
  if (total <= step) {
    while(initLength > 0) {
      procbar += '>'
      initLength--
    }
    return `${name} [${procbar}] 100%`
  }
  let percent = Number(step)/Number(total)
  let perdone = Math.round(percent * initLength)
  let perundo = initLength - perdone
  while(perdone > 0) {
    procbar += '>'
    perdone--
  }
  while(perundo > 0) {
    procbar += '='
    perundo--
  }
  endtip = (percent * 100).toFixed(2) + '%'
  return `${name} [${procbar}] ${endtip}`
}

function btoa(str = 'Hello elecV2P!') {
  return Buffer.from(str).toString('base64')
}

function atob(b64 = 'SGVsbG8gZWxlY1YyUCE=') {
  return Buffer.from(b64, 'base64').toString()
}

function sbufBody(body = '') {
  switch (sType(body)) {
  case 'string':
  case 'buffer':
    return body
  case 'arraybuffer':
    return Buffer.from(body)
  case 'null':
  case 'undefined':
  case 'boolean':
  case 'number':
    return String(body)
  case 'object':
    return JSON.stringify(body, null, 2)
  default:
    return sString(body)
  }
}

function sParam(str) {
  // 取出字符串中 -local/-timeout/-rename 参数
  if (!/ -/.test(str)) {
    return { fstr: str };
  }
  // -local 参数处理
  let final = {};
  if (/ -local/.test(str)) {
    final.local = true;
    str = str.replace(' -local', '');
  }
  // -timeout 参数处理
  let timeout = str.match(/ -timeout(=| )(\d+)/);
  if (timeout && timeout[2]) {
    final.timeout = Number(timeout[2]);
    str = str.replace(/ -timeout(=| )(\d+)/g, '');
  }
  // -rename 参数处理
  let ren = str.match(/ -rename(=| )([^\- ]+)/);
  if (ren && ren[2]) {
    final.rename = ren[2];
    str = str.replace(/ -rename(=| )([^\- ]+)/, '');
  }
  final.fstr = str;
  return final;
}

function sTypetoExt(ctype) {
  // content-type to ext
  if (/javascript/.test(ctype)) {
    return '.js';
  }
  if (/plain/.test(ctype)) {
    return '.txt';
  }
  if (/markdown/.test(ctype)) {
    return '.md';
  }
  if (/x-icon/.test(ctype)) {
    return '.ico';
  }
  if (!/stream/.test(ctype)) {
    return '.' + ctype.split(/;|\//)[1];
  }
  return '';
}

function sHash(string, algo = 'md5') {
  const hash = crypto.createHash(algo)
  hash.update(string)
  return hash.digest('hex')
}

function sHmac(string, key = '', algo = 'md5') {
  const hmac = crypto.createHmac(algo, key)
  hmac.update(string)
  return hmac.digest('hex')
}

module.exports = { euid, UUID, iRandom, sJson, sString, strJoin, bEmpty, sUrl, sType, sBool, errStack, kSize, nStatus, escapeHtml, surlName, progressBar, btoa, atob, sbufBody, sParam, sTypetoExt, sHash, sHmac }