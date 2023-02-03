const { CONFIG } = require('../config')

if (!process.env.TZ) {
  process.env.TZ = CONFIG.TZ || 'Asia/Shanghai'
}
const tzoffset = (new Date()).getTimezoneOffset() * 60000

module.exports = {
  now(time = null, ms = true, slicebegin = CONFIG.glogslicebegin ?? 0){
    time = time ? (Number(time) || Date.parse(time)) : Date.now()
    return new Date(time - tzoffset).toISOString().slice(slicebegin, ms ? -1 : -5).replace('T', ' ')
    // return new Date().toLocaleString('zh', { hour12: false })
  },
  hDays(time = Date.now()){
    let hours = (Date.now() - time)/1000/60/60
    if (hours > 100) {
      return (hours / 24).toFixed(2) + ' days'
    }
    return hours.toFixed(2) + ' hours'
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
  },
  /**
   * ms 级定时，等待到某个 ms 触发 then
   * @param     {String}    time     最终触发时间，比如 2021-04-10 22:10:20.888。如留空，则表示下一个整点; '+1min': 表示下一个整分钟; '+1s': 表示下一个整秒
   * @param     {Number}    ahead    提前多少 ms，默认 4 ms
   * @param     {Number}    gap      间隔时间超过该值则不定时，单位: ms，默认 10000*6*2 ms (两分钟)
   * @return    {Promise}
   * 具体使用:
   * waituntil('2021-04-10 22:10:20.888').then(()=>console.log('hello elecV2P, UTC time:', new Date().toISOString())).catch(e=>console.log(e))
   * waituntil().catch(e=>console.log(e)).finally(()=>console.log('hello elecV2P, UTC time:', new Date().toISOString()))
   */
  waituntil(time='', ahead=4, gap=10000*6*2) {
    let dms = 0
    if (time === '+1s') {
      time = new Date().setSeconds(new Date().getSeconds() + 1, 0)
    } else if (time === '+1min') {
      time = new Date().setMinutes(new Date().getMinutes() + 1, 0, 0)
    } else if (Date.parse(time)) {
      time = new Date(time)
    } else {
      time = new Date().setHours(new Date().getHours() + 1, 0, 0, 0)
    }
    dms = time - Date.now() - ahead
    if (dms > gap) {
      console.log(dms, 'is bigger than', gap, 'ms, skip setTimeout')
      return Promise.reject(dms + ' is bigger than ' + gap + ' ms, skip setTimeout')
    } else {
      console.log('wait', dms, 'ms, until UTC time', new Date(time).toJSON())
      return new Promise(resolve=>setTimeout(resolve, dms))
    }
  }
}