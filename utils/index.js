const fs = require('fs')
const url = require('url')
const path = require('path')
const http = require('http')
const https = require('https')

const logger = require('./logger')
const feed = require('./feed')
const { now, wait } = require('./time')
const string = require('./string')

const clog = new logger({ head: 'utils' })

function downloadfile(durl, dest, cb) {
  let nurl = url.parse(durl)
  let req = nurl.protocol == "https:"?https:http
  return new Promise((resolve, reject)=>{
    req.get(durl, (response)=>{
      if (response.statusCode == 404) {
        clog.error(durl + ' 404! 文件不存在')
        reject('404! 文件不存在')
        return
      }
      let file = fs.createWriteStream(dest)
      response.pipe(file)
      file.on('finish', ()=>{
        clog.notify("download: " + durl + " to: " + dest)
        file.close(cb)
        resolve(dest)
      })
    }).on('error', e=>{
      clog.error('download fail!', e)
      reject('download fail')
    })
  })
}

module.exports = {
  logger,
  feed,
  now,
  wait,
  downloadfile,
  ...string
}