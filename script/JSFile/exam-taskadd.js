// 通过 webhook 添加定时任务

const webhook = {
  url: 'http://127.0.0.1:12521/webhook',       // 根据实际地址改写
  token: 'a8c259b2-67fe-4c64-8700-7bfdf1f55cb3',
}

// 任务格式参考：https://github.com/elecV2/elecV2P-dei/tree/master/docs/06-task.md
const task = {
  name: '新的任务-exam',
  type: 'cron',
  job: {
    type: 'runjs',
    target: 'https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/webhook.js',
  },
  time: '10 8 8 * * *',
  running: false        // 是否自动执行添加的任务
}

$axios({
  url: webhook.url,
  method: 'post',
  data: {
    token: webhook.token,
    type: 'taskadd',
    task
  }
}).then(res=>console.log(res.data)).catch(e=>console.log(e))