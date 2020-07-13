const fs = require('fs')
const path = require('path')
const EasyCert = require('node-easy-cert');

const anycrtpath = require('os').homedir() + '/.anyproxy/certificates'

const rootCApath = path.join(__dirname, "../rootCA")
if(!fs.existsSync(rootCApath)) fs.mkdirSync(rootCApath)

const { logger } = require('../utils/')
const clog = new logger({ head: 'crtFunc' })

/**
 * 自签根证书生成
 * @param     {object}      evoptions    {commonName, overwrite}
 * @param     {Function}    cb           callback
 * @return    {none}                   
 */
function newRootCrt(evoptions, cb) {
  if (!evoptions.commonName) {
    clog.error('no commonName')
    if (cb) cb('no commonName')
    return false
  }
  const options = {
    rootDirPath: rootCApath,
    inMemory: false,
    defaultCertAttrs: [
      { name: 'countryName', value: 'CN' },
      { name: 'organizationName', value: 'elecV2P' },
      { shortName: 'ST', value: 'SH' },
      { shortName: 'OU', value: 'elecV2P Network Tools' }
    ]
  }

  const easyCert = new EasyCert(options)

  easyCert.generateRootCA(evoptions, (error, keyPath, crtPath) => {
    if (error) {
      clog.error(error)
    } else {
      clog.notify('new rootCA generated at', keyPath)
    }
    if(cb) cb(error, keyPath, crtPath)
  })
}

function clearCrt() {
  // 清空所有证书（除了 rootCA）
  clog.notify('开始清空所有证书（除 rootCA 外）：')
  fs.readdir(anycrtpath, (err, files) => {
    if (err) clog.error(err)

    for (const file of files) {
      if (/^rootCA/.test(file)) continue
      fs.unlink(path.join(anycrtpath, file), err => {
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
    fs.copyFileSync(rootCApath + "/rootCA.crt", anycrtpath + "/rootCA.crt")
    fs.copyFileSync(rootCApath + "/rootCA.key", anycrtpath + "/rootCA.key")
    return true
  }
  clog.info('rootCA 目录下无根证书，将自动生成新的证书')
  return false
}

module.exports = { clearCrt, rootCrtSync, newRootCrt }