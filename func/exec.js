const os = require('os')
const { exec } = require('child_process')

const { logger, file, downloadfile, wsSer, surlName, kSize, errStack, sType } = require('../utils')
const clog = new logger({ head: 'funcExec', file: 'funcExec', level: 'debug' })

const CONFIG_exec = {
  shellcwd: process.cwd(),       // minishell cwd
  timeout:  60000,               // exec 命令最大执行时间，单位：毫秒
  maxfdata: 200,                 // 最终返回值，最大保存输出行数
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
      wsSer.send({ type: 'minishell', data: cdd + ' not exist' })
    }
  } else {
    execFunc(command, {
      cwd: CONFIG_exec.shellcwd,
      cb: data => wsSer.send({ type: 'minishell', data })
    })
  }
}

/**
 * 跨平台命令简单转换
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
    else if (/^apk add/.test(command)) command = command.replace('apk add', 'scoop install')
  } else {
    if (/^dir/.test(command)) command = command.replace('dir', 'ls')
    else if (/^type/.test(command)) command = command.replace('type', 'cat')
    else if (/Restart-Computer/i.test(command)) command = 'reboot'
  }
  return command
}

/**
 * command 参数处理 -cwd/-env/-stdin，可执行化命令
 * @param     {string}    command    exec 命令
 * @param     {object}    options    命令执行参数
 * @return    {object}               处理后命令及options
 */
async function commandSetup(command, options={}, clog) {
  // options.timeout 处理
  let timeout = command.match(/ -timeout(=| )(\d+)/)
  if (timeout && timeout[2]) {
    options.timeout = Number(timeout[2])
    command = command.replace(/ -timeout(=| )(\d+)/g, '')
  } else if (options.timeout === undefined) {
    options.timeout = CONFIG_exec.timeout
  }

  // options.cwd 处理
  let cwd = command.match(/ -cwd (\S+)/)
  if (cwd && cwd[1]) {
    options.cwd = cwd[1]
    command = command.replace(/ -cwd (\S+)/g, '')
  }
  if (!file.isExist(options.cwd, true)) {
    // 当没有设置 cwd，或设置 cwd 目录不存在时，自动设置默认 cwd
    if (/^node /.test(command)) {
      // 当使用 node 命令开头时，默认 cwd 设置为 script/JSFile
      options.cwd = 'script/JSFile'
    } else {
      // 其他情况，默认 cwd 为 script/Shell
      options.cwd = 'script/Shell'
    }
  }

  // options.stdin 处理
  let stdin = command.match(/ -stdin (\S+)/)
  if (stdin && stdin[1]) {
    options.stdin = Object.assign(options.stdin || {}, { write: decodeURI(stdin[1]) })
    command = command.replace(/ -stdin (\S+)/g, '')
  }

  // options.env 处理
  let envrough = command.match(/ -env ([^-]+)/)
  let tempenv  = {}
  if (envrough && envrough[1]) {
    envrough[1].trim().split(' ').forEach(ev=>{
      let ei = ev.indexOf('=')
      if (ei !== -1) {
        tempenv[ev.substring(0, ei)] = ev.substring(ei + 1).replace(/^('|"|`)|('|"|`)$/g, '')
      }
    })

    command = command.replace(/ -env ([^-]+)/g, '')
  }
  if (!options.env) {
    options.env = {}
  }
  // 优先级 process.env < options.env < tempenv, 不影响原 process.env
  options.env = { ...process.env, ...options.env, ...tempenv }

  // 基础 command 跨平台转换
  command = commandCross(command)

  // 远程指令 处理
  if (!options.nohttp && !/^(curl|wget|git|start|you-get|youtube-dl|aria2c|http|npm|yarn|ping|openssl|telnet|nc|echo) /.test(command)) {
    let remotesh = command.match(/ (https?:\/\/\S{4,})/)
    if (remotesh && remotesh[1]) {
      let shname = options.rename || surlName(remotesh[1])
      let shfile = file.path(options.cwd, shname)
      try {
        if ((/ -local/.test(command) || options.local) && shfile) {
          command = command.replace(' -local', '')
          clog.info('run shell file from locally', shfile)
        } else {
          clog.info('downloading remote shell file:', remotesh[1])
          shfile = await downloadfile(remotesh[1], { folder: options.cwd, name: shname })
          clog.info(`success download ${remotesh[1]}, ready to run`)
        }
      } catch(e) {
        clog.error(`run remote shell error: ${remotesh[1]} ${e}`)
        clog.info(`try to run locally`)
      }
      if (shfile) {
        command = command.replace(remotesh[1], shfile)
      }
      // else 本地文件不存在，且下载失败，则保留原远程链接，不作任何处理
    }
  }

  command = command.replace(' -http', ' http')

  if (options.windowsHide === undefined) {
    options.windowsHide = true
  }
  options.encoding = 'buffer'
  return { command, options }
}

/**
 * exec 执行函数
 * @param  {string}    command          具体指令
 * @param  {string}    options.cwd      当前工作目录
 * @param  {object}    options.env      env 环境变量
 * @param  {number}    options.timeout  timeout，单位：毫秒
 * @param  {function}  options.cb       回调函数，接收参数为 stdout 的数据
 * @param  {boolean}   options.call     command finish flag, 是否等命令执行完成后一次性返回所有输出
 * @param  {object}    options.stdin    延时交互数据自动输入
 * @param  {function}  cb               回调函数，优先级高于 options.cb
 * @return {none}                 
 */
async function execFunc(command, options={}, cb) {
  let execlog = clog
  if (options.from === 'task') {
    execlog = new logger({ head: 'taskExec', level: 'debug', file: options.logname, cb: wsSer.send.func('tasklog') })
  }

  let callback = (data, error, finish)=>{
    cb = cb || options.cb
    if (cb && sType(cb) === 'function') {
      cb(data, error, finish)
    }
  }
  let fev = await commandSetup(command, options, execlog).catch(e=>{
    let err = errStack(e)
    execlog.error(err)
    callback(null, err)
  })
  let childexec = exec(fev.command, fev.options)

  execlog.notify('start run command:', fev.command, 'cwd:', options.cwd)
  callback('start run command: ' + fev.command + ' cwd: ' + options.cwd + '\n')
  execlog.debug('start run command:', fev.command, 'with options:', fev.options)

  let fdata = []
  childexec.stdout.on('data', data => {
    data = data.toString()
    execlog.info(data)
    callback(data)
    if (options.call) {
      if (fdata.length > CONFIG_exec.maxfdata) {
        fdata.splice(0, fdata.length/2)
      }
      fdata.push(data)
    }
  })

  childexec.stderr.on('data', err => {
    err = err.toString()
    execlog.error(err)
    callback(null, err)
    wsSer.send({ type: 'minishell', data: err })
  })

  childexec.on('exit', (code, signal) => {
    let fstr = command + ' finished'
    if (options.timeout && signal === 'SIGTERM') {
      fstr += `(may run timeout of ${options.timeout}ms)`
    }
    execlog.info(fstr)
    callback(options.call ? fdata.join('') : fstr, null, true)
  })

  if (options.stdin && options.stdin.write !== undefined) {
    if (options.stdin.delay === undefined) {
      options.stdin.delay = 2000
    }

    let hint = 'input ' + options.stdin.write + ' after ' + options.stdin.delay + ' milliseconds'
    execlog.info(hint)
    callback(hint)
    setTimeout(()=>{
      childexec.stdin.write(options.stdin.write)
      childexec.stdin.end()
    }, options.stdin.delay)
  }
}

function sysInfo() {
  let tmem = os.totalmem()
  return {
    arch: os.arch(),
    platform: os.platform(),
    memory: kSize(tmem - os.freemem()) + '/' + kSize(tmem),
    uptime: (os.uptime()/60/60/24).toFixed(2) + ' Days',
    nodever: process.version
  }
}

module.exports = { exec: execFunc, sysInfo }