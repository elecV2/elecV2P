// 系统重启脚本，谨慎使用，无法取消

const config = {
  restart: false,       // 重启 elecV2P。默认 false，开启： true
  reboot: true          // 重启服务器。默认 true，关闭：false
}

config.restart ? restart() : reboot()

function restart() {
  // 尝试以 PM2 的方式重启 elecV2P
  console.log('准备以 PM2 重启 elecV2P')
  $exec('pm2 restart all', {
    cb(data, error){
      if (error) {
        console.log('重启 elecV2P 失败')
        console.error(error)
      } else {
        console.log(data)
      }
    }
  })
}

function reboot(){
  // 重启服务器
  const countdown = 10              // 重启等待时间，单位：秒

  setTimeout(()=>{
    $exec('reboot', { cb: (data, error)=>error ? console.error(error) : console.log(data) })
  }, countdown*1000)

  console.log('操作系统将在', countdown, '秒后重启')
}