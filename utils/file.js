const fs = require('fs')
const path = require('path')

const { errStack, sJson, sString, sType, bEmpty, iRandom } = require('./string')
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
      fs.writeFileSync(path.join(fpath.list, name), sString(cont), 'utf8')
      return true
    } catch(e) {
      clog.error('put list file error', name, e.stack)
      return false
    }
  }
}

const jsfile = {
  get(name, type){
    if (bEmpty(name)) return false
    name = name.trim()
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
    if (!/\.js$/i.test(name)) name += '.js'
    if (type === 'path') {
      return path.join(fpath.js, name)
    }
    if (type === 'dir') {
      return path.dirname(path.join(fpath.js, name))
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
    if (!/\.js$/i.test(name)) name += '.js'
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
    if (!/\.js$/i.test(name)) name += '.js'
    const jspath = path.join(fpath.js, name)
    if (fs.existsSync(jspath)) {
      fs.unlinkSync(jspath)
      return true
    } else {
      clog.error('no such js file:', name)
      return false
    }
  }
}

const store = {
  get(key, type) {
    if (bEmpty(key)) return
    key = key.trim()
    clog.debug('get value for', key)
    if (!fs.existsSync(path.join(fpath.store, key))) {
      clog.debug(key, 'not set yet.')
      return
    }
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
            const strList = value.split(/\r\n|\r|\n/)
            return strList[iRandom(0, strList.length-1)]
          }
        }
      default:{
        clog.error('unknow store get type', type, 'return original value')
        return value
      }
    }
  },
  put(value, key, type) {
    if (bEmpty(key) || value === undefined) { 
      clog.error('store put error: no key or value')
      return false
    }
    clog.debug('put value to', key)
    if (value === '') {
      return this.delete(key)
    }
    if (type === 'a') {
      const oldval = this.get(key)
      if (oldval !== undefined) {
        if (typeof oldval === 'string') value = oldval + '\n' + sString(value)
        else if (Array.isArray(oldval)) value = Array.isArray(value) ? [...oldval, ...value] : [...oldval, value]
        else if (sType(oldval) === 'object') value = Object.assign(oldval, sJson(value, true))
        else if (typeof oldval === 'number') value = oldval + Number(value)
      }
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
  },
  delete(key) {
    if (bEmpty(key)) return false
    clog.debug('delete store key:', key)
    const spath = path.join(fpath.store, key)
    if (fs.existsSync(spath)) {
      fs.unlinkSync(spath)
      return true
    }
    clog.debug('store key', key, 'no exist.')
    return false
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
    if (bEmpty(pname)) {
      clog.info('parameters:', pname, 'was given, file.get no result')
      return ''
    }
    const fpath = path.resolve(__dirname, '../', pname)
    if (type === 'path') {
      return fpath
    }
    if (fs.existsSync(fpath)) {
      return fs.readFileSync(fpath, 'utf8')
    }
    clog.error(pname, 'not exist')
  },
  delete(fname, basepath) {
    basepath && (fname = path.join(basepath, fname))
    if (fs.existsSync(fname)) {
      if (fs.statSync(fname).isDirectory()) {
        try {
          fs.rmdirSync(fname)
          clog.debug('delete a empty directory', fname)
          return true
        } catch(e) {
          clog.info(fname, 'is a no empty directory, cant be delete.')
          return false
        }
      }
      fs.unlinkSync(fname)
      clog.info('delete file', fname)
      return true
    } else {
      clog.info(fname, 'no existed.')
      return false
    }
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
  isExist(filepath, isDir){
    if (bEmpty(filepath)) return false
    if (fs.existsSync(filepath)) {
      return isDir ? fs.statSync(filepath).isDirectory() : true
    }
    return false
  },
  size(filepath){
    if (fs.existsSync(filepath)) {
      const fsize = fs.statSync(filepath).size
      if (fsize > 1000000) {
        return (fsize/1000000).toFixed(2) + ' MB'
      } else if (fsize > 1000) {
        return (fsize/1000).toFixed(2) + ' KB'
      } else {
        return fsize + ' B'
      }
    }
    return 0
  },
  aList(folder, limitnum = -1, progress = { num: 0 }){
    if (!fs.existsSync(folder)) {
      clog.error('directory', folder, 'not existed.')
      return {}
    }
    folder = path.resolve(folder)
    let fstat = fs.statSync(folder)
    if (fstat.isDirectory()) {
      const rlist = fs.readdirSync(folder)
      let flist = []
      for (let fo of rlist) {
        if (limitnum !== -1 && progress.num >= limitnum) {
          break
        }
        flist.push(this.aList(path.join(folder, fo), limitnum, progress))
      }
      return {
        type: 'directory',
        name: path.basename(folder),
        list: flist
      }
    } else {
      if (limitnum !== -1) {
        progress.num++
      }
      return {
        type: 'file',
        name: path.basename(folder),
        size: this.size(folder),
        mtime: fstat.mtime
      }
    }
  }
}

module.exports = { list, jsfile, store, file }