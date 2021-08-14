// 具体使用
moduleCheck(['anyproxy', 'got', 'tough-cookie'])

/**
 * 检测 node_modules 某个模块是否已安装
 * @param     {array/string}     name       待检测的模块
 * @param     {Boolean}    install          如果不存在，是否直接使用 yarn add 命令进行安装
 * @return    {Boolean}    true: 所有模块已安装，false: 有未安装(或安装失败)的模块
 * Author: https://t.me/elecV2
 * 脚本地址: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/moduleCheck.js
 * 最近更新: 2021-06-24
 */
async function moduleCheck(name, install = true) {
  const fs = require('fs')
  const path = require('path')

  if (Array.isArray(name)) {
    name = name.filter(n=>{
      let mfolder = path.join('node_modules', n)
      if (fs.existsSync(mfolder)) {
        console.log('module', n, 'installed')
        return false
      }
      return true
    })
  } else if (typeof(name) === 'string') {
    let mfolder = path.join('node_modules', name)
    if (fs.existsSync(mfolder)) {
      console.log('module', name, 'installed')
      name = []
    } else {
      name = [name]
    }
  } else {
    console.log('unknow module name type', name)
    return false
  }
  if (name.length === 0) {
    console.log('all check modules are installed')
    return true
  }
  name = name.join(' ')
  console.log('module', name, 'not installed yet')
  if (install) {
    try {
      await execP('yarn add ' + name)
      return true
    } catch(e) {
      console.error(e)
      return false
    }
  }
  return false
}

function execP(command) {
  console.log('start run command', command)
  return new Promise((resolve, reject)=>{
    $exec(command, {
      timeout: 0, cwd: './',
      cb(data, error, finish){
        if (finish) {
          console.log(command, 'finished')
          resolve()
        }
        error ? reject(error) : console.log(data)
      }
    })
  })
}