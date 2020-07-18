const axios = require('axios')

function myAxios(request) {
  return new Promise((resolve, reject)=>{
    axios(request).then(res=>resolve(res)).catch(e=>reject(e))
  })
}

module.exports = myAxios