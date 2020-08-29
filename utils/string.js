/**
 * JSON 化输入值，成功返回 JSON 化后的值，不可转化则返回 false，
 * @param     {string}     str      需要转化的变量
 * @param     {Boolean}    force    强制转化为 JSON 返回。结果为 { 0: str }
 * @return    {object object}       返回 JSON object 或者 false
 */
function sJson(str, force=false) {
  if (/^(object|array)$/.test(sType(str))) return str
  try {
    return JSON.parse(str)
  } catch {
    if (force) return { 0: str }
    return false
  }
}

function sString(obj) {
  if (typeof obj === 'string') return obj
  if (/^(object|array)$/.test(sType(obj))) {
    return JSON.stringify(obj)
  }
  return String(obj)
}

function sUrl(url){
  try {
    return new URL(url)
  } catch {
    return false
  }
}

function sType(obj) {
  if (typeof obj !== 'object') return typeof obj
  return Object.prototype.toString.call(obj).slice(8, -1).toLocaleLowerCase()
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

function errStack(error, stack = false) {
  if (error === undefined) return 'no error information'
  if (error.stack) {
    if (stack) return error.stack
    let errline = error.stack.match(/evalmachine\.<anonymous>:([0-9]+(:[0-9]+)?)/)
    if (errline && errline[1]) {
      return 'line ' + errline[1] + ' error: ' + error.message
    }
  }
  if (error.message) return error.message
  return error
}

function nStatus() {
  let musage = process.memoryUsage()
  for (let key in musage) {
    musage[key] = (Math.round(musage[key]/10000) / 100).toFixed(2) + ' MB'
  }
  return musage
}

module.exports = {
  euid,
  sJson,
  sString,
  sUrl,
  sType,
  errStack,
  nStatus
}