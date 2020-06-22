const fs = require('fs')
const path = require('path')

const crtpath = require('os').homedir() + '/.anyproxy/certificates'
const rootCApath = path.join(__dirname, "../rootCA")

const { logger } = require('../utils')
const clog = new logger({ head: 'crtFunc' })

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

module.exports = { clearCrt, rootCrtSync }