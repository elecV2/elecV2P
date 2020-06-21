const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const iconv = require('iconv-lite')
iconv.skipDecodeWarning = true

const { logger, errStack } = require('../utils')
const clog = new logger({ head: 'execfunc' })

const { wsSer } = require('./websocket')

const CONFIG_exec = {
  shellcwd: process.cwd()
}

wsSer.recv.shell = command => {
  if (/^cd /.test(command)) {
    let cwd = path.join(CONFIG_exec.shellcwd, command.replace('cd ', ''))
    if(fs.existsSync(cwd)) {
      CONFIG_exec.shellcwd = cwd
      wsSer.send({ type: 'cwd', data: CONFIG_exec.shellcwd })
    } else wsSer.send({ type: 'shelllogs', data: cwd + ' 不存在' })
  } else {
    execFunc(command, { cwd: CONFIG_exec.shellcwd, cb: data => wsSer.send({ type: 'shelllogs', data })})
  }
}

function execFunc(command, { cwd, env, timeout, cb }) {
  clog.info('开始执行 exec 命令', command)
  const option = {
    encoding: 'buffer',
    timeout: timeout || 60*1000
  }
  if (cwd) option.cwd = cwd
  if (env) option.env = env

  const childexec = exec(command, option)

  childexec.stdout.on('data', data => {
    data = iconv.decode(data, 'cp936')
    if (cb) cb(data)
    else clog.info(data)
  })

  childexec.stderr.on('data', data => {
    data = iconv.decode(data, 'cp936')
    clog.error(data)
    wsSer.send({ type: 'shelllogs', data })
  })

  childexec.on('exit', ()=>{
    clog.notify(command, 'finished')
  })
}

module.exports = execFunc