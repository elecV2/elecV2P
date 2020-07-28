function isJson(str) {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

function bIsUrl(url){
  try {
    new URL(url)
    return true
  } catch {
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

function errStack(error, stack = false) {
  if (!error) return
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
  isJson,
  bIsUrl,
  errStack,
  nStatus
}