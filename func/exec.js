const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const { logger } = require('../utils')
const clog = new logger({ head: 'funcExec', level: 'debug' })

const { wsSer } = require('./websocket')

const CONFIG_exec = {
  shellcwd: process.cwd(),    // minishell cwd
  timeout:  60,               // exec 命令最大执行时间，单位：秒
}

/**
 * 跨平台命令简单转换（复杂命令可能会出错）
 * @param     {string}    command    exec 命令
 * @return    {string}               转换后命令
 */
function commandCross(command) {
  const isWin = /^win/.test(process.platform)
  if (isWin) {
    if (command === 'ls') command = 'dir'
    else if (/^cat/.test(command)) command = command.replace('cat', 'type')
    else if (command === 'reboot') command = 'powershell.exe restart-computer'
    else if (/^(rm|mv|cp|mkdir|rmdir)/.test(command)) command = 'powershell.exe ' + command
  } else {
    if (command === 'dir') command = 'ls'
    else if (/^type/.test(command)) command = command.replace('type', 'cat')
    else if (/Restart-Computer/i.test(command)) command = 'reboot'
  }
  return command
}

/**
 * minishell 执行函数，执行命令及结果通过 websocket 传输
 * @param     {string}    command    exec 命令
 * @return    {none}               
 */
wsSer.recv.shell = command => {
  if (/^cd /.test(command)) {
    let cwd = path.join(CONFIG_exec.shellcwd, command.replace('cd ', ''))
    if(fs.existsSync(cwd)) {
      CONFIG_exec.shellcwd = cwd
      wsSer.send({
        type: 'minishell',
        data: {
          type: 'cwd',
          data: CONFIG_exec.shellcwd
        }
      })
    } else {
      wsSer.send({ type: 'minishell', data: cwd + ' dont exist' })
    }
  } else {
    execFunc(command, {
      cwd: CONFIG_exec.shellcwd,
      cb: data => wsSer.send({ type: 'minishell', data })
    })
  }
}

/**
 * exec 执行函数
 * @param  {string}    command          具体指令
 * @param  {string}    options.cwd      当前工作目录
 * @param  {string}    options.env      env
 * @param  {number}    options.timeout  timeout，单位：秒
 * @param  {function}  options.cb       回调函数，接收参数为 stdout 的数据
 * @param  {boolean}   options.logout   是否输出执行日志
 * @return {none}                 
 */
function execFunc(command, { cwd, env, timeout = CONFIG_exec.timeout, cb, logout = true }) {
  command = commandCross(command)
  const option = {
    encoding: 'buffer',
    timeout: timeout * 1000,
  }
  if (cwd) option.cwd = cwd
  if (env) option.env = env

  const childexec = exec(command, option)

  if (logout) {
    clog.notify('start run command:', command)

    childexec.stdout.on('data', data => {
      clog.info(data.toString())
      if (cb) cb(data.toString())
    })

    childexec.stderr.on('data', data => {
      data = data.toString()
      clog.error(data)
      wsSer.send({ type: 'minishell', data })
    })

    childexec.on('exit', ()=>{
      clog.notify(command, 'finished')
    })
  }
}

// windows 平台编码转换
// if (/^win/.test(process.platform)) execFunc('CHCP 65001', { logout: false })

module.exports = execFunc