// 确保系统已安装好 python 执行环境

$exec('test.py', {
  cwd: './script/Shell',
  cb(data, error){
    if (error) {
      console.error(error)
    } else {
      console.log(data)
    }
  }
})