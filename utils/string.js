/* 一些关于字符操作的基础函数
** Author: http://t.me/elecV2
** Update: https://raw.githubusercontent.com/elecV2/elecV2P/master/utils/string.js
**/

const crypto = require('crypto')
const { ansiHtml } = require('./ansi')

function sType(obj) {
  if (typeof obj !== 'object') {
    return typeof obj
  }
  if (Buffer.isBuffer(obj)) {
    return 'buffer'
  }
  return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase() || 'object'
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
      obj[key] = typeof(value) === 'object' ? sJson(value) : value
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
    return JSON.stringify({
      type, data: Array.from(obj)
    })
  case 'buffer':
    return JSON.stringify({
      type, encode: 'base64',
      data: obj.toString('base64'),
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

function sUrl(url, host = ''){
  try {
    return new URL(url, host || undefined)
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
  return crypto.randomInt(min, max + 1)
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
  if (error.config) {
    return `${error.config.method} ${error.config.url} Error: ${error.message}`
  }
  if (error.request) {
    const req = error.request
    return `${req.method} ${req.protocol}//${req.host}${req.path} Error: ${error.message}`
  }
  if (error.message) {
    return error.message
  }
  return error
}

function kSize(size = 0, k = 1024) {
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
  if (/[&<>]/.test(str)) {
    const tagsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;'
    }
    str = str.replace(/[&<>]/g, tag=>tagsToReplace[tag] || tag)
  }
  return ansiHtml(str)
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
  total = Number(total)
  if (!total) {
    const procbar = []
    while(initLength > 0) {
      procbar.push(Math.random() > 0.5 ? '>==>>' : '=>=>=')
      initLength = initLength - 5
    }
    if (initLength < 0) {
      procbar.splice(-1, 1, '='.repeat(5+initLength))
    }
    return `${name} [${procbar.join('')}] downloading`
  }
  step = Number(step) || 0
  if (step === 0) {
    return `${name} [${'='.repeat(initLength)}] 0.00%`
  }
  if (total <= step) {
    return `${name} [${'>'.repeat(initLength)}] 100.00%`
  }
  let percent = step/total
  let perdone = Math.round(percent * initLength)
  let endtip = (percent * 100).toFixed(2) + '%'
  return `${name} [${'>'.repeat(perdone) + '='.repeat(initLength - perdone)}] ${endtip}`
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

function ebufEncrypt(strorg, key = 'elecV2', encode = 'base64') {
  const bfs = Buffer.from(strorg);
  const en_key_buf = Buffer.from(key);
  let   en_key_idx = 0, en_round = 1;
  const en_bfs_str = bfs.map(s=>{
    const en_key = en_key_buf[en_key_idx++];
    if (en_key_idx >= en_key_buf.length) {
      en_key_idx = 0;
      en_round  += 1;
    }
    return s + (en_key * en_round ^ en_key_buf[en_key_idx]);
  });
  return en_bfs_str.toString(encode);
}
/**
 * 基于 Buffer 的简单对称加密算法
 * 说明 https://elecv2.github.io/#算法研究之非对称加密的简单示例
 * Author  https://t.me/elecV2
 * @param  {string}  加密字符串
 * @param  {string}  加密密码
 * @param  {string}  加密后的字符串编码。可选 hex | base64
 * @return {string}  加密/解密后的字符串
 */
function ebufDecrypt(strb64, key = 'elecV2', encode = 'base64') {
  const en_bfs_str = Buffer.from(strb64, encode);
  const en_key_buf = Buffer.from(key);
  let   en_key_idx = 0, en_round = 1;
  const de_bfs_str = en_bfs_str.map(s=>{
    const en_key = en_key_buf[en_key_idx++];
    if (en_key_idx >= en_key_buf.length) {
      en_key_idx = 0;
      en_round  += 1;
    }
    return s - (en_key * en_round ^ en_key_buf[en_key_idx]);
  });
  return de_bfs_str.toString();
}

function htmlTemplate(body='', head='', title='') {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#003153">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${title || 'elecV2P - customize personal network'}</title>
  <style type="text/css">
  body{width: 100%;height: 100vh;margin: 0;padding: 0;text-align: center;background-image: linear-gradient(110deg,#003153B8 25%,transparent 0),linear-gradient(315deg,transparent 30%,#A7A8BD88 30%),linear-gradient(45deg,transparent 66%,#2890EEB8 0),linear-gradient(333deg,#66FF0088 53%,transparent 0);color: #FAFAFD;}
  </style>
  ${head}
</head>
<body>
  ${body}
</body>
</html>`
}

function bBufType(contentype='') {
  if (!contentype) {
    return false
  }
  return /^(audio|video|image|multipart|font|model)|(ogg|stream|protobuf)$/.test(contentype)
}

module.exports = { euid, UUID, iRandom, sJson, sString, strJoin, bEmpty, sUrl, sType, sBool, errStack, kSize, nStatus, escapeHtml, surlName, progressBar, btoa, atob, sbufBody, sParam, sTypetoExt, sHash, sHmac, ebufEncrypt, ebufDecrypt, htmlTemplate, bBufType }