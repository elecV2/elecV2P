const fs = require('fs')
const os = require('os')
const path = require('path')
const forge = require('node-forge')
const EasyCert = require('node-easy-cert')

const anycrtpath = path.join(os.homedir(), '.anyproxy/certificates')
const rootCApath = path.join(__dirname, '../rootCA')

const crt_path = {
  any: anycrtpath,
  crt: path.join(rootCApath, 'rootCA.crt'),
  p12: path.join(rootCApath, 'p12b64.txt'),
  dot: (()=>{
    const dcrt = fs.readdirSync(rootCApath).find(s=>/\.0$/.test(s))
    if (dcrt) {
      return path.join(rootCApath, dcrt)
    }
    return ''
  })(),
}

if(!fs.existsSync(anycrtpath)) {
  fs.mkdirSync(anycrtpath, { recursive: true })
}
if(!fs.existsSync(rootCApath)) {
  fs.mkdirSync(rootCApath, { recursive: true })
}

const { logger, errStack, now, euid } = require('../utils')
const clog = new logger({ head: 'funcCrt' })

const { exec } = require('./exec')

const easyCert = new EasyCert({
  rootDirPath: rootCApath,
  inMemory: false,
  defaultCertAttrs: [
    { name: 'countryName', value: 'CN' },
    { name: 'organizationName', value: 'elecV2P' },
    { shortName: 'ST', value: 'SH' },
    { shortName: 'OU', value: 'elecV2P Network Tools' }
  ]
})

/**
 * 自签根证书生成
 * @param     {object}      evoptions    {commonName, overwrite}
 * @return    {none}                   
 */
function newRootCrt(evoptions={}) {
  if (!evoptions.commonName) {
    evoptions.commonName = 'elecV2P'
  } else {
    evoptions.commonName = encodeURI(evoptions.commonName)
  }

  return new Promise((resolve, reject)=>{
    easyCert.generateRootCA(evoptions, (error, keyPath, crtPath) => {
      if (error) {
        reject(error)
        clog.error(error)
      } else {
        resolve({ keyPath, crtPath })
        clog.notify('new rootCA generated at', crtPath)
        const password = evoptions.password || 'elecV2P_' + euid(4)
        const p12b64 = pemToP12(keyPath, crtPath, password)
        fs.writeFile(crt_path.p12, `password = ${password}\np12base64 = ${p12b64}`, 'utf8', err=>{
          if (err) {
            clog.error('fail to generate p12 crt', errStack(err))
            crt_path.p12 = ''
          } else {
            clog.info('success generate p12b64.txt')
          }
        })
        androidCrt(crtPath)
      }
    })
  })
}

function clearCrt() {
  // 清空所有证书（除了 rootCA）
  clog.notify('start to clear certificates(except rootCA)')
  fs.readdir(anycrtpath, (err, files) => {
    if (err) {
      clog.error(errStack(err))
    }

    for (const file of files) {
      if (/^rootCA/.test(file)) continue
      fs.unlink(path.join(anycrtpath, file), err => {
        if (err) {
          clog.error(errStack(err))
        } else {
          clog.notify('delete certificates', file)
        }
      })
    }
  })
}

async function rootCrtSync() {
  // 同步用户根证书和系统根证书
  let rcrt = path.join(rootCApath, 'rootCA.crt'),
      rkey = path.join(rootCApath, 'rootCA.key')
  if (!(fs.existsSync(rcrt) && fs.existsSync(rkey))) {
    await newRootCrt()
  }
  clog.info('move rootCA.crt/rootCA.key to', anycrtpath)
  fs.copyFileSync(rcrt, anycrtpath + '/rootCA.crt')
  fs.copyFileSync(rkey, anycrtpath + '/rootCA.key')
  return true
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

function androidCrt(crtPath) {
  exec(`openssl x509 -in ${crtPath} -noout -subject_hash_old`, {
    cb(data, error) {
      if (error) {
        clog.error('fail to get subject_hash_old', errStack(error))
        return
      }
      if (!data) {
        return
      }
      data = data.trim()
      if (data.length === 8) {
        crt_path.dot = path.join(rootCApath, data + '.0')
        fs.copyFile(crtPath, crt_path.dot, err=>{
          if (err) {
            clog.error(`fail to generate ${data}.0 certificate`, errStack(err))
            crt_path.dot = ''
          } else {
            clog.info(`success generate ${data}.0 certificate`)
          }
        })
      }
    }
  })
}

function cacheClear() {
  try {
    fs.rmSync(path.join(os.tmpdir(), 'anyproxy/cache'), { recursive: true, force: true })
    return true
  } catch(e) {
    clog.error('fail to clear anyproxy temp cache', errStack(e))
    return false
  }
}

function crtInfo(){
  let crtPath = path.join(anycrtpath, 'rootCA.crt')
  if (!fs.existsSync(crtPath)) {
    return {
      rescode: -1,
      message: crtPath + ' not exist'
    }
  }
  let crt = fs.readFileSync(crtPath)
  let pubcrt = forge.pki.certificateFromPem(crt.toString())

  return {
    rescode: 0,
    commonName: pubcrt.subject.getField('CN').value,
    notBefore: now(pubcrt.validity.notBefore, false),
    notAfter: now(pubcrt.validity.notAfter, false)
  }
}

function getCert(hostname = '') {
  return new Promise((resolve, reject)=>{
    easyCert.getCertificate(hostname, (error, keyContent, crtContent) => {
      if (error) {
        reject(error);
        clog.error('fail to generate certificate for', hostname, 'reason:', error);
        return;
      }
      const crt_root = easyCert.getRootDirPath();
      resolve(crt_root);
      clog.info('success generate certificate for', hostname);
      clog.info(`copy ${hostname}.crt/${hostname}.key to`, anycrtpath);
      fs.copyFile(`${crt_root}/${hostname}.crt`, `${anycrtpath}/${hostname}.crt`, error=>{
        if (error) {
          clog.error(error)
        }
      });
      fs.copyFile(`${crt_root}/${hostname}.key`, `${anycrtpath}/${hostname}.key`, error=>{
        if (error) {
          clog.error(error)
        }
      });
    });
  })
}

async function crtHost(hostname = '') {
  let crt_root = ''
  try {
    crt_root = await getCert(hostname)
  } catch(error) {
    if (error === 'ROOT_CA_NOT_EXISTS') {
      await newRootCrt()
      crt_root = await getCert(hostname)
    } else {
      return Promise.reject(error)
    }
  }
  return crt_root
}

module.exports = { clearCrt, rootCrtSync, newRootCrt, cacheClear, crtInfo, crtHost, crt_path }