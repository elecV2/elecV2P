// 一些常用函数，可在其他 JS 文件中使用 require 进行调用
// 比如 const { wait } = require('utils.js'); wait(3).then(()=>console.log('done'))
// 默认函数仅供参考，可随意删除或者添加自己常用的函数
// require 有缓存，本文件修改后，可能在其他引用脚本中并不会马上生效

/**
 * 等待 s 秒，返回数据 data
 * @param     {Number}     s       等待时间，单位：秒。
 * @param     {Boolean}    show    是否显示倒计时时间（可省略）
 * @param     {any type}   data    最终Promise resolve 的返回数据（可省略）
 * @return    {Promise}         
 * @author    https://t.me/elecV2
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

function sTime(time, ms=false){
  const tzoffset = (new Date()).getTimezoneOffset() * 60000
  return new Date((time || Date.now()) - tzoffset).toISOString().slice(0, ms ? -1 : -5).replace('T', ' ')
}

function sType(obj) {
  if (typeof obj !== 'object') return typeof obj
  return Object.prototype.toString.call(obj).slice(8, -1).toLocaleLowerCase()
}

/**
 * JSON 化输入值，成功返回 JSON 化后的值，不可转化则返回 false
 * @param     {String}     str      需要转化的变量
 * @param     {Boolean}    force    强制转化为 JSON 返回。结果为 { 0: str }
 * @return    {Object}     返回 JSON object 或者 false
 * @author    https://t.me/elecV2
 */
function sJson(str, force=false) {
  if (/^(object|array)$/.test(sType(str))) return str
  try {
    return JSON.parse(str)
  } catch(e) {
    try {
      let obj = (new Function("return " + str))()
      if (/^(object|array)$/.test(sType(obj))) return obj
    } catch (e) {}
    if (force) return { 0: str }
    return false
  }
}

module.exports = { wait, sTime, sType, sJson }