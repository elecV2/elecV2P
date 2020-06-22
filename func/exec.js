const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const { logger, errStack } = require('../utils')
const clog = new logger({ head: 'execfunc' })

const { wsSer } = require('./websocket')

const CONFIG_exec = {
  shellcwd: process.cwd()
}

function commandCross(command) {
  // 跨平台命令简单转换
  const isWin = /^win/.test(process.platform)
  switch (command) {
  case 'ls':
    isWin ? command = 'dir' : ''
    break
  case 'dir':
    isWin ? '' : command = 'ls'
    break
  case 'type':
    isWin ? '' : command = 'cat'
    break
  case 'cat':
    isWin ? command = 'type' : ''
    break
  default:
  }
  return command
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
  command = commandCross(command)
  clog.info('开始执行 exec 命令', command)
  const option = {
    encoding: 'buffer',
    timeout: timeout || 60*1000
  }
  if (cwd) option.cwd = cwd
  if (env) option.env = env

  const childexec = exec(command, option)

  childexec.stdout.on('data', data => {
    if (cb) cb(data.toString())
    else clog.info(data.toString())
  })

  childexec.stderr.on('data', data => {
    data = data.toString()
    clog.error(data)
    wsSer.send({ type: 'shelllogs', data })
  })

  childexec.on('exit', ()=>{
    clog.notify(command, 'finished')
  })
}

module.exports = execFunc