// elecV2P 软更新脚本。执行前，请先根据自身需求修改下面 CONFIG 变量中的内容
// 该脚本会自动获取 https://github.com/elecV2/elecV2P 库中的文件，然后进行本地替换
// 更新后会自动重启，以应用新的版本（请确定已保存好任务列表及其他个人数据）
// 脚本会先尝试以 PM2 的方式重启，如果失败，将直接重启容器(Docker 模式下)或服务器(pm2 指令不可用的情况下)
// 
// 文件地址: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/softupdate.js
// 最近更新: 2022-11-15
//
// Todo:
// - efh 前端设置界面
// - 部分文件夹选择更新
// @grant sudo

let CONFIG = {
  store: 'softupdate_CONFIG',    // 将当前设置(CONFIG 值)常量储存。留空: 表示使用下面的参数进行更新，否则将会读取 store/cookie 常量中的 softupdate_CONFIG 对应值进行更新。首次运行时，会先按照下面的参数执行并储存
  updae_type: 'zip',             // 使用 zip 压缩包更新，默认。可选项: file - 单文件下载更新（旧
  tags: '',                      // 版本号，留空表示更新到最新。可选: 3.6.0/3.5.6 等，全部选项查看 https://github.com/elecV2/elecV2P/tags
  forceupdate: false,            // 强制更新。false: 检测到新版本时才更新。 true: 强制更新
  notify: true,                  // 更新时是否发送通知。true: 通知, false: 不通知
  restart: 'elecV2P',            // false: 只更新文件，不重启不应用。 其他值表示 pm2 重启线程名，比如 all/elecV2P/0
  noupdate: [
    'script/Store',        // 设置一些不覆盖更新的文件夹（保留个人数据）。根据个人需求进行调整
    // 'script/JSFile',    // 如果不设置，也只会覆盖更新 elecV2P 自带的同名文件，对其他文件无影响
    // 'script/Shell',
    'script/Lists',
    'rootCA',
    'Docker',              // 当文件/文件夹名称中包含 Docker 关键字时，跳过下载更新
    'Todo',                // 匹配方式为 new RegExp(str关键字).test(path/file)
    '^\\.',                // 也可以使用正则表达式的字符串形式
  ],
  cdngit: 'https://raw.githubusercontent.com',        // 可自定义 raw.githubusercontent.com 加速站点
  dependencies_update: true,      // 检测默认依赖(dependencies)是否有更新。仅当为 false 时，表示不检测
  about: 'elecV2P 软更新配置文件，详情: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/softupdate.js'
}

/*************** 主函数部分 ******************/
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

checkUpdate().then(bres=>{
  bres && update()
})
/************** end 主函数部分 *************/

async function checkUpdate(){
  if (typeof(__version) === 'undefined') {
    return true
  }
  try {
    console.log('elecV2P 当前版本:', __version, '开始获取新版本号...')
    let res = CONFIG.tags ? { data: { version: CONFIG.tags } } : await $axios('https://ver.elecv2.workers.dev/')
    let newversion = res.data.version
    if ((newversion && __version !== newversion) || CONFIG.forceupdate) {
      console.log('检测到版本:', newversion, `即将进行${ CONFIG.forceupdate ? '强制' : '' }更新`)
      if (CONFIG.notify) {
        $feed.push(
          '正在将 elecV2P 更新到 ' + newversion,
          `当前版本 ${__version}\n${ res.data.changelog ? '更新内容：\n' + res.data.changelog : '' }\n历史更新日志: https://github.com/elecV2/elecV2P/blob/master/logs/update.log`,
          /127|192|172|10|localhost/.test(__home) ? '' : __home
        )
      }
      if (CONFIG.dependencies_update !== false) {
        CONFIG.dependencies_update = dependenciesCheck(res.data.dependencies)
      }
      CONFIG.newversion = newversion
      return true
    }
    console.log('没有检测到新的版本。如果需要强制更新，请将脚本 forceupdate 参数对应值修改为 true')
    return false
  } catch(e) {
    console.error('获取 elecV2P 最新版本号失败，可能是网络存在问题，请重试', e.message || e)
    return false
  }
}

function taskSave() {
  if (typeof $webhook !== 'undefined') {
    console.log('向 webhook 端口发送保存当前任务列表的指令')
    $webhook('tasksave')
    .then(res=>console.log(res.data))
    .catch(e=>{
      console.log('当前任务列表保存失败', e.message, '(并不影响此次软更新升级)')
    })
  } else if (CONFIG.wbtoken) {
    console.log('$webhook 函数暂不可用, 尝试直接发送保存任务的网络请求')
    $axios({
      url: '/webhook',
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        token: CONFIG.wbtoken,
        type: 'tasksave',
      }
    }, false).then(res=>console.log(res.data)).catch(e=>{
      console.log('当前任务列表保存失败', e.message, '(并不影响此次软更新升级)')
    })
  } else {
    console.log('没有设置 webhook token, 跳过发送任务保存的网络请求')
  }
}

async function update() {
  taskSave()
  if (CONFIG.updae_type !== 'file' && typeof(__vernum) !== 'undefined' && __vernum > 350) {
    try {
      let verzip = 'master.zip'
      if (CONFIG.tags) {
        console.log('开始检测版本号', CONFIG.tags, '是否存在')
        let e_tags = await $axios('https://api.github.com/repos/elecV2/elecV2P/tags').then(res=>res.data)
        if (!e_tags.find(x=>x.name===CONFIG.tags)) {
          console.log(CONFIG.tags, '并不存在，全部可用版本号请查看：https://api.github.com/repos/elecV2/elecV2P/tags')
          return
        }
        verzip = `refs/tags/${CONFIG.tags}.zip`
      }
      console.log('开始下载更新所需要的 ZIP 文件...')
      let zipd = await $download('https://github.com/elecV2/elecV2P/archive/' + verzip, {
        folder: './efss',
        name: `elecV2P_${CONFIG.newversion}.zip`,
        // existskip: true,        // 如果 ZIP 文件存在则不下载
      }, d=>{
        if (d && d.progress && !(d.chunk%10)) console.log(d.progress + '\r')
      })
      unzip(zipd)
      restart()
      return
    } catch(e) {
      console.error('zip 更新方式失败', e.message || e, '即将尝试单文件下载的更新方式')
    }
  }
  console.log('开始获取更新文件列表...')
  let res = null
  try {
    res = await $axios({
      url: 'https://api.github.com/repos/elecv2/elecv2p/git/trees/master?recursive=1',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
      }
    })
  } catch(e) {
    console.error('获取 elecV2P 软更新文件列表失败', e.message || e)
    $message.error('获取 elecV2P 软更新文件列表失败', e.message || e)
    return
  }

  try {
    // 异步并行下载
    await promisePool(downloadFile, res.data.tree, {
      cb({ finish, fail }){
        if (!finish && fail) {
          return 'done'
        }
      }, limit: 5
    })
  } catch(e) {
    console.error('更新部分文件时出错，请检查网络后重试', e.message || e)
    $message.error('更新部分文件时出错，请检查网络后重试')
    return
  }
  restart()
}

function unzip(dest){
  let fs = require('fs')
  let path = require('path')
  let AdmZip = require('adm-zip')

  let zip = new AdmZip(dest)

  console.log('开始解压', dest, '以进行更新...')
  zip.getEntries().forEach(zipEntry=>{
    if (zipEntry.isDirectory) {
      return
    }
    for (let item of CONFIG.noupdate) {
      if (new RegExp(item).test(zipEntry.entryName)) {
        console.log('根据 CONFIG.noupdate 规则:', item, '不更新文件:', zipEntry.entryName)
        return
      }
    }
    let tpath = path.dirname(zipEntry.entryName).replace(`elecV2P-${CONFIG.tags || 'master'}`, '.')
    zip.extractEntryTo(zipEntry.entryName, tpath, false, true)
    console.log('更新文件:', `${tpath}/${zipEntry.name}`)
  })
  console.log('删除安装包', dest)
  fs.rmSync(dest)
}

async function restart() {
  console.log('全部文件更新完成')
  if (CONFIG.dependencies_update) {
    console.log('开始更新默认依赖')
    try {
      await execP('yarn')
    } catch(e) {
      console.error('yarn 更新默认依赖错误', e)
      try {
        await execP('npm i')
      } catch(e) {
        console.error('npm i 更新默认依赖错误', e)
      }
    }
  }
  if (CONFIG.restart !== false) {
    console.log('开始重启以应用更新。稍等一下刷新前端网页，查看是否生效')
    autoFresh()
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
  } else {
    console.log('此次软更新设置为不重启，所以该更新并没有应用。如需应用，请手动重启 elecV2P')
  }
}

function autoFresh() {
  $evui({
    title: '软更新完成',
    width: 800,
    height: 200,
    content: `<p>软更新已完成，elecV2P 将在 3 秒后尝试自动刷新前端页面</p><p>如长时间没有反应，请点击 <span style="color: var(--main-bk); cursor: pointer;" onclick="location.reload(true)">手动刷新</span></p>`,
    style: {
      content: "font-size: 26px; text-align: center",
    },
    resizable: false,
    script: `console.log("将在 3 秒后自动刷新页面");setTimeout(()=>{location.hash = '';location.reload(true)}, 3000)`
  }).catch(e=>console.log(e))
}

async function downloadFile(file){
  if (file.type === 'blob') {
    let btoUP = true
    for (let item of CONFIG.noupdate) {
      if (new RegExp(item).test(file.path)) {
        btoUP = false
        console.log('根据 CONFIG.noupdate 规则:', item, '不更新文件:', file.path)
        return
      }
    }
    if (btoUP) {
      let durl = CONFIG.cdngit + '/elecV2/elecV2P/master/' + file.path
      console.log('获取更新:', durl)
      await $download(durl, { folder: './', name: file.path },
            d=>{
              if (d && d.progress) console.log(d.progress + '\r')
            }).then(d=>console.log('同步文件:', d))
    }
  }
}

/**
 * elecV2P 检测默认依赖是否更新
 * @param     {object}    dependencies    最新的依赖
 * @return    {boolean}   true: 有更新 false: 无更新
 */
function dependenciesCheck(dependencies = {}) {
  const path = require('path')

  console.log('开始检测默认依赖是否更新')
  const dependencies_old = require(path.resolve('package.json')).dependencies
  for (let dep in dependencies) {
    if (dependencies_old[dep] !== dependencies[dep]) {
      console.log(dep, '需要更新到', dependencies[dep])
      return true
    }
  }
  console.log('默认依赖不需要更新')
  return false
}

function execP(command) {
  console.log('start run command', command)
  return new Promise((resolve, reject)=>{
    $exec(command, {
      timeout: 0, cwd: './',
      cb(data, error, finish){
        if (finish) {
          console.log(command, 'finished')
          resolve()
        }
        error ? reject(error) : console.log(data)
      }
    })
  })
}

/**
 * 异步并行执行函数及限制（待优化）
 * author     https://t.me/elecV2
 * update     https://github.com/elecV2/elecV2P-dei/blob/master/examples/JSTEST/asyncPool.js
 * @param     {Function}    fn       待执行的异步函数
 * @param     {Array}       params   函数传入参数
 * @param     {Function}    cb       回调函数
 * @param     {Number}      limit    同时并发执行数
 * @return    {Promise}
 */
function promisePool(fn, params, { cb, limit = 6, log = false }) {
  if (typeof(fn) !== 'function') {
    return Promise.reject('a function is expect')
  }
  if (!Array.isArray(params)) {
    return Promise.reject('a array of params is expect')
  }
  let cnlog = (...args)=>{
    if (log) {
      console.log.apply(null, args)
    }
  }
  let cback = async (options = {}) => {
    // callback 可能会加入新的 params
    if (typeof(cb) === 'function') {
      return await cb(options)
    } else {
      cnlog(options)
    }
  }
  let last  = 0, fail = [], cbdone = false
  let orbit = new Map()
  let isCbDone = (flag = false)=>{
    // call force done 只生效一次
    if (flag === 'done') {
      cbdone = true
    }
    return cbdone
  }
  let nTask = async (idx) => {
      let curt = last++, orbitdone = orbit.get(idx) || []
      await cback({ message: `orbit ${idx} start`, orbit: idx, running: curt, done: orbitdone })
      cnlog('orbit', idx, 'start task', curt)
      let res = null, tempdone = false
      try {
        res = await fn(params[curt])
        orbitdone.push(curt)
        orbit.set(idx, orbitdone)
        tempdone = await cback({ message: `task ${curt} finish`, orbit: idx, done: orbitdone, res })
      } catch(err) {
        console.error('task', curt, 'fail, data', params[curt])
        fail.push(curt)
        tempdone = await cback({ message: `task ${curt} fail with data ${params[curt]}`, orbit: idx, fail: err.message || err })
      }
      if (last >= params.length) {
        orbit.delete(idx)
        if (orbit.size === 0) {
          cnlog('all task done')
          await cback({ message: `total tasks ${last}, all finished`, finish: true, done: last, fail })
        }
      } else {
        if (isCbDone(tempdone)) {
          if (tempdone) {
            cnlog('force done by callback, fail', fail, 'current task', curt, 'with param', params[curt])
          }
          throw Error('force done by callback')
        } else {
          await nTask(idx)
        }
      }
    }

  return Promise.all(new Array(Math.min(limit, params.length)).fill(1).map((s, idx)=>nTask(idx)))
}