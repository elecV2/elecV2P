const os = require('os')
const { exec } = require('child_process')
const { logger, file, downloadfile, wsSer, surlName, kSize, errStack, sType, feedPush } = require('../utils')
const clog = new logger({ head: 'funcExec', file: 'funcExec', level: 'debug' })

const { CONFIG_Port } = require('../config')

const CONFIG_exec = {
  shellcwd: process.cwd(),       // minishell cwd
  timeout:  60000,               // exec 命令最大执行时间，单位：毫秒
  maxfdata: 200,                 // 最终返回值，最大保存输出行数
}

const subprocess = new Map()     // sub process/子进程 列表

/**
 * minishell 执行函数，执行命令及结果通过 websocket 传输
 * @param     {object}    command    exec 命令
 * @return    {none}
 */
wsSer.recv.shell = command => {
  if (!command?.data) {
    // 兼容 v3.5.9 之前版本
    command = {
      data: command
    }
  }
  command.data = decodeURI(command.data)
  if (command.type === 'sub') {
    if (subprocess.has(command.id)) {
      const subp = subprocess.get(command.id)
      clog.debug(subp.command, '%', command.data)
      switch(command.data) {
      case 'quit':
      case 'exit':
        subp.childexec?.stdin.end()
        subp.childexec?.stdout.destroy()
        subp.childexec?.stderr.destroy()
        subp.childexec?.kill('SIGINT')
        break
      default:
        subp.childexec?.stdin.write(command.data + '\n')
      }
    } else {
      wsSer.send({ type: 'minishell', data: 'subprocess ' + command.id + ' not exist' })
      clog.debug('no sub process to deal with', command)
    }
    return
  }
  if (command.data === 'init') {
    let initsubp = Object.create(null)
    subprocess.forEach((sub, id)=>{
      initsubp[id] = {
        command: sub.command
      }
    })
    wsSer.send({
      type: 'shellinit',
      data: {
        cwd: CONFIG_exec.shellcwd,
        subprocess: initsubp
      }
    })
    return
  }
  if (command.data === 'cwd') {
    wsSer.send({
      type: 'cwd',
      data: CONFIG_exec.shellcwd
    })
    return
  }
  if (/^cd /.test(command.data)) {
    let cdd = command.data.replace('cd ', '')
    let cwd = file.path(CONFIG_exec.shellcwd, cdd)
    if(cwd) {
      CONFIG_exec.shellcwd = cwd
      wsSer.send({
        type: 'cwd',
        data: CONFIG_exec.shellcwd
      })
    } else {
      wsSer.send({ type: 'minishell', data: cdd + ' not exist' })
    }
  } else if (/^run /.test(command.data)) {
    runRaw(command.data)
  } else {
    execFunc(command.data, {
      id: command.id,
      from: 'minishell',
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
  if (/^win/.test(process.platform)) {
    if (/^ls|^find /.test(command)) command = command.replace('ls', 'dir')
    else if (/^cat /.test(command)) command = command.replace('cat', 'type')
    else if (command === 'reboot') command = 'powershell.exe restart-computer'
    else if (/^(rm|mv|cp|mkdir|rmdir)/.test(command)) command = 'powershell.exe ' + command
    else if (/^apk add/.test(command)) command = command.replace('apk add', 'scoop install')
    else if (/^traceroute /.test(command)) command = command.replace('traceroute', 'tracert')
    else if (/^nc /.test(command)) command = command.replace('nc', 'telnet')
  } else {
    if (/^dir/.test(command)) command = command.replace('dir', 'ls')
    else if (/^type/.test(command)) command = command.replace('type', 'cat')
    else if (/^Restart-Computer/i.test(command)) command = 'reboot'
    else if (/^tracert /.test(command)) command = command.replace('tracert', 'traceroute')
    else if (/^telnet /.test(command)) command = command.replace('telnet', 'nc')
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
  let cwd = command.match(/ -cwd(=| )(\S+)/)
  if (cwd && cwd[2]) {
    options.cwd = cwd[2]
    command = command.replace(/ -cwd(=| )(\S+)/g, '')
  }
  if (!(options.cwd && file.isExist(options.cwd, true))) {
    // 当没有设置 cwd，或设置 cwd 目录不存在时，自动设置默认 cwd
    if (/^node /.test(command)) {
      // 当使用 node 命令开头时，默认 cwd 设置为 script/JSFile
      options.cwd = CONFIG_Port.path_script
    } else {
      // 其他情况，默认 cwd 为 script/Shell
      options.cwd = CONFIG_Port.path_shell
    }
  }

  // options.stdin 处理
  let stdin = command.match(/ -stdin(=| )(\S+)/)
  if (stdin && stdin[2]) {
    if (sType(options.stdin) !== 'object') {
      options.stdin = {}
    }
    options.stdin.write = decodeURI(stdin[2])
    command = command.replace(/ -stdin(=| )(\S+)/g, '')
  }

  // options.env 处理
  let envrough = command.match(/ -env(=| )([^-]+)/)
  let tempenv  = {}
  if (envrough && envrough[2]) {
    envrough[2].trim().split(' ').forEach(ev=>{
      let ei = ev.indexOf('=')
      if (ei !== -1) {
        tempenv[ev.substring(0, ei)] = ev.substring(ei + 1).replace(/^('|"|`)|('|"|`)$/g, '')
      }
    })

    command = command.replace(/ -env(=| )([^-]+)/g, '')
  }
  if (sType(options.env) !== 'object') {
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
async function execFunc(command, options={}, cb=null) {
  let execlog = clog
  if (sType(options.logname) === 'string') {
    execlog = new logger({
      head: options.logname.replace(/\.task$/, ''),
      level: 'debug',
      file: options.logname,
      cb: options.from === 'task' ? wsSer.send.func('tasklog') : null
    })
  }

  cb = cb || options.cb
  delete options.cb
  let callback = ()=>{}
  if (cb && sType(cb) === 'function') {
    callback = cb
  }
  let fev = await commandSetup(command, options, execlog).catch(e=>{
    let err = errStack(e)
    execlog.error(err)
    callback(null, err)
  })
  let childexec = exec(fev.command, fev.options)
  if (!options.id) {
    options.id = `${options.from || 'exec'}_${Date.now()}`
  }
  subprocess.set(options.id, {
    command: fev.command,
    childexec
  })
  wsSer.send({
    type: 'subprocessadd',
    data: {
      id: options.id,
      command: fev.command,
    }
  })

  execlog.notify('start run command:', fev.command, 'cwd:', fev.options.cwd)
  callback('start run command: ' + fev.command + ' cwd: ' + fev.options.cwd + '\n')
  execlog.debug('start run command:', fev.command, 'with options:', { ...fev.options, env: '...process.env' })

  let fdata = []
  childexec.stdout.on('data', data => {
    data = data.toString().trim()
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
    err = err.toString().trim()
    execlog.error(err)
    callback(null, err)
    wsSer.send({ type: 'minishell', data: err })
  })

  childexec.on('exit', (code, signal) => {
    let fstr = 'command: ' + command
    if (options.timeout && signal === 'SIGTERM') {
      fstr += ` may run timeout of ${options.timeout}ms`
    } else if (signal === 'SIGINT') {
      fstr += ' exited'
    } else {
      fstr += ' finished'
    }
    execlog.info(fstr)
    callback(options.call ? fdata.join('') : fstr, null, true)
    if (subprocess.has(options.id)) {
      subprocess.delete(options.id)
      wsSer.send({
        type: 'subprocessexit',
        data: options.id,
      })
    }
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

const { runJSFile } = require('../script/runJSFile')

function runRaw(command = '') {
  if (!command) {
    clog.error('function runRaw expect a command string')
    return
  }
  command = command.replace(/^run +/, '')
  const args = command.split(/ +/)
  let idxs = [args.indexOf('-eid'), args.indexOf('-en'), args.indexOf('-et')],
      id = '', name = '', type = /\.(js|efh)$/i.test(args[0]) ? 'script' : 'exec'
  if (idxs[0] !== -1) {
    id = args[idxs[0] + 1]
    args.splice(idxs[0], 2, '', '')
  }
  if (idxs[1] !== -1) {
    name = args[idxs[1] + 1]
    args.splice(idxs[1], 2, '', '')
  }
  if (idxs[2] !== -1) {
    type = args[idxs[2] + 1]
    args.splice(idxs[2], 2, '', '')
  }
  return run({
    id, name, type,
    args: args.filter(a=>a),
  })
}

// 待完成
// - log 显示问题
// - id/name 作用
// - type task/download 等
function run({ id = '', name = '', type = 'script', args = [] }) {
  switch(type) {
  case 'exec':
  case 'shell':
    execFunc(args.join(' '), {
      from: 'funcRun',
      cb: wsSer.send.func('minishell'),
    })
    break;
  case 'notify':
    feedPush(args[0], args[1], args[2])
    break
  case 'script':
  default:
    runJSFile(args.join(' '), {
      from: 'funcRun',
      cb: wsSer.send.func('minishell'),
    })
  }
}