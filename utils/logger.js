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
    if(file) this._file = /\.log/.test(file) ? file : file + '.log'

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
      cont = `[${ this.infohead }][${ now() }] ${ this._file } was cleared`
    } else {
      cont = `[${ this.infohead }][${ now() }] no log file to clear`
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
  streamFile(name){
    if (!this.streamList[name]) {
      this.streamList[name] = fs.createWriteStream(name, { flags: 'a' })
      this.statusList[name] = {
        interval: setInterval(()=>{
          if (this.statusList[name].toclose) {
            clearInterval(this.statusList[name].interval)
            this.streamList[name].end()
          } else {
            this.statusList[name].toclose = true
          }
        }, 5000),
        toclose: true
      }
      clog.debug('stream', name, 'created')
      this.streamList[name].on('close', ()=>{
        clog.debug(name + ' stream closed')
        delete this.streamList[name]
        delete this.statusList[name]
      })
      this.streamList[name].on('error', ()=>{
        clog.debug(name + ' stream error')
        delete this.streamList[name]
        delete this.statusList[name]
      })
    }
    this.statusList[name].toclose = false
    return this.streamList[name]
  },
  put(filename, data){
    if (!filename || data === undefined || data === '') {
      return
    }
    this.streamFile(path.join(CONFIG_LOG.logspath, filename.trim().replace(/\/|\\/g, '-'))).write(sString(data) + '\n')
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
        clog.notify('delete log file:', file)
        fs.unlinkSync(path.join(CONFIG_LOG.logspath, file))
      })
      return true
    }
    if (fs.existsSync(path.join(CONFIG_LOG.logspath, filename))){
      clog.notify('delete log file:', filename)
      fs.unlinkSync(path.join(CONFIG_LOG.logspath, filename))
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

function alignHead(head) {
  if (head.length === CONFIG_LOG.alignHeadlen) {
    return head
  }
  if (head.length < CONFIG_LOG.alignHeadlen) {
    let nstr = head.split(' ')
    let space = CONFIG_LOG.alignHeadlen - head.length
    while(space--){
      nstr[0] += ' '
    }
    return nstr.join(' ')
  }
  if (head.length > CONFIG_LOG.alignHeadlen) {
    const sp = head.split(/\/|\\/)
    if (sp.length > 1) {
      head = sp[0].slice(0,1) + '/' + sp.pop()
    }
    const nstr = head.split(' ').pop()
    return head.slice(0, CONFIG_LOG.alignHeadlen-6-nstr.length) + '...' + head.slice(-nstr.length-3)
  }
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