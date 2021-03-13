// 确保系统已安装好 python 执行环境

// windows 下执行
$exec('test.py', {
  cwd: './script/Shell',     // test.py 文件所在的目录
  cb(data, error){
    if (error) {
      console.error(error)
    } else {
      console.log(data)
    }
  }
})

// docker 下执行
$exec('python3 -u test.py', {
  cwd: './script/Shell',     // test.py 文件所在的目录。如果把 py 文件上传到了 efss 目录，则改为 './efss'
  cb(data, error){
    error ? console.error(error) : console.log(data)
  }
})