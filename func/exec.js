const exec = require('child_process').exec
const iconv = require('iconv-lite')
iconv.skipDecodeWarning = true

const { logger, errStack } = require('../utils')
const clog = new logger({ head: 'execfunc' })

module.exports = (command, cb) => {
  clog.info('exec 命令', command, '执行中')
  exec(command, { encoding: 'buffer' }, function(error, stdout, stderr) {
    if (stderr && stderr.toString().length > 1) {
      stderr = stderr.toString()
      clog.error(stderr)
    } else {
      stderr = null
    }
    if (error) {
      error = errStack(error)
      clog.error(error)
    }
    if (stdout) {
      stdout = iconv.decode(stdout, 'cp936')
      clog.info(stdout)
    }
    if (cb) cb(error, stdout, stderr)
  })
}