const fs = require('fs')
const path = require('path')

const { logger, setGlog, LOGFILE } = require('./logger')
const { now, wait } = require('./time')
const feed = require('./feed')
const string = require('./string')
const { eAxios, CONFIG_Axios } = require('./axios')
const { list } = require('./list')

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

const store = {
  path: path.join(__dirname, '../runjs/Store'),
  get(key) {
    clog.debug('get value for', key)
    if (fs.existsSync(path.join(this.path, key))) {
      return fs.readFileSync(path.join(this.path, key), 'utf8')
    }
    return undefined
  },
  put(value, key) {
    clog.debug('put value to', key)
    if (key && value) {
      fs.writeFileSync(path.join(this.path, key), value, 'utf8')
      return true
    } 
    clog.notify('store put error: no key or value')
    return false
  },
  delete(key) {
    clog.debug('delete store key:', key)
    try {
      fs.unlinkSync(path.join(this.path, key))
      return true
    } catch(e) {
      clog.error(errStack(e, true))
      return false
    }
  },
  all() {
    const storedata = {}
    fs.readdirSync(this.path).forEach(s=>{
      storedata[s] = fs.readFileSync(path.join(this.path, s), 'utf8')
    })
    return storedata
  }
}

module.exports = {
  logger,
  setGlog,
  LOGFILE,
  eAxios,
  CONFIG_Axios,
  list,
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