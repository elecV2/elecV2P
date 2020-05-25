const fs = require('fs')
const path = require('path')
const { now } = require('./time')

const logFolder = path.join(__dirname, '../logs')
if(!fs.existsSync(logFolder)) fs.mkdirSync(logFolder)

const levels = {
  error: 0,
  notify: 1,
  info: 2,
  debug: 3
}

let globalLevel = 'info'

function jsonArgs(args) {
  return [...args].map(arg=>typeof(arg) !== 'string' ? JSON.stringify(arg) : arg)
}

function alignHead(head) {
  if (head.length == 16) return head
  if (head.length < 16) {
    let nstr = head.split(' ')
    let space = 16 - head.length
    while(space--){
      nstr[0] += ' '
    }
    return nstr.join(' ')
  }
  if (head.length > 16) {
    let nstr = head.split(' ').pop()
    return head.slice(0, 10-nstr.length) + '...' + head.slice(-nstr.length-3)
  }
}

module.exports = class {
  _head = 'elecV2P'
  _level = 'info'             // error, info, debug
 
  log = this.info
  err = this.error

  constructor({ head, level, isalignHead, cb, file }) {
    if(head) this._head = head
    if(levels.hasOwnProperty(level)) this._level = level
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

  setlevel(level, isglobal=false){
    if (isglobal) {
      this.notify('全局日志级别调整为：', level)
      globalLevel = level
    } else {
      this._level = level
    }
  }

  info(){
    let cont = `[${ this.infohead }][${ now() }]: ${ jsonArgs(arguments).join(' ') }`
    if (levels[this._level] >= levels['info'] && levels['info'] <= levels[globalLevel]) {
      console.log(cont)
    }
    if(this._cb) this._cb(cont)
    if(this._file) this.file(this._file, cont)
  }

  notify(){
    let cont = `[${ this.notifyhead }][${ now() }]: ${ jsonArgs(arguments).join(' ') }`
    if (levels[this._level] >= levels['notify'] && levels['notify'] <= levels[globalLevel]) {
      console.log(cont)
    }
    if(this._cb) this._cb(cont)
    if(this._file) this.file(this._file, cont)
  }

  error(){
    let cont = `[${ this.errorhead }][${ now() }]: ${ jsonArgs(arguments).join(' ') }`
    if (levels[this._level] >= levels['error'] && levels['error'] <= levels[globalLevel]) {
      console.error(cont)
    }
    if(this._cb) this._cb(cont)
    if(this._file) this.file(this._file, cont)
    this.file('errors.log', cont)
  }

  debug(){
    let cont = `[${ this.debughead }][${ now() }]: ${ jsonArgs(arguments).join(' ') }`
    if (levels[this._level] >= levels['debug'] && levels['debug'] <= levels[globalLevel]) {
      console.log(cont)
      if(this._cb) this._cb(cont)
      if(this._file) this.file(this._file, cont)
    }
  }

  file(filename, data){
    fs.appendFile(path.join(logFolder, filename), data + '\n', (err) => {
      if (err) this.notify(err)
    })
  }
}