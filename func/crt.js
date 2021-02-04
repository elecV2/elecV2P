const fs = require('fs')
const path = require('path')
const forge = require('node-forge')
const EasyCert = require('node-easy-cert')

const anycrtpath = require('os').homedir() + '/.anyproxy/certificates'

const rootCApath = path.join(__dirname, "../rootCA")
if(!fs.existsSync(rootCApath)) fs.mkdirSync(rootCApath)

const { logger } = require('../utils')
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
      const password = evoptions.password || 'elecV2P'
      const p12b64 = pemToP12(keyPath, crtPath, password)
      fs.writeFileSync(path.join(rootCApath, 'p12b64.txt'), `password = ${password}\np12base64 = ${p12b64}`, 'utf8')
    }
    if(cb) cb(error, keyPath, crtPath)
  })
}

function clearCrt() {
  // 清空所有证书（除了 rootCA）
  clog.notify('start to clear certificates.(except rootCA)')
  fs.readdir(anycrtpath, (err, files) => {
    if (err) clog.error(err)

    for (const file of files) {
      if (/^rootCA/.test(file)) continue
      fs.unlink(path.join(anycrtpath, file), err => {
        if (err) clog.error(err)
        else clog.notify("delete certificates", file)
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

function pemToP12(keyPath, crtPath, password='elecV2P') {
  const key = fs.readFileSync(keyPath)
  const crt = fs.readFileSync(crtPath)
  const prikey = forge.pki.privateKeyFromPem(key.toString())
  const pubcrt = forge.pki.certificateFromPem(crt.toString())

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(prikey, pubcrt, password)
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes()
  const p12b64 = forge.util.encode64(p12Der)

  return p12b64
}

module.exports = { clearCrt, rootCrtSync, newRootCrt }