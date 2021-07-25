// 使用 Shell 指令删除所有日志文件
// 定时任务: 59 23 * * * https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/deletelog.js

const CONFIG = {
  clearanyproxycache: true,        // 是否清空由 ANYPROXY 代理产生的缓存文件
  flushpm2logs: true,              // 是否清空由 pm2 运行产生的日志文件
}

if (CONFIG.clearanyproxycache) {
  cacheClear()
}
if (CONFIG.flushpm2logs) {
  $exec('pm2 flush')
}

$exec('rm -f *.log', {
  // 如果是在 windows powershell 下使用 nodejs 的方式运行，使用 rm *.log 命令替换，即 $exec('rm *.log', {...})
  cwd: './logs',        // 日志文件所在文件夹（重要
  call: true,
  cb(data, error, finish){
    error ? console.error(error) : console.log(data)
    if (finish) {
      console.log('日志已删除')
      $done('日志已删除')
    }
  }
})

function cacheClear() {
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  try {
    console.log('准备清空 ANYPROXY temp cache 文件夹')
    fs.rmSync(path.join(os.tmpdir(), 'anyproxy/cache'), { recursive: true, force: true })
    console.log('ANYPROXY temp cache 清理完成')
    return true
  } catch(e) {
    console.error('清空失败 fail to clear anyproxy temp cache')
    return false
  }
}