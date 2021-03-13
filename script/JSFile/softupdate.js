// （先看完说明，再决定是否执行！操作不可恢复，谨慎使用。执行前，先根据自身需求修改下面 CONFIG 变量里的内容。）
// 该脚本用于获取 https://github.com/elecV2/elecV2P 库的最新文件，并进行本地替换。（软更新升级）
// 更新后会自动重启，以应用新的版本（请确定已保存任务列表及做好了储存映射数据备份等工作）
// 脚本会先尝试以 PM2 的方式重启，如果失败，将直接重启容器(Docekr 模式下)或服务器(pm2 指令不可用的情况下)。
// 3.1.8 版本后 elecV2P 默认启动方式更改为 PM2，建议在此版本后使用。
// 
// 该文件更新地址：https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/softupdate.js

const CONFIG = {
  forceupdate: false,      // false: 检测到有新的版本时才更新。 true: 不检测版本直接更新
  restart: true,           // false: 只更新文件，不重启不应用。 true: 更新完成后自动重启并应用
  noupdate: [
    // 'script/JSFile',    // 设置一些不覆盖更新的文件夹（保留个人数据）。根据个人需求进行调整
    'script/Lists',        // 如果不设置，也只会覆盖更新 elecV2P 自带的同名文件，对其他文件无影响
    'script/Store',
    'script/Shell',
    'Todo',                // 排除单个文件，使用文件名包含的关键字即可
  ],
  wbtoken: 'a8c259b2-67fe-4c64-8700-7bfdf1f55cb3',    // webhook token（在 SETTING 界面查看）用于发送保存当前任务列表的网络请求，可省略。
  cdngit: 'https://raw.githubusercontent.com',        // 可自定义 raw.githubusercontent.com 加速站点
}

if (CONFIG.forceupdate) {
  update()
} else {
  checkUpdate().then(bres=>{
    bres && update()
  })
}

async function checkUpdate(){
  if (typeof(__version) === 'undefined') {
    return true
  }
  try {
    console.log('开始获取最新版本号。。。')
    let res = await $axios(CONFIG.cdngit + '/elecV2/elecV2P/master/package.json')
    let newversion = res.data.version
    console.log('当前版本:', __version, '最新版本:', newversion)
    if (__version !== newversion) {
      console.log('检测到有新的版本:', newversion)
      return true
    }
    console.log('没有检测到新的版本。如果需要强制更新，请将脚本 forceupdate 参数对应值修改为 true')
    return false
  } catch(e) {
    console.error('检查更新失败', e.message)
    return false
  }
}

function taskSave() {
  if (CONFIG.wbtoken) {
    console.log('向 webhook 端口发送保存当前任务列表的指令')
    $axios({
      url: '/webhook',
      method: 'post',
      data: {
        token: CONFIG.wbtoken,
        type: 'tasksave',
      }
    }, false).then(res=>console.log(res.data)).catch(e=>console.log(e))
  } else {
    console.log('没有设置 webhook token, 跳过发送任务保存的网络请求')
  }
}

function update() {
  taskSave()
  console.log('开始获取更新文件列表')
  $axios('https://api.github.com/repos/elecv2/elecv2p/git/trees/master?recursive=1').then(async res=>{
    let data = res.data
    let tree = data.tree

    for (let file of tree) {
      if (file.type === 'blob') {
        if (CONFIG.noupdate.filter(item=>file.path.match(item)).length === 0) {
          let durl = CONFIG.cdngit + '/elecV2/elecV2P/master/' + file.path
          console.log('获取更新:', durl)
          try {
            await $download(durl, { folder: './', name: file.path }).then(d=>console.log('同步文件:', d))
          } catch(e) {
            console.error(e.message || e)
            console.error('更新出错，请检查网络后重试。')
            return
          }
        }
      }
    }

    console.log('文件更新完成')
    if (CONFIG.restart) {
      console.log('开始重启以应用更新。稍等一下刷新前端网页，查看是否生效')
      autoFresh()
      restart()
    } else {
      console.log('此次软更新设置为不重启，所以该更新并没有应用。如需应用，请手动重启一下 elecV2P')
    }
  }).catch(e=>console.error('elecV2P 软更新失败', e.message || e))
}

function restart() {
  $exec('pm2 restart index', {
    cb(data, error){
      if (error) {
        console.error(error)
        if (/not found/.test(error)) {
          $exec('pm2 restart elecV2P', {
            cb(data, error){
              console.log(error || data)
            }
          })
        } else {
          console.log('尝试使用 pm2 的方式重启失败，将直接重启服务器')
          $exec('reboot')
        }
      } else {
        console.log(data)
      }
    }
  })
}

function autoFresh() {
  $evui({
    title: '软更新完成',
    width: 800,
    height: 200,
    content: `<p>软更新已完成，elecV2P 将在 3 秒后尝试自动刷新前端页面（v3.2.4 后）</p><p>如长时间没有反应，请点击 <a href="/">手动刷新</a></p>`,
    style: {
      content: "font-size: 26px; text-align: center",
    },
    resizable: false,
    script: `console.log("将在 3 秒后自动刷新页面");setTimeout(()=>location.href = '/', 3000)`
  }).then(data=>console.log(data)).catch(e=>console.log(e))
}