const fs = require('fs')
const url = require('url')
const path = require('path')
const http = require('http')
const https = require('https')

const logger = require('./logger')
const { now,wait } = require('./time')
const string = require('./string')

const clog = new logger('utils')

function downloadfile(durl, dest, cb) {
  let nurl = url.parse(durl)
  let req = nurl.protocol == "https:"?https:http
  let file = fs.createWriteStream(dest)
  return new Promise((resolve, reject)=>{
    req.get(durl, (response)=>{
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
  now,
  wait,
  downloadfile,
  ...string
}