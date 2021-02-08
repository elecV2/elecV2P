// 在 Docker 下安装 python 执行环境。

checkCmd('python3 -V').then(data=>console.log(data, 'python 已安装')).catch(e=>{
  // 开始安装 python
  $exec('apk add python3', {
    call: true, timeout: 0,
    cb(data, error, finish){
      if (!error && finish) {
        // pyhton 和库安装完成后可直接在系统或其他脚本中调用，不需要再次安装。
        $exec('python3 test.py', {
          cwd: './script/Shell',    // test.py 所在目录
          cb(data, error){
            error ? console.error(error) : console.log(data)
          }
        })

        // 安装一些 python 库，根据需要自行选择更改
        // $exec('pip3 install you-get youtube-dl ffmpeg requests', { cb(data, error){error ? console.error(error) : console.log(data)} })
      } else {
        error ? console.error(error) : console.log(data)
      }
    }
  })
})

function checkCmd(cmd) {
  return new Promise((resolve, reject)=>{
    $exec(cmd, {
      timeout: 0,
      cb(data, error){
        if (error) {
          console.error(error)
          reject(error.message || error)
        } else {
          console.log(data)
          resolve()
        }
      }
    })
  })
}