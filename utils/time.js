module.exports = {
  now(){
    const tzoffset = (new Date()).getTimezoneOffset() * 60000
    return new Date(Date.now() - tzoffset).toISOString().slice(0, -1).replace('T', ' ')
    // return new Date().toLocaleString('zh', { hour12: false })
  },
  wait(s, show=false, data=null){
    console.log('waiting', s, 'seconds')
    return new Promise(resolve=>{
      let newit = setInterval(()=>{
        show && console.log('waiting', s);
        s--;
        if (s < 0) {
          clearInterval(newit);
          resolve(data);
        }
      }, 1000)
    })
  }
}