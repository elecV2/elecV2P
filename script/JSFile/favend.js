// EFSS favend 之 backend runjs 示例脚本
// 该脚本用于 elecV2P EFSS 界面 favend 相关部分
// 更新时间: 2021-09-17 
// 文件地址: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/favend.js

// $request.headers, $request.body, $request.method, $request.hostname, $request.port, $request.path, $request.url
// $response.headers, $response.body, $response.statusCode

if (/json/.test($request.url)) {
  $done({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json;charset=utf-8' },
    body: {
      'hello': 'elecV2P favend',
      'note': '这是由 elecV2P favend 返回的 JSON 数据',
      'docs': 'https://github.com/elecV2/elecV2P/blob/master/efss/readme.md',
      'request': $request
    }
  })
} else {
  $done({
    headers: {
      "Content-Type": "text/html;charset=utf-8"
    },
    body: `<p>这是一个通过 elecV2P favend 生成的动态网页</p><p>该网络请求的头部信息(headers): <pre>${ JSON.stringify($request.headers, null, 2) }</pre></p><div>理论上可以包含任何 html 内容</div><p>关于 favend 的说明可参考 efss/readme.md 或 <a href='https://github.com/elecV2/elecV2P-dei/blob/master/docs/08-logger&efss.md' target='_blank'>此说明文档</a></p><div><a href='?json'>点击此处</a> 查看此 backend 返回的 JSON 数据</div><br><p>该 JS 地址: <a href='https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/favend.js' target='_blank'>https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/favend.js</a></p>`
  })
}