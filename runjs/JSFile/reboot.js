// 系统重启脚本，谨慎使用，无法取消

const countdown = 30              // 重启等待时间，单位：秒
console.log('操作系统将在', countdown, '后重启')

setTimeout(()=>{
  $exec('reboot', data=>console.log(data))
}, countdown*1000)