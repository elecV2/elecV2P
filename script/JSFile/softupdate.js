// （先看完说明，再决定是否执行！）
// 用于获取 https://github.com/elecV2/elecV2P 最新文件，并替换。（软更新升级）
// 更新后会自动重启，以应用新的文件。首先会尝试以 PM2 的方式重启，如果失败，将直接重启服务器。
// 操作不可恢复，谨慎使用。3.1.8 版本添加了默认的 PM2 执行方式，建议在此版本后使用。

const noupdate = [
  'script/JSFile',         // 设置一些不覆盖更新的文件夹（保留个人数据）。根据个人需求调整
  'script/Lists',
  'script/Store',
  'script/Shell',
]

$axios('https://api.github.com/repos/elecv2/elecv2p/git/trees/master?recursive=1').then(res=>{
  let data = res.data
  let tree = data.tree
  tree.forEach(file=>{
    if (file.type === 'blob') {
      if (noupdate.filter(item=>file.path.match(item)).length === 0) {
        let durl = 'https://raw.githubusercontent.com/elecV2/elecV2P/master/' + file.path
        console.log('开始下载', durl)
        $download(durl, file.path).then(d=>console.log('文件已下载: ' + d)).catch(e=>console.error(e))
      }
    }
  })
  console.log('更新文件完成, 开始重启以应用服务。')
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
}).catch(e=>console.error('获取 https://github.com/elecV2/elecV2P 文件失败', e.message || e))
