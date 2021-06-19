// 脚本功能: 重启 elecV2P (谨慎使用，无法取消。重启前请确认已保存好规则及任务列表)
// 脚本地址: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/reboot.js
// 更新时间: 2021-06-19

const config = {
  restart: true,       // 重启 elecV2P。默认 true，关闭: false
  reboot: false,       // 重启服务器。默认 false，开启: true
  notify: true,        // 重启时是否发送通知
}

autoFresh()

if (config.notify) {
  $feed.push('elecV2P 正在重启', `当前版本 ${__version}。稍后可前往主页查看是否成功`, /127|192|172|10|localhost/.test(__home) ? '' : __home)
}

if (config.restart) {
  restart()
} else {
  reboot()
}

function restart() {
  // 尝试以 PM2 的方式重启 elecV2P
  console.log('准备以 PM2 重启 elecV2P')
  $exec('pm2 restart elecV2P', {
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
  const countdown = 1              // 重启等待时间，单位：秒

  setTimeout(()=>{
    $exec('reboot', { cb: (data, error)=>error ? console.error(error) : console.log(data) })
  }, countdown*1000)

  console.log('操作系统将在', countdown, '秒后重启')
}

function autoFresh() {
  $evui({
    title: 'elecV2P 正在重启',
    width: 800,
    height: 200,
    content: `<p>重启中，elecV2P 将在 3 秒后尝试自动刷新前端页面</p><p>如长时间没有反应，请点击 <a href="/">手动刷新</a></p>`,
    style: {
      content: "font-size: 26px; text-align: center",
    },
    resizable: false,
    script: `console.log("将在 3 秒后自动刷新页面");setTimeout(()=>location.href = '/', 3000)`
  }).then(data=>console.log(data)).catch(e=>console.log(e))
}