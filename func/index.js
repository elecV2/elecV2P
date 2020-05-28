const fs = require('fs')
const url = require('url')
const path = require('path')
const http = require('http')
const https = require('https')
const homedir = require('os').homedir()
// const exec = require('child_process').exec
// 
const { logger, downloadfile } = require('../utils')
const task = require('./task')
const { wsSer } = require('./websocket')

const clog = new logger({head: 'Func'} )

const crtpath = homedir + '/.anyproxy/certificates'
const jsfpath = path.join(__dirname, "../runjs/JSFile")
const rootCApath = path.join(__dirname, "../rootCA")

if (!fs.existsSync(jsfpath)) { fs.mkdirSync(jsfpath) }

function clearCrt() {
  // 清空所有证书（除了 rootCA）
  clog.notify('开始清空所有证书（除 rootCA 外）：')
  fs.readdir(crtpath, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      if (/^rootCA/.test(file)) continue
      fs.unlink(path.join(crtpath, file), err => {
        if (err) throw err;
        else clog.notify("删除证书- " + file)
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

function crule(ourl){
  // 更新
  let frule = []
  let nurl = url.parse(ourl)
  let req = nurl.protocol == "https:"?https:http
  req.get(ourl, (res)=>{
    let str = ""
    res.on('data', (chunk)=>{
      str += chunk;
    })
    res.on("end", ()=>{
      let newfilterlist=["# 以下规则来自 " + ourl + " hostname"]
      str.split(/\n|\r/).forEach(l=>{
        if (/^hostname/.test(l)) {
          l.replace(/ /g, "").split("=").slice(-1)[0].split(",").forEach(host=>{
            if (/^\*\./.test(host)) newfilterlist.push("DOMAIN-SUFFIX," + host.replace("*.", "") + ",elecV2P")
            else if (/\*/.test(host)) return
            else newfilterlist.push("DOMAIN," + host + ",elecV2P")
          })
        }
        if (/^#/.test(l) || l.length<2) return
        let item = l.split(" ")
        if (item.length == 4 && /js$/.test(item[3])) {
          if (/^http/.test(item[3])) {
            jsdownload(item[3])
          }
          frule.push([item[0], item[3]])
        }
      })
      clog.info(`新增规则 ${frule.length} 条，filter.list 增加域名 ${ filterlist(newfilterlist) } 个`)
    })
  })
  return frule.length
}

async function jsdownload(jsurl, name){
  let jsname = name || jsurl.split("/").pop()
  let dest = await downloadfile(jsurl, path.join(jsfpath, jsname))
  if (dest) {
    return "js download success! " + dest
  }
  return 'js download fail!'
}

function filterlist(lists, add=true) {
  let flist = path.join(__dirname, "../runjs/filter.list"), oldlists=[], mergelists=[]
  if (add) {
    oldlists = fs.readFileSync(flist, 'utf8').split(/\n|\r/)
    mergelists = Array.from(new Set([...oldlists, ...lists]))
  } else {
    mergelists = lists
  }
  fs.writeFileSync(flist, mergelists.join("\n"))
  return String(mergelists.length - oldlists.length)
}

module.exports = { task, wsSer, clearCrt, rootCrtSync, crule, jsdownload, filterlist }