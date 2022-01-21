const fs = require('fs')
const path = require('path')
const { format } = require('util')
const { now } = require('./time')
const { sString } = require('./string')

const { CONFIG } = require('../config')

const CONFIG_LOG = {
  logspath: path.join(__dirname, '../logs'),
  levels: {
    error: 0,
    notify: 1,
    info: 2,
    debug: 3
  },
  alignHeadlen: 16,               // 日志头部长度
  globalLevel: CONFIG.gloglevel || 'info'
}

if(!fs.existsSync(CONFIG_LOG.logspath)) {
  fs.mkdirSync(CONFIG_LOG.logspath)
}

const logHeadCache = new Map()

class logger {
  _head = 'elecV2P'
  _level = 'info'

  log = this.info
  err = this.error
  warn = this.notify

  constructor({ head, level, isalignHead, cb, file }) {
    if(head) this._head = head
    if(level && CONFIG_LOG.levels.hasOwnProperty(level)) this._level = level
    if(cb) this._cb = cb
    if (file) {
      file = file.trim().replace(/\/|\\/g, '-');
      this._file = /\.log$/.test(file) ? file : file + '.log';
    }

    if (isalignHead !== false) {
      this.infohead = alignHead(this._head + ' info')
      this.notifyhead = alignHead(this._head + ' notify')
      this.errorhead = alignHead(this._head + ' error')
      this.debughead = alignHead(this._head + ' debug')
    } else {
      this.infohead = this._head + ' info'
      this.notifyhead = this._head + ' notify'
      this.errorhead = this._head + ' error'
      this.debughead = this._head + ' debug'
    }
  }

  setcb(cb){
    this._cb = cb
  }

  info(){
    const args = formArgs(...arguments)
    if (!args) return
    const cont = `[${ this.infohead }][${ now() }] ${ args }`
    if (CONFIG_LOG.levels[this._level] >= CONFIG_LOG.levels['info'] && CONFIG_LOG.levels['info'] <= CONFIG_LOG.levels[CONFIG_LOG.globalLevel]) {
      console.log(cont)
    }
    if(this._cb) this._cb(cont)
    if(this._file) LOGFILE.put(this._file, cont)
  }

  notify(){
    const args = formArgs(...arguments)
    if (!args) return
    const cont = `[${ this.notifyhead }][${ now() }] ${ args }`
    if (CONFIG_LOG.levels[this._level] >= CONFIG_LOG.levels['notify'] && CONFIG_LOG.levels['notify'] <= CONFIG_LOG.levels[CONFIG_LOG.globalLevel]) {
      console.log(cont)
    }
    if(this._cb) this._cb(cont)
    if(this._file) LOGFILE.put(this._file, cont)
  }

  error(){
    const args = formArgs(...arguments)
    if (!args) return
    const cont = `[${ this.errorhead }][${ now() }] ${ args }`
    if (CONFIG_LOG.levels[this._level] >= CONFIG_LOG.levels['error'] && CONFIG_LOG.levels['error'] <= CONFIG_LOG.levels[CONFIG_LOG.globalLevel]) {
      console.error(cont)
    }
    if(this._cb) this._cb(cont)
    if(this._file) LOGFILE.put(this._file, cont)
    LOGFILE.put('errors.log', cont)
  }

  debug(){
    if (CONFIG_LOG.levels[this._level] >= CONFIG_LOG.levels['debug'] && CONFIG_LOG.levels['debug'] <= CONFIG_LOG.levels[CONFIG_LOG.globalLevel]) {
      const args = formArgs(...arguments)
      if (!args) return
      const cont = `[${ this.debughead }][${ now() }] ${ args }`
      console.log(cont)
      if(this._cb) this._cb(cont)
      if(this._file) LOGFILE.put(this._file, cont)
    }
  }

  clear(){
    let cont = null
    if(this._file && LOGFILE.delete(this._file)) {
      cont = `[${ this.infohead }][${ now() }] ${ this._file } cleared`;
    } else {
      cont = `[${ this.infohead }][${ now() }] ${ this._file || '' } no exist yet, no need to clear`;
    }
    console.log(cont)
    if(this._cb) this._cb(cont)
  }

  ctime = {}
  time(label = 'default') {
    if (this.ctime[label]) {
      this.info('timer ' + label + ' already exists')
      return
    }
    this.ctime[label] = process.hrtime()
    this.info(`start a console timer: ${label}`)
  }
  timeLog(label = 'default', ...args) {
    if (!this.ctime[label]) {
      this.info('timer ' + label + ' does not exist')
      return
    }
    let diff = process.hrtime(this.ctime[label])
    this.info(`${label}: ${ (diff[0]*1e9 + diff[1]) / 1e6 }ms ${ formArgs.apply(this, args) }`)
  }
  timeEnd(label = 'default') {
    if (!this.ctime[label]) {
      this.info('timer ' + label + ' does not exist')
      return
    }
    let diff = process.hrtime(this.ctime[label])
    this.info(`timer ${label} end: ${ (diff[0]*1e9 + diff[1]) / 1e6 }ms`)
  }
}

const clog = new logger({ head: 'logger', level: 'debug' })

const LOGFILE = {
  streamList: {},
  statusList: {},
  filethList: {},
  filepath(name){
    if (!this.filethList[name]) {
      this.filethList[name] = path.join(CONFIG_LOG.logspath, name.trim().replace(/\/|\\/g, '-'))
    }
    return this.filethList[name]
  },
  streamFile(name, opclose = false){
    if (opclose) {
      if (this.streamList[name]) {
        this.streamList[name].end()
      }
      return
    }
    if (!this.streamList[name]) {
      let filename = this.filepath(name)
      this.streamList[name] = fs.createWriteStream(filename, { flags: 'a' })
      this.statusList[name] = {
        interval: setInterval(()=>{
          if (this.statusList[name].toclose) {
            this.streamList[name].end()
          } else {
            this.statusList[name].toclose = true
          }
        }, 5000),
        toclose: true
      }
      clog.debug('stream', filename, 'created')
      this.streamList[name].on('close', ()=>{
        clearInterval(this.statusList[name]?.interval);
        clog.debug(filename + ' stream closed')
        delete this.streamList[name]
        delete this.statusList[name]
        delete this.filethList[name]
      })
      this.streamList[name].on('error', ()=>{
        clearInterval(this.statusList[name]?.interval);
        clog.debug(filename + ' stream error')
        delete this.streamList[name]
        delete this.statusList[name]
        delete this.filethList[name]
      })
    }
    this.statusList[name].toclose = false
    return this.streamList[name]
  },
  put(filename, data, head = ''){
    if (!filename || data === undefined || data === '') {
      return
    }
    this.streamFile(filename).write((head ? `[${ alignHead(head) }][${ now() }] ` : '') + sString(data) + '\n')
  },
  get(filename){
    if (!filename) {
      return
    }
    filename = filename.trim()
    if (filename === 'all') {
      return require('./file.js').file.list({ folder: CONFIG_LOG.logspath, ext: ['.log'] })
    }
    let logfpath = path.join(CONFIG_LOG.logspath, filename)
    if (fs.existsSync(logfpath)) {
      if (fs.statSync(logfpath).isDirectory()) {
        return require('./file.js').file.list({ folder: logfpath, ext: ['.log'] })
      }
      return fs.createReadStream(logfpath)
    }
    clog.info(filename, 'not exist')
  },
  delete(filename){
    if (!filename) return
    filename = filename.trim()
    if (filename == 'all') {
      require('./file.js').file.list({ folder: CONFIG_LOG.logspath, ext: ['.log'] }).forEach(file=>{
        clog.notify('delete log file:', file);
        this.streamFile(filename, true);
        fs.unlinkSync(path.join(CONFIG_LOG.logspath, file));
      })
      return true
    }
    let logfpath = path.join(CONFIG_LOG.logspath, filename);
    if (fs.existsSync(logfpath)){
      this.streamFile(filename, true);
      clog.notify('delete log file:', filename);
      fs.unlinkSync(logfpath);
      // fs.writeFileSync(logfpath, '', 'utf8');
      return true
    } 
    return false
  }
}

function formArgs() {
  for (let i=0; i<arguments.length; i++) {
    if (typeof arguments[i] === 'string' && !/^\r|\r$/.test(arguments[i])) {
      arguments[i] = arguments[i].trim()
    }
  }
  return format(...arguments)
}

function alignHead(str, alignlen = CONFIG_LOG.alignHeadlen) {
  const cachekey = str + alignlen
  if (logHeadCache.has(cachekey)) {
    return logHeadCache.get(cachekey)
  }
  const loghaed = alignHeadOrg(str, alignlen)
  logHeadCache.set(cachekey, loghaed)
  return loghaed
}

function alignHeadOrg(str, alignlen = CONFIG_LOG.alignHeadlen) {
  let buf = Buffer.from(str), tlen = (buf.length + str.length) / 2
  if (tlen === alignlen) {
    return str
  }
  if (tlen < alignlen) {
    let nstr = str.split(' '), lastr = nstr.pop()
    lastr = ' '.repeat(alignlen - tlen) + lastr
    return nstr.join(' ') + ' ' + lastr
  }
  const sp = str.split(/\/|\\/)
  if (sp.length > 1) {
    str = sp[0].slice(0,1) + '/' + sp.pop()
    buf = Buffer.from(str)
    tlen = (buf.length + str.length) / 2
    if (tlen === alignlen) {
      return str
    }
    if (tlen < alignlen) {
      let nstr = str.split(' '), lastr = nstr.pop()
      lastr = ' '.repeat(alignlen - tlen) + lastr
      return nstr.join(' ') + ' ' + lastr
    }
  }
  let lsidx = buf.lastIndexOf(' '), lres
  let isZh  = (buf, idx)=>(buf[idx] >= 228 && (buf[idx+1] >= 128 && buf[idx+1] <=191) && (buf[idx+2] >= 128 && buf[idx+2] <=191))
  if (isZh(buf, lsidx - 4)) {
    lres = buf.slice(lsidx - 1)
  } else if (isZh(buf, lsidx - 3)) {
    lres = buf.slice(lsidx - 3)
    alignlen++
  } else {
    lres = buf.slice(lsidx - 2)
  }
  alignlen = alignlen - lres.length - 3
  tlen = 0
  let end = 0
  while (end <= buf.length) {
    if (isZh(buf, end)) {
      if (alignlen - tlen >= 2) {
        end += 3
        tlen += 2
      } else {
        break
      }
    } else {
      end++
      tlen++
    }
    if (tlen >= alignlen) {
      break
    }
  }

  let res = buf.slice(0, end).toString()
  if (tlen < alignlen) {
    res += ' '.repeat(alignlen - tlen)
  }
  return res + '...' + lres.toString()
}

function setGlog(level) {
  if (CONFIG_LOG.levels.hasOwnProperty(level)) {
    CONFIG_LOG.globalLevel = level
    clog.notify('global loglevel set to', level)
  } else {
    clog.error('illegal level', level, 'fail to change global loglevel.')
  }
}

module.exports = { logger, setGlog, LOGFILE }