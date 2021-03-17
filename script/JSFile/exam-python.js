// 确保系统已安装好 python 执行环境

// 基础使用
$exec('python3 -u test.py', {
  cwd: './script/Shell',     // test.py 文件所在的目录。如果把 py 文件在 efss 目录，则改为 './efss'
  cb(data, error){
    error ? console.error(error) : console.log(data)
  }
})

// stdin 延迟交互内容输入 简单示例
$exec('python3 -u askinput.py', {
  cwd: './script/Shell',
  stdin: {
    delay: 3000,   // 输入延时时间，单位 ms。可省略
    write: 'elecV2P\nI am fine, thank you.'     // 具体输入数据。（可自行修改）
  },
  cb(data, error){
    if (error) {
      console.error(error)
    } else {
      console.log(data)
    }
  }
})