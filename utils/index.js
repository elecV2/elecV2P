const fs = require('fs')
const path = require('path')

const { logger, setGlog, LOGFILE } = require('./logger')
const { now, wait } = require('./time')
const feed = require('./feed')
const string = require('./string')
const { eAxios, CONFIG_Axios } = require('./axios')
const { list, jsfile, store } = require('./file')

const clog = new logger({ head: 'utils' })

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

function downloadfile(durl, dest) {
  if (!dest) {
    dest = path.join(__dirname, '../runjs/Lists', durl.split('/').pop())
  }
  return new Promise((resolve, reject)=>{
    eAxios({
      url: durl,
      responseType: 'stream'
    }, false).then(response=>{
      if (response.status == 404) {
        clog.error(durl + ' 404! 文件不存在')
        reject('404! 文件不存在')
        return
      }
      let file = fs.createWriteStream(dest)
      response.data.pipe(file)
      file.on('finish', ()=>{
        clog.notify("download: " + durl + " to: " + dest)
        file.close()
        resolve(dest)
      })
    }).catch(e=>{
      e = errStack(e)
      clog.error(durl, 'download fail!', e)
      reject('download fail! ' + e)
    })
  })
}

function bIsUrl(url){
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function nStatus() {
  let musage = process.memoryUsage()
  for (let key in musage) {
    musage[key] = (Math.round(musage[key]/10000) / 100).toFixed(2) + ' MB'
  }
  return musage
}

module.exports = {
  logger,
  setGlog,
  LOGFILE,
  eAxios,
  CONFIG_Axios,
  list,
  jsfile,
  now,
  wait,
  errStack,
  downloadfile,
  bIsUrl,
  nStatus,
  store,
  ...feed,
  ...string
}