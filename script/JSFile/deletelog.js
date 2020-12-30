// 使用 Shell 指令删除所有日志文件
// 定时任务： 59 23 * * * deletelog.js

$exec('rm *.log', {
  cwd: './logs',        // 日志文件所在文件夹
  cb(data, error){
    error ? console.error(error) : console.log(data)
  }
})