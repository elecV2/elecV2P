const { exec } = require('child_process')

const { logger, file, wsSer } = require('../utils')
const clog = new logger({ head: 'funcExec', file: 'funcExec' })

const CONFIG_exec = {
  shellcwd: process.cwd(),       // minishell cwd
  timeout:  60000,               // exec 命令最大执行时间，单位：毫秒
}

/**
 * 跨平台命令简单转换（复杂命令可能会出错）
 * @param     {string}    command    exec 命令
 * @return    {string}               转换后命令
 */
function commandCross(command) {
  const isWin = /^win/.test(process.platform)
  if (isWin) {
    if (/^ls|^find /.test(command)) command = command.replace('ls', 'dir')
    else if (/^cat /.test(command)) command = command.replace('cat', 'type')
    else if (command === 'reboot') command = 'powershell.exe restart-computer'
    else if (/^(rm|mv|cp|mkdir|rmdir)/.test(command)) command = 'powershell.exe ' + command
  } else {
    if (/^dir/.test(command)) command = command.replace('dir', 'ls')
    else if (/^type/.test(command)) command = command.replace('type', 'cat')
    else if (/Restart-Computer/i.test(command)) command = 'reboot'
  }
  return command
}

/**
 * command 参数处理 -c/-e，可执行化命令
 * @param     {string}    command    exec 命令
 * @param     {object}    options    命令执行环境
 * @return    {string}               处理后命令
 */
function commandSetup(command, options={}) {
  let cwd = command.match(/-c (\S+)/)
  if (cwd) {
    options.cwd = file.path(process.cwd(), cwd[1])
  }

  let envrough = command.replace(/ -c (\S+)/g, '').match(/-e ([^-]+)/)
  if (envrough) {
    let envlist = envrough[1].trim().split(' ')
    options.env = { ...options.env, ...envlist }

    envlist.forEach(ev=>{
      let ei = ev.split('=')
      if (ei.length === 2) {
        options.env[ei[0].trim()] = ei[1].trim()
      }
    })
  }
  command = commandCross(command.split(/ -(c|e) /)[0])

  if (options.timeout === undefined) {
    options.timeout = CONFIG_exec.timeout
  }
  options.encoding = 'buffer'
  return { command, options }
}

/**
 * minishell 执行函数，执行命令及结果通过 websocket 传输
 * @param     {string}    command    exec 命令
 * @return    {none}               
 */
wsSer.recv.shell = command => {
  if (command === 'cwd') {
    wsSer.send({
      type: 'minishell',
      data: {
        type: 'cwd',
        data: CONFIG_exec.shellcwd
      }
    })
    return
  }
  command = decodeURI(command)
  if (/^cd /.test(command)) {
    let cdd = command.replace('cd ', '')
    let cwd = file.path(CONFIG_exec.shellcwd, cdd)
    if(cwd) {
      CONFIG_exec.shellcwd = cwd
      wsSer.send({
        type: 'minishell',
        data: {
          type: 'cwd',
          data: CONFIG_exec.shellcwd
        }
      })
    } else {
      wsSer.send({ type: 'minishell', data: cdd + ' don\'t exist' })
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
 * @param  {string}    options.env      env 环境变量
 * @param  {number}    options.timeout  timeout，单位：毫秒
 * @param  {function}  options.cb       回调函数，接收参数为 stdout 的数据
 * @param  {boolean}   options.call     command finish flag, 是否等命令执行完成后一次性返回所有输出
 * @return {none}                 
 */
function execFunc(command, options, cb) {
  const fev = commandSetup(command, options)
  const childexec = exec(fev.command, fev.options)

  clog.notify('start run command:', command)

  cb = cb || options.cb
  const fdata = []
  childexec.stdout.on('data', data => {
    data = data.toString()
    clog.info(data)
    if (cb) cb(data)
    if (options.call) fdata.push(data)
  })

  childexec.stderr.on('data', err => {
    err = err.toString()
    clog.error(err)
    if (cb) cb(null, err)
    wsSer.send({ type: 'minishell', data: err })
  })

  childexec.on('exit', ()=>{
    clog.notify(command, 'finished')
    if (cb && options.call) cb(fdata.join('\n'), null, true)
  })
}

module.exports = { exec: execFunc }