const { now } = require('./time')

const levels = {
  error: 0,
  notify: 1,
  info: 2,
  debug: 3
}

let globalLevelel = 'info'

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

  constructor(head, level, isalignHead=true) {
    if(head) this._head = head
    if(levels.hasOwnProperty(level)) this._level = level
    if (isalignHead) {
      this.infohead = alignHead(this._head + ' info')
      this.notifyhead = alignHead(this._head + ' notify')
      this.errorhead = alignHead(this._head + ' error')
      this.debugheda = alignHead(this._head + ' debug')
    } else {
      this.infohead = this._head + ' info'
      this.notifyhead = this._head + ' notify'
      this.errorhead = this._head + ' error'
      this.debugheda = this._head + ' debug'
    }
  }

  setlevel(level, isglobal=false){
    if (isglobal) {
      globalLevelel = level
    } else {
      this._level = level
    }
  }

  info(){
    if (levels[this._level] >= levels['info'] && levels[this._level] <= levels[globalLevelel]) {
      console.log(`[${ this.infohead }][${ now() }]: ${ jsonArgs(arguments).join(' ') }`)
    }
  }

  notify(){
    if (levels[this._level] >= levels['notify'] && levels[this._level] <= levels[globalLevelel]) {
      console.log(`[${ this.notifyhead }][${ now() }]: ${ jsonArgs(arguments).join(' ') }`)
    }
  }

  error(){
    if (levels[this._level] >= levels['error'] && levels[this._level] <= levels[globalLevelel]) {
      console.error(`[${ this.errorhead }][${ now() }]: ${ jsonArgs(arguments).join(' ') }`)
    }
  }

  debug(){
    if (levels[this._level] >= levels['debug'] && levels[this._level] <= levels[globalLevelel]) {
      console.log(`[${ this.debugheda }][${ now() }]: ${ jsonArgs(arguments).join(' ') }`)
    }
  }
}