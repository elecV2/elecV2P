// 确保系统已安装好 python 执行环境

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