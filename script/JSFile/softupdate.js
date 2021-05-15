// （先看完说明，再决定是否执行！操作不可恢复，谨慎使用。执行前，先根据自身需求修改下面 CONFIG 变量里的内容）
// 该脚本用于获取 https://github.com/elecV2/elecV2P 库的最新文件，并进行本地替换。（软更新升级）
// 使用前请确保当前 elecV2P 服务器可正常连接 raw.githubusercontent.com/或自定义 cdngit 站点
// 更新后会自动重启，以应用新的版本（请确定已保存任务列表及做好了储存映射数据备份等工作）
// 脚本会先尝试以 PM2 的方式重启，如果失败，将直接重启容器(Docker 模式下)或服务器(pm2 指令不可用的情况下)
// 3.1.8 版本后 elecV2P 默认启动方式更改为 PM2，建议在此版本后使用
// 
// 文件更新地址: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/softupdate.js
// 最近更新时间: 2021-05-15

let CONFIG = {
  store: 'softupdate_CONFIG',    // 将当前配置内容(CONFIG 值) 常量储存。留空: 表示使用下面的参数进行更新，否则将会读取 store 中的 softupdate_CONFIG 对应值进行更新。如果 softupdate_CONFIG 尚未设置(首次运行)，会先按下面参数执行，并储存当前 CONFIG 内容
  forceupdate: false,            // 强制更新。false: 检测到新版本时才更新。 true: 不检测版本直接更新
  notify: true,                  // 检测到新版本时是否进行通知。true: 通知, false: 不通知
  restart: 'elecV2P',            // false: 只更新文件，不重启不应用。 其他值表示 pm2 重启线程名，比如 all/elecV2P/index（暂时不清楚就保持不动）
  noupdate: [
    'script/Store',        // 设置一些不覆盖更新的文件夹（保留个人数据）。根据个人需求进行调整
    // 'script/JSFile',    // 如果不设置，也只会覆盖更新 elecV2P 自带的同名文件，对其他文件无影响
    // 'script/Shell',
    'script/Lists',
    'rootCA',
    'Docker',              // 当文件夹或名称中包含 Docker 时，跳过下载更新
    'Todo',                // 排除单个文件，使用文件名包含的关键字即可
    '^\\.',                // 也可以使用正则表示式。匹配方式为 new RegExp(str).test(fileurl)
  ],
  wbtoken: 'a8c259b2-67fe-4c64-8700-7bfdf1f55cb3',    // webhook token（在 SETTING 界面查看）用于发送保存当前任务列表的网络请求，可省略。
  cdngit: 'https://raw.githubusercontent.com',        // 可自定义 raw.githubusercontent.com 加速站点
  about: 'elecV2P 软更新配置文件，详情: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/softupdate.js'
}

if (CONFIG.cdngit.endsWith('/')) {
  CONFIG.cdngit = CONFIG.cdngit.slice(0, -1)
}

if (CONFIG.store) {
  let sConf = $store.get(CONFIG.store)
  if (sConf && typeof sConf === 'object') {
    Object.assign(CONFIG, sConf)
  } else {
    $store.put(CONFIG, CONFIG.store)
  }
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
    console.log('开始获取最新版本号...')
    let res = await $axios(CONFIG.cdngit + '/elecV2/elecV2P/master/package.json')
    let newversion = res.data.version
    if (newversion) {
      console.log('当前版本:', __version, '最新版本:', newversion)
    } else {
      console.log('获取最新版本号失败，可能是网络存在问题，elecV2P 服务器无法连接', CONFIG.cdngit)
      return false
    }
    if (__version !== newversion) {
      console.log('检测到有新的版本:', newversion)
      if (CONFIG.notify) {
        $feed.push('elecV2P 检测到新版本 ' + newversion, '当前版本 ' + __version +  '\n即将进行软更新升级', /127|192|172|10|localhost/.test(__home) ? '' : __home)
      }
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
        let btoUP = true
        for (let item of CONFIG.noupdate) {
          if (new RegExp(item).test(file.path)) {
            btoUP = false
            console.debug('根据 CONFIG.noupdate', item, '设置，跳过', file.path, '更新')
            break
          }
        }
        if (btoUP) {
          let durl = CONFIG.cdngit + '/elecV2/elecV2P/master/' + file.path
          console.log('获取更新:', durl)
          try {
            await $download(durl, { folder: './', name: file.path }, d=>{
                    if (d && d.progress) console.log(d.progress + '\r')
                  }).then(d=>console.log('同步文件:', d))
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
  $exec('pm2 restart ' + CONFIG.restart, {
    cb(data, error){
      if (error) {
        console.error(error)
        console.log('尝试使用 pm2 的方式重启失败，将直接重启服务器')
        $exec('reboot')
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
    content: `<p>软更新已完成，elecV2P 将在 3 秒后尝试自动刷新前端页面</p><p>如长时间没有反应，请点击 <a href="/">手动刷新</a></p>`,
    style: {
      content: "font-size: 26px; text-align: center",
    },
    resizable: false,
    script: `console.log("将在 3 秒后自动刷新页面");setTimeout(()=>location.href = '/', 3000)`
  }).then(data=>console.log(data)).catch(e=>console.log(e))
}