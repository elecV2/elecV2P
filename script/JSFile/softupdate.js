// （先看完说明，再决定是否执行！操作不可恢复，谨慎使用。）
// 用于获取 https://github.com/elecV2/elecV2P 最新文件，并替换。（软更新升级）
// 更新后会自动重启，以应用新的文件。首先会尝试以 PM2 的方式重启，如果失败，将直接重启容器(Docekr 模式下)或服务器(Nodejs 模式下)。
// 3.1.8 版本后 Docker 默认使用 PM2 的方式启动，建议在此版本后使用。
// 如果是 Docker 运行且设置了容器重启后自动更新镜像的话，该软更新在非 PM2 重启的情况下无效。
// 
// 该文件更新地址：https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/softupdate.js

const noupdate = [
  // 'script/JSFile',         // 设置一些不覆盖更新的文件夹（保留个人数据）。根据个人需求进行调整
  'script/Lists',          // 如果不设置，也只会覆盖更新 elecV2P 自带的同名文件，对其他文件无影响
  'script/Store',
  'script/Shell',
  'Todo',              // 排除单个文件，使用文件名包含的关键字即可
]

$axios('https://api.github.com/repos/elecv2/elecv2p/git/trees/master?recursive=1').then(async res=>{
  let data = res.data
  let tree = data.tree

  for (let file of tree) {
    if (file.type === 'blob') {
      if (noupdate.filter(item=>file.path.match(item)).length === 0) {
        let durl = 'https://raw.githubusercontent.com/elecV2/elecV2P/master/' + file.path
        console.log('获取远程更新文件：', durl)
        await $download(durl, { folder: './', name: file.path }).then(d=>console.log('完成同步更新文件: ' + d)).catch(e=>console.error(e))
      }
    }
  }

  console.log('更新文件完成, 开始重启以应用最新服务。')
  $exec('pm2 restart all', {
    cb(data, error, finish){
      if (error) {
        console.error(error)
        console.log('尝试使用 pm2 的方式重启失败，将直接重启服务器。')
        $exec('reboot')
      } else {
        console.log(data)
      }
      if (finish) {
        console.log('软更新重启完成，刷新一下前端网页，查看是否生效。')
      }
    }
  })
}).catch(e=>console.error('elecV2P 软更新失败', e.message || e))
