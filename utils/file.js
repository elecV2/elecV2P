const fs = require('fs')
const path = require('path')
const axios = require('axios')

const { errStack, sJson, sString, sType, iRandom } = require('./string')
const { logger } = require('./logger')
const clog = new logger({ head: 'utilsFile', level: 'debug' })

const { CONFIG } = require('../config')

const fpath = {
  list: path.join(__dirname, '../script', 'Lists'),
  js: path.join(__dirname, '../script', 'JSFile'),
  store: path.join(__dirname, '../script', 'Store')
}

if (!fs.existsSync(fpath.list)) {
  fs.mkdirSync(fpath.list)
  clog.notify('mkdir new Lists folder')
}

if (!fs.existsSync(fpath.js)) {
  fs.mkdirSync(fpath.js)
  clog.notify('mkdir new JSFile folder')
}

if (!fs.existsSync(fpath.store)) {
  fs.mkdirSync(fpath.store)
  clog.notify('mkdir new Store folder')
}

const list = {
  get(name, type){
    if (type === 'path') {
      return path.join(fpath.list, name)
    }
    if (fs.existsSync(path.join(fpath.list, name))) {
      return fs.readFileSync(path.join(fpath.list, name), "utf8")
    }
    clog.error('no list', name)
  },
  put(name, cont){
    try {
      if (typeof(cont) === 'object') {
        cont = JSON.stringify(cont)
      }
      fs.writeFileSync(path.join(fpath.list, name), cont, 'utf8')
      return true
    } catch(e) {
      clog.error('put list file error', name, e.stack)
    }
  }
}

const jsfile = {
  get(name, type){
    if (name === 'list') {
      const jslist = fs.readdirSync(fpath.js)
      let flist = []
      jslist.forEach(f=>{
        if (fs.statSync(path.join(fpath.js, f)).isDirectory()) {
          flist = flist.concat(fs.readdirSync(path.join(fpath.js, f)).map(secf=>f + '/' + secf))
        } else {
          flist.push(f)
        }
      })
      return flist.sort()
    }
    if (!/\.js$/.test(name)) { name = name + '.js' }
    if (type === 'path') {
      return path.join(fpath.js, name)
    }
    if (fs.existsSync(path.join(fpath.js, name))) {
      if (type === 'date') {
        return fs.statSync(path.join(fpath.js, name)).mtimeMs
      }
      return fs.readFileSync(path.join(fpath.js, name), 'utf8')
    }
    clog.error('no such js file', name)
    return false
  },
  put(name, cont){
    if (!/\.js$/.test(name)) { name = name + '.js' }
    try {
      if (typeof(cont) === 'object') {
        cont = JSON.stringify(cont)
      }
      fs.writeFileSync(path.join(fpath.js, name), cont, 'utf8')
      return true
    } catch(e) {
      clog.error('put js file error', name, e.stack)
    }
  },
  delete(name){
    if (!/\.js$/.test(name)) { name = name + '.js' }
    fs.unlinkSync(path.join(fpath.js, name))
  }
}

const store = {
  get(key, type) {
    if (key === undefined) return
    clog.debug('get value for', key)
    if (fs.existsSync(path.join(fpath.store, key))) {
      let value = fs.readFileSync(path.join(fpath.store, key), 'utf8')
      if (type === 'raw') {
        return value
      }
      const jsvalue = sJson(value)
      if (jsvalue && jsvalue.value !== undefined && /^(number|boolean|object|string|array)$/.test(jsvalue.type)) {
        value = jsvalue.value
      }
      if (type === undefined) return value
      switch (type) {
        case 'boolean':
          return Boolean(value)
        case 'number':
          return Number(value)
        case 'array':
        case 'object':
          return sJson(value, true)
        case 'string':
          return sString(value)
        case 'r':
        case 'random':
          switch (sType(value)) {
            case 'array':
              return value[iRandom(0, value.length-1)]
            case 'object':
              const keys = Object.keys(value)
              return value[keys[iRandom(0, keys.length-1)]]
            case 'number':
              return iRandom(value)
            case 'boolean':
              return Boolean(iRandom(0,1))
            default: {
              const strList = value.split(/\n|\r/)
              return strList[iRandom(0, strList.length-1)]
            }
          }
        default:{
          clog.error('unknow store get type', type, 'return original value')
          return value
        }
      }
    }
  },
  put(value, key, type) {
    if (key !== undefined && value !== undefined) {
      clog.debug('put value to', key)
      if (value === '') {
        return this.delete(key)
      }
      if (type === 'a') {
        const oldval = this.get(key)
        if (typeof oldval === 'string') value = oldval + '\n' + sString(value)
        else if (Array.isArray(oldval)) value = Array.isArray(value) ? [...oldval, ...value] : [...oldval, value]
        else if (sType(oldval) === 'object') value = Object.assign(oldval, sJson(value, true))
        else if (typeof oldval === 'number') value = oldval + Number(value)
        type = sType(value)
      } else if (type === 'number') {
        value = Number(value)
      } else if (type === 'boolean') {
        value = Boolean(value)
      } else if (type === 'object' || type === 'array') {
        value = sJson(value, true)
      } else if (type === 'string') {
        value = sString(value)
      } else {
        type = sType(value)
      }
      if (/^(number|boolean|object|array)$/.test(type)) {
        value = JSON.stringify({
          type, value
        })
      } else {
        value = String(value)
      }
      fs.writeFileSync(path.join(fpath.store, key), value, 'utf8')
      return true
    } 
    clog.error('store put error: no key or value')
    return false
  },
  delete(key) {
    clog.debug('delete store key:', key)
    try {
      fs.unlinkSync(path.join(fpath.store, key))
      return true
    } catch(e) {
      clog.error(errStack(e, true))
      return false
    }
  },
  all() {
    return fs.readdirSync(fpath.store)
    const storedata = {}
    fs.readdirSync(fpath.store).forEach(s=>{
      storedata[s] = this.get(s)
    })
    return storedata
  }
}

const file = {
  get(pname, type){
    const fpath = path.resolve(__dirname, '../', pname)
    if (type === 'path') {
      return fpath
    }
    if (fs.existsSync(fpath)) {
      return fs.readFileSync(fpath, 'utf8')
    }
    clog.error(pname, 'not exist')
  },
  copy(source, target){
    fs.copyFileSync(source, target)
  },
  path(x1, x2){
    if (!(x1 && x2)) return
    const rpath = path.resolve(x1, x2)
    if (fs.existsSync(rpath)) {
      return rpath
    }
  },
  isExist(filepath){
    if (fs.existsSync(filepath)) {
      return true
    }
    return false
  },
  aList(folder, option = { deep: -1, limit: -1 }){
    if (!fs.existsSync(folder)) return []
    if (option !== undefined && sType(option) !== 'object') {
      clog.error('file.aList option must be json object,', option, 'was given')
      return []
    }
    if (option.deep === undefined || sType(option.deep) !== 'number') option.deep = -1
    if (option.limit === undefined || sType(option.limit) !== 'number') option.limit = -1
    let flist = [], dlist = [[folder]]
    for (let tdeep = 0; tdeep < dlist.length; tdeep++) {
      clog.debug(tdeep)
      if (option.deep !== -1 && tdeep >= option.deep) return flist
      for (let cfolder of dlist[tdeep]) {
        const rlist = fs.readdirSync(cfolder)
        for (let file of rlist) {
          clog.debug(file)
          const fpath = path.join(cfolder, file)
          if (fs.statSync(fpath).isDirectory()) {
            dlist[tdeep+1] ? dlist[tdeep+1].push(fpath) : dlist[tdeep+1] = [fpath]
          } else {
            if (option.limit === -1 || flist.length < option.limit) {
              flist.push(fpath)
            } else {
              return flist
            }
          }
        }
      }
    }

    return flist
  }
}

function downloadfile(durl, dest) {
  if (!dest) {
    dest = file.get((CONFIG.efss || '.') + '/' + durl.split('/').pop(), 'path')
  }
  return new Promise((resolve, reject)=>{
    axios({
      url: durl,
      responseType: 'stream'
    }).then(response=>{
      if (response.status == 404) {
        clog.error(durl + ' 404! file dont exist')
        reject('404! file dont exist')
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

module.exports = { list, jsfile, store, file, downloadfile }