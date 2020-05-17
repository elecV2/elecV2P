module.exports = {
  now(){
    let tzoffset = (new Date()).getTimezoneOffset() * 60000
    return (new Date(Date.now() - tzoffset)).toISOString().replace(/T/, ' ').replace(/\..+/, '')
  },
  wait(s, show=false, data=null){
    console.log('waiting %s seconds', s)
    return new Promise(resolve=>{
      let newit = setInterval(()=>{
        if (show) {
          console.log('waiting', s);
        }
        s--;
        if (s < 0) {
          clearInterval(newit);
          resolve(data);
        }
      }, 1000)
    })
  }
}