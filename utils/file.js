const fs = require('fs')
const path = require('path')
const os = require('os')
const Zip = require('adm-zip')

const { errStack, sJson, sString, sType, sBool, bEmpty, iRandom, euid, kSize, ebufEncrypt, ebufDecrypt } = require('./string')
const { now } = require('./time')
const { logger } = require('./logger')
const clog = new logger({ head: 'utilsFile', level: 'debug' })

const { CONFIG_Port } = require('../config')
clog.debug('CONFIG path:', CONFIG_Port.path)

const fpath = {
  list: CONFIG_Port.path_lists,
  js: CONFIG_Port.path_script,
  store: CONFIG_Port.path_store,
  homedir: os.homedir(),
  tempdir: os.tmpdir()
}

if (!fs.existsSync(fpath.list)) {
  fs.mkdirSync(fpath.list, { recursive: true })
  clog.notify('make a new Lists directory:', fpath.list)
} else if (fs.statSync(fpath.list).isDirectory()) {
  clog.debug('Lists  directory:', fpath.list)
} else {
  clog.error(fpath.list, 'is not a directory')
}

if (!fs.existsSync(fpath.js)) {
  fs.mkdirSync(fpath.js, { recursive: true })
  clog.notify('make a new Script directory:', fpath.js)
} else if (fs.statSync(fpath.js).isDirectory()) {
  clog.debug('Script directory:', fpath.js)
} else {
  clog.error(fpath.js, 'is not a directory')
}

if (!fs.existsSync(fpath.store)) {
  fs.mkdirSync(fpath.store, { recursive: true })
  clog.notify('make a new Store directory:', fpath.store)
} else if (fs.statSync(fpath.store).isDirectory()) {
  clog.debug('Store  directory:', fpath.store)
} else {
  clog.error(fpath.store, 'is not a directory')
}

if (!fs.existsSync(CONFIG_Port.path_shell)) {
  fs.mkdirSync(CONFIG_Port.path_shell, { recursive: true })
  clog.notify('make a new Shell directory:', CONFIG_Port.path_shell)
} else if (fs.statSync(CONFIG_Port.path_shell).isDirectory()) {
  clog.debug('Shell  directory:', CONFIG_Port.path_shell)
} else {
  clog.error(CONFIG_Port.path_shell, 'is not a directory')
}

const list = {
  get(name, type = ''){
    // 待优化：
    // - 移除对旧 .ini/.toml 类似格式的支持
    // - 优化返回结果
    let listpath = path.join(fpath.list, name)
    if (type === 'path') {
      return listpath
    }
    if (fs.existsSync(listpath)) {
      let liststr = fs.readFileSync(listpath, "utf8")
      let listobj = sJson(liststr)
      switch(name) {
      case 'mitmhost.list':
        if (listobj?.mitmhost?.list) {
          return listobj.mitmhost
        }
        return {
          list: liststr.split(/\r|\n/).filter(host=>!(/^(\[|#|;)/.test(host) || host.length < 3))
        }
        break
      case 'rewrite.list':
        if (listobj?.rewrite?.list) {
          return listobj
        }
        return {
          rewrite: {
            note: 'elecV2P rewrite list',
            list: []
          }
        }
        break
      case 'default.list':
        if (listobj?.rules?.list) {
          return listobj
        }
        return {
          rules: {
            note: 'elecV2P rules list',
            list: []
          }
        }
        break
      case 'useragent.list':
        if (Object.keys(listobj).length !== 0) {
          return listobj
        }
        return {
          "iPhone": {
            "name": "iPhone Safari",
            "header": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Mobile/15E148 Safari/604.1"
          },
          "chrome": {
            "name": "chrome win10x64",
            "header": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36"
          }
        }
        break
      case 'task.list':
        return listobj || Object.create(null)
      default:
        return liststr
      }
    }
    clog.error('no list', name)
    let listobj = Object.create(null)
    switch (name) {
    case 'useragent.list':
      listobj = {
        "iPhone": {
          "name": "iPhone Safari",
          "header": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Mobile/15E148 Safari/604.1"
        },
        "chrome": {
          "name": "chrome win10x64",
          "header": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36"
        }
      }
    // no break to make make
    case 'default.list':
    case 'mitmhost.list':
    case 'rewrite.list':
    case 'task.list':
      clog.info('make new file:', name)
      fs.writeFile(listpath, JSON.stringify(listobj, null, 2), 'utf8', (err)=>{
        if (err) {
          clog.error(err);
        }
      });
      return listobj
    // 不处理其他文件，比如： filter.list, config.json
    }
    return ''
  },
  put(name, cont, option = {}){
    try {
      name = name.trim()
      if (option.type === 'add') {
        if (name === 'mitmhost.list') {
          let orglist = this.get('mitmhost.list')
          let listadd = (host, note = '', enable = true)=>{
            let fhost = orglist.list.find(x=>x.host === host)
            if (fhost) {
              fhost.enable = sBool(enable)
              if (note && fhost.note !== note) {
                if (fhost.note) {
                  fhost.note += '|' + note
                } else {
                  fhost.note = note
                }
              }
            } else {
              orglist.list.push({
                host, note, enable: sBool(enable)
              })
            }
          }
          let contype = sType(cont)
          if (contype === 'string') {
            if (cont.length > 2) {
              listadd(cont, option.note)
            }
          } else if (contype === 'array') {
            cont.forEach(host=>{
              if (typeof(host) === 'string' && host.length>2) {
                listadd(host, option.note)
              } else if (typeof(host) === 'object' && host.host) {
                listadd(host.host, option.note, host.enable)
              }
            })
          } else {
            clog.error('mitmhost.list addition put error: unknow cont type')
            return false
          }
          cont = { mitmhost: orglist }
        }
      }
      fs.writeFileSync(name === 'config.json' ? CONFIG_Port.path : path.join(fpath.list, name), sType(cont) === 'object' ? JSON.stringify(cont, null, 2) : sString(cont), 'utf8')
      clog.info('elecV2P', name, 'updated')
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
      clog.info('a first parameter is expect, file.get no result')
      return
    }
    if (/^(\$|~)/.test(pname)) {
      pname = pname.replace(/^(\$home|~)/i, fpath.homedir)
      pname = pname.replace(/^\$(temp|tmp)/i, fpath.tempdir)
    }
    let filepath = path.resolve(__dirname, '../', pname)
    if (type === 'path') {
      return filepath
    }
    if (fs.existsSync(filepath)) {
      if (fs.statSync(filepath).isDirectory()) {
        return filepath + ' is a directory'
      }
      return fs.readFileSync(filepath, 'utf8')
    }
    clog.error(pname, 'not exist')
  },
  delete(fname, basepath) {
    basepath && (fname = path.join(basepath, fname))
    if (fs.existsSync(fname)) {
      fs.rmSync(fname, { recursive: true, force: true })
      clog.info('delete file', fname)
      return true
    } else {
      clog.info('file', fname, 'no exist')
      return false
    }
  },
  save(fpath, fcont, cb=()=>{}){
    clog.info(`save file to ${fpath}`)
    let folder = path.dirname(fpath)
    if (!fs.existsSync(folder)) {
      clog.info('mkdir', folder, 'for', fpath)
      fs.mkdirSync(folder, { recursive: true })
    }
    switch (sType(fcont)) {
    case 'buffer':
      break
    case 'object':
      fcont = JSON.stringify(fcont, null, 2)
      break
    default:
      fcont = sString(fcont)
    }
    fs.writeFile(fpath, fcont, 'utf8', cb)
  },
  copy(source, target, cb=()=>{}){
    clog.info('copy', source, 'to', target)
    fs.copyFile(source, target, cb)
  },
  move(source, target, cb=()=>{}){
    clog.info('move', source, 'to', target)
    fs.rename(source, target, cb)
  },
  rename(oldPath, newPath, cb=()=>{}){
    // AKA - move
    clog.info('rename', oldPath, 'to', newPath)
    fs.rename(oldPath, newPath, cb)
  },
  mkdir(dir, cb=()=>{}){
    fs.mkdir(dir, { recursive: true }, cb)
  },
  path(x1, x2){
    if (!(x1 && x2)) return
    if (/^(\$|~)/.test(x1)) {
      x1 = x1.replace(/^(\$home|~)/i, fpath.homedir)
      x1 = x1.replace(/^\$(temp|tmp)/i, fpath.tempdir)
    }
    if (/^(\$|~)/.test(x2)) {
      x2 = x2.replace(/^(\$home|~)/i, fpath.homedir)
      x2 = x2.replace(/^\$(temp|tmp)/i, fpath.tempdir)
    }
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
  zip(filelist, targetfile = 'buffer'){
    if (sType(filelist) !== 'array') {
      clog.error('a array parameter is expect when compress zip files')
      return false
    }
    if (filelist.length === 0) {
      clog.error('no files to compress')
      return false
    }
    let zip = new Zip()
    filelist.forEach(file=>{
      if (fs.existsSync(file)) {
        if (fs.statSync(file).isDirectory()) {
          clog.debug('add directory', file, 'to', targetfile)
          zip.addLocalFolder(file)
        } else {
          clog.debug('add file', file, 'to', targetfile)
          zip.addLocalFile(file)
        }
      } else {
        clog.error(file, 'not exist, skip compress')
      }
    })
    if (targetfile === 'buffer') {
      return zip.toBuffer()
    } else if (!/\.zip$/.test(targetfile)) {
      targetfile = targetfile + '.zip'
    }
    zip.writeZip(targetfile)
    clog.info('success compress all files to', targetfile)
    return true
  },
  unzip(zipfile, targetpath, options = {}){
    if (fs.existsSync(zipfile)) {
      let zip = new Zip(zipfile)
      if (!targetpath) {
        targetpath = path.dirname(zipfile)
      }
      zip.extractAllTo(targetpath, options.overwrite)
      clog.info('success uncompress', zipfile, 'to', targetpath)
      if (options.filelist) {
        return this.aList(targetpath)
      }
      return true
    } else {
      clog.error(zipfile, 'not exist, cant unzip')
      return false
    }
  },
  aList(folder, option = { max: -1, dot: true, skip: { folder: [], file: [] } }, progress = { num: 0 }){
    if (!fs.existsSync(folder)) {
      clog.error('directory', folder, 'not exist')
      return null
    }
    folder = path.resolve(folder)
    let basename = path.basename(folder)
    if (Boolean(option.dot) === false && basename.startsWith('.')) {
      return null
    }
    let fstat = fs.statSync(folder)
    if (fstat.isDirectory()) {
      if (option.skip && option.skip.folder && option.skip.folder.indexOf(basename) !== -1) {
        clog.info('file aList skip folder', basename)
        return null
      }
      let rlist = [], flist = []
      try {
        rlist = fs.readdirSync(folder)
      } catch(e) {
        clog.error(errStack(e))
      }
      for (let fo of rlist) {
        if (option.max !== -1 && progress.num >= option.max) {
          break
        }
        flist.push(this.aList(path.join(folder, fo), option, progress))
      }
      return {
        type: 'directory',
        name: basename,
        list: flist.filter(f=>f),
        mtime: fstat.mtimeMs
      }
    } else {
      if (option.skip && option.skip.file && option.skip.file.indexOf(basename) !== -1) {
        clog.info('file aList skip file', basename)
        return null
      }
      if (option.max !== -1) {
        progress.num++
      }
      return {
        type: 'file',
        name: basename,
        size: kSize(fstat.size),
        mtime: fstat.mtimeMs
      }
    }
  },
  list({ folder, max=1000, dotfiles='deny', ext=[], noext=[], detail=false, index='' }) {
    // ext: 只返回该 extension 的文件, noext: 不包括该后缀名的文件
    // detail: true 返回 array<object>, false 返回 array<string>
    // index: 有值且 folder 下存在该文件时，返回且仅返回首个匹配到的 index 文件
    // index type<string|array<string>>，不支持子目录，最终返回 [{ ..., index: true}]
    if (!(folder && fs.existsSync(folder)) || max <= 0) {
      return []
    }
    const fileInfo = (sub, fd, fstat={}) => {
      return detail ? {
        name: sub + fd,
        size: kSize(fstat.size),
        mtime: fstat.mtimeMs
      } : sub + fd
    }
    let fstat = fs.statSync(folder)
    if (!fstat.isDirectory()) {
      return [fileInfo('', folder, fstat)]
    }

    let curnum = 0, fnlist = [], subfolder = [], newfolder = folder
    while (curnum<max) {
      let subf = subfolder.length ? subfolder.shift() : ''
      if (subf) {
        newfolder = path.join(folder, subf)
        subf = subf + '/'
        index = ''        // 子目录不进行 index 检测
      }
      let list = fs.readdirSync(newfolder), list_len = list.length
      for (let i = 0;i < list_len;i++) {
        let fd = list[i]
        if (dotfiles !== 'allow' && /^\./.test(fd)) {
          continue
        }
        let fstat = fs.statSync(path.join(newfolder, fd))
        if (fstat.isDirectory()) {
          subfolder.push(subf + fd)
        } else {
          let extname = path.extname(fd).toLowerCase()
          if (ext.length && ext.indexOf(extname) === -1) {
            continue
          }
          if (noext.length && noext.indexOf(extname) !== -1) {
            continue
          }
          if (index && index.includes(fd)) {
            return [{
              name: subf + fd,
              size: kSize(fstat.size),
              mtime: fstat.mtimeMs,
              index: true,
            }]
          }
          fnlist.push(fileInfo(subf, fd, fstat))
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
  get(name, type = ''){
    if (bEmpty(name)) {
      return false
    }
    name = name.trim()
    if (name === 'list') {
      return file.list({ folder: fpath.js, ext: ['.js', '.efh'] }).sort()
    }
    if (!/\.(js|efh)$/i.test(name)) {
      name += '.js'
    }
    let jspath = path.join(fpath.js, name)
    if (type === 'path') {
      return jspath
    }
    if (type === 'dir') {
      return path.dirname(jspath)
    }
    if (fs.existsSync(jspath)) {
      let fstat = fs.statSync(jspath)
      if (fstat.isDirectory()) {
        clog.error(jspath, 'is a directory')
        return false
      }
      if (type === 'date') {
        return fstat.mtimeMs
      }
      return fs.readFileSync(jspath, 'utf8')
    }
    clog.error('no such script:', name);
    return false
  },
  put(name, cont){
    if (!/\.(js|efh)$/i.test(name)) {
      name += '.js'
    }
    try {
      let fullpath = path.join(fpath.js, name)
      let jsfolder = path.dirname(fullpath)
      if (!fs.existsSync(jsfolder)) {
        clog.info('mkdir', jsfolder, 'for', name)
        fs.mkdirSync(jsfolder, { recursive: true })
      }
      fs.writeFileSync(fullpath, sType(cont) === 'object' ? JSON.stringify(cont, null, 2) : sString(cont), 'utf8')
      clog.info(`${name} success saved`)
      return true
    } catch(e) {
      clog.error('put js file error', name, e.stack)
      return false
    }
  },
  delete(name){
    if (bEmpty(name)) {
      clog.info('first parameter is expect')
      return false
    }
    let delf = (name) => {
      if (!/\.(js|efh)$/i.test(name)) {
        name += '.js'
      }
      let jspath = path.join(fpath.js, name)
      if (fs.existsSync(jspath)) {
        fs.unlinkSync(jspath)
        clog.info(name, 'deleted')
        return true
      } else {
        clog.error('no such script:', name);
        return false
      }
    }

    switch (sType(name)) {
    case 'array':
      let delist = []
      name.forEach(n=>{
        if (delf(n)) {
          delist.push(n)
        }
      })
      if (delist.length) {
        return delist
      }
      return false
    case 'string':
    default:
      return delf(name)
    }
  },
  clear(){
    // 清空目录下非 JS 文件
    let nojslist = file.list({ folder: fpath.js, noext: ['.js', '.efh'] })
    nojslist.forEach(f=>file.delete(f, fpath.js))
    return nojslist
  }
}

const store = {
  maxByte: 1024*1024*2,
  path: fpath.store,
  get(key, options = {}) {
    // empty key return undefined, don't change
    if (bEmpty(key)) {
      clog.debug('store.get error: a key is expect')
      return
    }
    key = key.trim()
    clog.debug('get value from:', key)
    let keypath = path.join(fpath.store, key)
    if (!fs.existsSync(keypath)) {
      clog.debug(key, 'not set yet')
      return
    }
    let keystat = fs.statSync(keypath)
    if (keystat.isDirectory()) {
      return key + ' is a folder'
    }
    if (keystat.size > this.maxByte) {
      return 'the size of ' + key + ' is ' + keystat.size + ', over limit ' + this.maxByte
    }
    let value = fs.readFileSync(keypath, 'utf8')
    let type  = ''
    if (typeof options === 'string') {
      type = options
    } else {
      type = options && options.type
      if (options.pass) {
        switch (options.algo) {
        case 'ebuf':
        default:
          value = ebufDecrypt(value, options.pass)
        }
      }
    }
    if (type === 'raw') {
      return value
    }
    let objv = sJson(value)
    if (objv && objv.value !== undefined && /^(number|boolean|object|string|array)$/.test(objv.type)) {
      value = objv.value
    }
    if (type === undefined) {
      return value
    }
    switch (type) {
      case 'boolean':
        return sBool(value)
      case 'number':
        return Number(value)
      case 'array':
      case 'object':
      case 'json':
      case 'dict':
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
        clog.error('unknow store.get type', type, 'return original value')
        return value
      }
    }
  },
  put(value, key, options = {}) {
    if (bEmpty(key) || value === undefined) {
      clog.error('store put error: no key or value')
      return false
    }
    if (key.length > 64) {
      clog.error('store put key: ' + key + ' is longer than 64, maybe put key and value in wrong order. store.put(value, key)')
      return false
    }
    clog.debug('put value into:', key)
    if (value === '') {
      return this.delete(key)
    }
    let type = ''
    if (typeof options === 'string') {
      type = options
    } else {
      type = options && options.type
    }
    if (type === 'a') {
      let oldval = this.get(key, { pass: options.pass, algo: options.algo })
      if (oldval !== undefined) {
        if (typeof oldval === 'string') {
          value = oldval + '\n' + sString(value)
        } else if (Array.isArray(oldval)) {
          value = Array.isArray(value) ? [...oldval, ...value] : [...oldval, value]
        } else if (sType(oldval) === 'object') {
          value = Object.assign(oldval, sJson(value, true))
        } else if (typeof oldval === 'number') {
          value = oldval + Number(value)
        }
      }
      type = sType(value)
    } else if (type === 'number') {
      value = Number(value)
    } else if (type === 'boolean') {
      value = sBool(value)
    } else if (type === 'object' || type === 'array') {
      value = sJson(value, true)
    } else if (type === 'string') {
      value = sString(value)
    } else {
      type = sType(value)
    }
    if (!/^(number|boolean|object|array)$/.test(type)) {
      type = 'string'
      value = String(value)
    }
    value = JSON.stringify({
      type, value,
      note: options.note,
      belong: options.belong,
      update: options.update || now(null, false, 0),
      private: options.private,
    })
    if (Buffer.byteLength(value, 'utf8') > this.maxByte) {
      clog.error('store put error, data length is over limit', this.maxByte)
      return false
    }
    if (options.pass) {
      switch (options.algo) {
      case 'ebuf':
      default:
        value = ebufEncrypt(value, options.pass)
      }
    }
    fs.writeFileSync(path.join(fpath.store, key), value, 'utf8')
    return true
  },
  delete(key) {
    if (bEmpty(key)) {
      clog.debug('store.delete first parameter is expect')
      return false
    }
    clog.debug('delete store key:', key)
    let spath = path.join(fpath.store, key)
    if (fs.existsSync(spath)) {
      fs.unlinkSync(spath)
      return true
    }
    clog.info('store key', key, 'no exist')
    return false
  },
  all() {
    return fs.readdirSync(fpath.store)
  },
  backup(targetfile = ''){
    const zip = new Zip();
    zip.addLocalFolder(fpath.store);
    if (targetfile && typeof targetfile === 'string') {
      zip.writeZip(targetfile);
      clog.info('backup store', fpath.store, 'to', targetfile);
      return true;
    } else {
      clog.info('export store', fpath.store, 'as buffer');
      return zip.toBuffer();
    }
  },
}

let estartinfo = store.get('elecV2PStartInfo');
if (estartinfo && sType(estartinfo) === 'array') {
  if (estartinfo.length >= 99) {
    clog.info('elecV2P start for', estartinfo.length, 'times, reset to 1');
    estartinfo = [];
  }
  estartinfo.push(now(null, true, 0));
} else {
  estartinfo = [now(null, true, 0)];
}
store.put(estartinfo, 'elecV2PStartInfo', { note: 'Every time of elecV2P start' });
clog.info('elecV2P start', estartinfo.length, 'times');

module.exports = { list, Jsfile, store, file }