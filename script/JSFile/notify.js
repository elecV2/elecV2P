// 通知触发的 JS，在 webUI->SETTING 中进行添加
// 功能:
//   - 过滤通知
//   - 自定义个性化通知
//   - 其他 JS 能做的事
//
// 通过通知触发的 JS 默认带有三个变量 $title$, $body$, $url$（v3.4.5 之后可使用 $env.title/$env.body/$env.url 读取）
// 通过通知触发的 JS 除 $feed.push 函数不可用之外（防止循环调用），其他默认参数/环境变量都可以直接使用
// （具体查看: https://github.com/elecV2/elecV2P-dei/blob/master/docs/04-JS.md）

if ($env.title && $env.body) {
  console.log('脚本获取到的通知内容:', $env.title, $env.body, $env.url)

  // 简单过滤
  if (/重要/.test($env.title)) {
    // 使用 $enable$ 强制发送通知 
    $feed.bark('$enable$【重要通知】 ' + $env.title, $env.body, $env.url)
  } else if (/userid/.test($env.title)) {
    $feed.cust('$enable$特别通知 - ' + $env.title, $env.body, $env.url)
  } else if (/测试/.test($env.title)) {
    $message.success(`一条网页消息 -来自通知触发的 JS\n【标题】 ${$env.title} 【内容】 ${$env.body}\n${$env.url}`, 0)
  }

  if (/elecV2P/.test($env.body)) {
    // 对通知内容进行修改
    $env.body = $env.body.replace('elecV2P', 'https://github.com/elecV2/elecV2P')
    // 然后通过自定义通知发送
    mynotify1($env.title, $env.body, $env.url)
  }
} else {
  console.log('没有 $env.title', '该 JS 应该由通知自动触发执行')
}

function mynotify1(title, body, url) {
  // 其他自定义通知
  console.notify('自行编写函数实现其他比较复杂的通知', '通知标题:', title, '通知内容:', body, url)
  
  // 比如再使用 TGbot 发送一条通知（设置好 botapi 和 userid）
  let req = {
      url: 'https://api.telegram.org/bot你的botapi/',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8'
      },
      method: 'post',
      data: {
        "method": "sendMessage",
        "chat_id": '一个TG userid',
        "text": `【来自通知JS】${title}\n${body}\n${url}`
      }
    }
  $axios(req).then(res=>{
    console.log('mynotify1 通知结果', res.data)
  }).catch(e=>{
    console.error('mynotify1 通知失败', e.message)
  })
}