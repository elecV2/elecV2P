// 一些常用函数，可在其他 JS 文件中使用 require 进行调用
// 比如 const { wait } = require('utils.js'); wait(3).then(()=>console.log('done'))
// 默认函数仅供参考，可随意删除或者添加自己常用的函数

function now(){
  const tzoffset = (new Date()).getTimezoneOffset() * 60000
  return new Date(Date.now() - tzoffset).toISOString().slice(0, -1).replace('T', ' ')
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

module.exports = { now, wait }