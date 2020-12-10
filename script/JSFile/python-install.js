// 在 Docker 环境中安装 python。

$exec('apk add python3', {
  call: true, timeout: 0,
  cb(data, error, finish){
    if (finish) {
      // 安装完以后可以直接在 JS 中调用。（pyhton 和库安装完成可在其他脚本中直接调用，不需要再次安装。）
      $exec('python3 test.py', {
        cwd: './script/Shell',
        cb(data, error){
          error ? console.error(error) : console.log(data)
        }
      })

      // 安装一些 python 库
      $exec('pip3 install you-get youtube-dl numpy requests')
    } else {
      error ? console.error(error) : console.log(data)
    }
  }
})