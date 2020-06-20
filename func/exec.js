const exec = require('child_process').exec
const iconv = require('iconv-lite')
iconv.skipDecodeWarning = true

const { logger, errStack } = require('../utils')
const clog = new logger({ head: 'execfunc' })

function execFunc(command, { cwd, env, timeout, cb }) {
  clog.info('开始执行 exec 命令', command)
  const childexec = exec(command, {
    encoding: 'buffer',
    timeout: timeout || 60*1000
  })

  childexec.stdout.on('data', data=>{
    data = iconv.decode(data, 'cp936')
    if (cb) cb(data)
    else clog.info(data)
  })

  childexec.stderr.on('data', data=>{
    clog.error(data.toString())
  })

  childexec.on('exit', data=>{
    clog.notify(command, 'finished', data.toString)
  })
}

module.exports = execFunc