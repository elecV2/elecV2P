// 在 Docker 环境中安装 python。

checkCmd('python3 -V').then(data=>console.log(data, 'python 已安装')).catch(e=>{
  // 开始安装 python
  $exec('apk add python3', {
    call: true, timeout: 0,
    cb(data, error, finish){
      if (!error && finish) {
        // 安装完以后可以直接在 JS 中调用。（pyhton 和库安装完成可在其他脚本中直接调用，不需要再次安装。）
        $exec('python3 test.py', {
          cwd: './script/Shell',    // test.py 所在目录
          cb(data, error){
            error ? console.error(error) : console.log(data)
          }
        })

        // 安装一些 python 库，根据需要自行选择
        // $exec('pip3 install you-get youtube-dl numpy requests')
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