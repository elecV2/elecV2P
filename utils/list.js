const fs = require('fs')
const path = require('path')

const { logger } = require('./logger')
const clog = new logger({ head: 'utilsList' })

const listpath = path.join(__dirname, '../runjs', 'Lists')
if (!fs.existsSync(listpath)) {
  fs.mkdirSync(listpath)
  clog.notify('mkdir new Lists folder')
}

const list = {
  get(name){
    if (fs.existsSync(path.join(listpath, name))) {
      return fs.readFileSync(path.join(listpath, name), "utf8")
    }
    clog.error('no list', name)
  },
  put(name, cont){
    try {
      fs.writeFileSync(path.join(listpath, name), cont)
    } catch(e) {
      clog.error('put list file error', name, e.stack)
    }
  }
}

module.exports = { list }