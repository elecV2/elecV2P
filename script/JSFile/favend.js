// EFSS favend 之 backend runjs 示例脚本
// 该脚本用于 elecV2P EFSS 界面 favend 相关部分
// 更新时间: 2021-09-30
// 文件地址: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/favend.js

// favend 中可获取的网络请求参数:
// $request.url, $request.headers, $request.body<string> (favend 暂不支持 $request.bodyBytes<buffer>)
// $request.method, $request.protocol, $request.hostname, $request.port, $request.path

// favend 中的 response 待生成，故无 $response 相关参数

if (/json/.test($request.url)) {
  $done({
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'X-Powered-By': 'elecV2P'
    },
    body: {
      'hello': 'elecV2P favend',
      'note': '这是由 elecV2P favend 返回的 JSON 数据',
      'docs': 'https://github.com/elecV2/elecV2P/blob/master/efss/readme.md',
      'request': $request
    }
  })
} else if (/pic/.test($request.url)) {
  const fs = require('fs')
  const path = require('path')

  fs.readFile(path.join(__efss, 'favend.png'), (err, data) => {
    if (err) {
      $done({
        statusCode: 200,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'X-Powered-By': 'elecV2P'
        },
        body: err.message
      })
    } else {
      $done({
        statusCode: 200,
        headers: {
          'Content-Type': 'image/png',
          'X-Powered-By': 'elecV2P'
        },
        body: data
      })
    }
  })
} else {
  $done({
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'X-Powered-By': 'elecV2P'
    },
    body: `<p>这是一个通过 elecV2P favend 生成的动态网页</p><p>该网络请求的头部信息(headers): <pre>${ JSON.stringify($request.headers, null, 2) }</pre></p><div>理论上可以包含任何 html 内容</div><p>关于 favend 的说明可参考 efss/readme.md 或 <a href='https://github.com/elecV2/elecV2P-dei/blob/master/docs/08-logger&efss.md' target='_blank'>此说明文档</a></p><div><a href='?json'>点击此处</a> 查看此 backend 返回的 JSON 数据</div><br><div><a href='?pic' target='_blank'>点击此处</a> 查看此 backend 返回的一张图片</div><br><p>该 JS 地址: <a href='https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/favend.js' target='_blank'>https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/favend.js</a></p>`
  })
}