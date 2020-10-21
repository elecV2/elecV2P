// 下载文件到 efss 目录
$download('https://raw.githubusercontent.com/elecV2/elecV2P/master/Todo.md').then(d=>console.log('file download to:', d)).catch(e=>console.error(e))

// 下载文件到其他目录
$download('https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/examples/Shell/aria2c', __dirname + '/script/Shell/aria2c').then(d=>{
  console.log('file download to:', d)
  aria2cDown('https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/0body.js')
}).catch(e=>console.error(e))

// 配合 $exec 使用 aria2 进行下载。（需提前配置好 aria2 使用环境, 使命令 aria2c 在系统 Shell 环境中可用）
function aria2cDown(dlink, loc) {
  $exec(`./aria2c --enable-dht=true ${dlink} -d ${loc || __efss}`, {
    cwd: './script/Shell',
    cb(data, error){
      if (error) {
        console.error(error)
      } else {
        console.log(data)
      }
    }
  })
}

// aria2cDown('magnet:?xt=urn:btih:ec6f7a571f0253f0b6c99c80e25b9b7ed92cc488')