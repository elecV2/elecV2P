const fs = require('fs')
const path = require('path')

const { errStack, sJson, sString, sType, bEmpty, iRandom } = require('./string')
const { logger } = require('./logger')
const clog = new logger({ head: 'utilsFile', level: 'debug' })

const { CONFIG } = require('../config')

const fpath = {
  list: path.join(__dirname, '../script', 'Lists'),
  js: path.join(__dirname, '../script', 'JSFile'),
  store: path.join(__dirname, '../script', 'Store'),
  homedir: require('os').homedir()
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
    return false
  },
  put(name, cont){
    try {
      fs.writeFileSync(path.join(fpath.list, name), sString(cont), 'utf8')
      clog.info(name, 'updated')
      return true
    } catch(e) {
      clog.error('put list file error', name, e.stack)
      return false
    }
  }
}

const file = {
  get(pname, type){
    if (bEmpty(pname)) {
      clog.info('parameters:', pname, 'was given, file.get no result')
      return ''
    }
    pname = pname.replace(/^(\$home|~)/i, fpath.homedir)
    const filepath = path.resolve(__dirname, '../', pname)
    if (type === 'path') {
      return filepath
    }
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, 'utf8')
    }
    clog.error(pname, 'not exist')
  },
  delete(fname, basepath, option = { recursive: false }) {
    basepath && (fname = path.join(basepath, fname))
    if (fs.existsSync(fname)) {
      if (fs.statSync(fname).isDirectory()) {
        try {
          if (option.recursive) {
            fs.rmdirSync(fname, { recursive: true })
            clog.info('delete directory', fname, 'recursively')
          } else {
            fs.rmdirSync(fname)
            clog.info('delete a empty directory', fname)
          }
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
      clog.info(fname, 'no exist')
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
      if (fsize > 1024*1024) {
        return (fsize/(1024*1024)).toFixed(2) + ' M'
      } else if (fsize > 1024) {
        return (fsize/1024).toFixed(2) + ' K'
      } else {
        return fsize + ' B'
      }
    }
    return 0
  },
  aList(folder, option = { max: -1, dot: true }, progress = { num: 0 }){
    if (!fs.existsSync(folder)) {
      clog.error('directory', folder, 'not existed.')
      return null
    }
    folder = path.resolve(folder)
    if (option.dot === false && path.basename(folder).startsWith('.')) {
      return null
    }
    let fstat = fs.statSync(folder)
    if (fstat.isDirectory()) {
      const rlist = fs.readdirSync(folder)
      let flist = []
      for (let fo of rlist) {
        if (option.max !== -1 && progress.num >= option.max) {
          break
        }
        flist.push(this.aList(path.join(folder, fo), option, progress))
      }
      return {
        type: 'directory',
        name: path.basename(folder),
        list: flist.filter(f=>f),
        mtime: fstat.mtimeMs
      }
    } else {
      if (option.max !== -1) {
        progress.num++
      }
      return {
        type: 'file',
        name: path.basename(folder),
        size: this.size(folder),
        mtime: fstat.mtimeMs
      }
    }
  },
  list({ folder, max=1000 }) {
    if (!(folder && fs.existsSync(folder))) {
      return []
    }
    if (!fs.statSync(folder).isDirectory()) {
      return [folder]
    }
    if (!(max>0)) {
      return []
    }

    let curnum = 0, fnlist = [], subfolder = []
    while (curnum<max) {
      let subf = subfolder.length ? subfolder.shift() : ''
      let newfolder = path.join(folder, subf)
      let list = fs.readdirSync(newfolder)
      for (let fd of list) {
        if (fs.statSync(path.join(newfolder, fd)).isDirectory()) {
          subfolder.push((subf ? subf + '/' : '') + fd)
        } else {
          fnlist.push((subf ? subf + '/' : '') + fd)
          curnum++
          if (curnum >= max) {
            return fnlist
          }
        }
      }

      if (subfolder.length === 0) {
        return fnlist
      }
    }

    return fnlist
  }
}

const Jsfile = {
  get(name, type){
    if (bEmpty(name)) {
      return false
    }
    name = name.trim()
    if (name === 'list') {
      return file.list({ folder: fpath.js }).sort()
    }
    if (!/\.js$/i.test(name)) {
      name += '.js'
    }
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
    if (!/\.js$/i.test(name)) {
      name += '.js'
    }
    try {
      if (typeof(cont) === 'object') {
        cont = JSON.stringify(cont)
      }
      let fullpath = path.join(fpath.js, name)
      let jsfolder = path.dirname(fullpath)
      if (!fs.existsSync(jsfolder)) {
        clog.info('mkdir', jsfolder, 'for', name)
        fs.mkdirSync(jsfolder, { recursive: true })
      }
      fs.writeFileSync(fullpath, cont, 'utf8')
      return true
    } catch(e) {
      clog.error('put js file error', name, e.stack)
      return false
    }
  },
  delete(name){
    if (!/\.js$/i.test(name)) {
      name += '.js'
    }
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
  maxByte: 1024*1024*2,
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
    if (key.length > 100) {
      clog.error('store put key is longer than 100, maybe put key and value in the wrong order. store.put(value, key)')
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
    if (Buffer.byteLength(value, 'utf8') > this.maxByte) {
      clog.error('store put error, data length is over limit', this.maxByte)
      return false
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
  }
}

module.exports = { list, Jsfile, store, file }