// 清空 elecV2P 所有日志文件，删除部分缓存及释放一些内存
// 定时任务: 59 23 * * * https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/deletelog.js
// 最近更新: 2021-09-13

const CONFIG = {
  clearlogfile: true,              // 是否清空 logs 目录下的所有日志文件
  clearanyproxycache: true,        // 是否删除由 ANYPROXY 代理产生的缓存文件
  flushpm2logs: true,              // 是否清空由 pm2 运行产生的日志文件
  doneunfinish: false,             // 强制 resolve 尚未结束的脚本（测试，更多说明看下面相关函数中的注释
}

if (CONFIG.clearlogfile !== false) {
  $exec('rm -f *.log', {
    // 如果是在 windows powershell 下使用 nodejs 的方式运行，使用 rm *.log 命令替换，即 $exec('rm *.log', {...})
    cwd: './logs',        // 日志文件所在文件夹（重要
    cb(data, error, finish){
      error ? console.error(error) : console.log(data)
      if (finish) {
        console.log('日志已删除')
        $done('日志已删除')
      }
    }
  })
}
if (CONFIG.clearanyproxycache) {
  cacheClear()
}
if (CONFIG.flushpm2logs) {
  $exec('pm2 flush')
}
if (CONFIG.doneunfinish) {
  doneunfinish()
}

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

function doneunfinish() {
  // resolve 还在运行中但并没有 $done 的脚本
  // 实验测试阶段，有效性待验证
  // 并不结束脚本，只是强制让脚本 resolve/$done
  // 当没有结束的脚本较多时，可释放出部分占用的内存
  let vmnames = $vmEvent.eventNames()
  console.log('当前未结束的脚本约', vmnames.length - 1, '个')
  vmnames.forEach(em=>{
    if (em !== 'error') {
      console.log('$done', em, '该脚本开始时间', new Date(Number(em.split('-').pop())).toLocaleString('zh', { hour12: false }))
      $vmEvent.emit(em)  // 注释这一行，可只查看而不强制 resolve
    }
  })
}