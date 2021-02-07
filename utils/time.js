module.exports = {
  now(time, ms=true){
    const tzoffset = (new Date()).getTimezoneOffset() * 60000
    return new Date((time || Date.now()) - tzoffset).toISOString().slice(0, ms ? -1 : -5).replace('T', ' ')
    // return new Date().toLocaleString('zh', { hour12: false })
  },
  /**
   * 等待 s 秒，返回数据 data
   * @param     {Number}     s       等待时间，单位：秒。
   * @param     {Boolean}    show    是否显示倒计时时间（可省略）
   * @param     {any type}   data    最终Promise resolve 的返回数据（可省略）
   * @return    {Promise}            
   */
  wait(s, show=false, data=null){
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
}