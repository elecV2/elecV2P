const fs = require('fs')
const url = require('url')
const path = require('path')
const http = require('http')
const https = require('https')
const homedir = require('os').homedir()
// const exec = require('child_process').exec
// 

const { logger, downloadfile } = require('../utils')
const { Task, TASKS_WORKER, TASKS_INFO, jobFunc } = require('./task')

const clog = new logger({head: 'Func'} )

const crtpath = homedir + '/.anyproxy/certificates'
const jsfpath = path.join(__dirname, "../runjs/JSFile")
const rootCApath = path.join(__dirname, "../rootCA")

if (!fs.existsSync(jsfpath)) { fs.mkdirSync(jsfpath) }

function clearCrt() {
  // 清空所有证书（除了 rootCA）
  clog.notify('开始清空所有证书（除 rootCA 外）：')
  fs.readdir(crtpath, (err, files) => {
    if (err) clog.error(err)

    for (const file of files) {
      if (/^rootCA/.test(file)) continue
      fs.unlink(path.join(crtpath, file), err => {
        if (err) clog.error(err)
        else clog.notify("删除证书", file)
      })
    }
  })
}

function rootCrtSync() {
  // 同步用户根证书和系统根证书
  if (fs.existsSync(path.join(rootCApath, "rootCA.crt")) && fs.existsSync(path.join(rootCApath, "rootCA.key"))) {
    clog.notify('启用 rootCA 文件夹下根证书')
    fs.copyFileSync(rootCApath + "/rootCA.crt", crtpath + "/rootCA.crt")
    fs.copyFileSync(rootCApath + "/rootCA.key", crtpath + "/rootCA.key")
    return true
  } else {
    clog.info('rootCA 目录下无相关证书')
    return false
  }
}

async function jsdownload(jsurl, name){
  let jsname = name || jsurl.split("/").pop()
  let dest = await downloadfile(jsurl, path.join(jsfpath, jsname))
  if (dest) {
    return "js download success! " + dest
  }
  return 'js download fail!'
}

module.exports = { Task, TASKS_WORKER, TASKS_INFO, jobFunc, clearCrt, rootCrtSync, jsdownload }