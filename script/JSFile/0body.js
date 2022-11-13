// $request.url<string>, $request.headers<object>, $request.body<string>, $request.bodyBytes<buffer>
// $request.method<string>, $request.protocol<string>, $request.hostname<string>, $request.port<number>, $request.path<string>
// $response.status<number>, $response.statusCode<number>, $response.headers<object>, $response.body<string>, $response.bodyBytes<buffer>
// 更多说明请查看 https://github.com/elecV2/elecV2P-dei/blob/master/docs/04-JS.md 说明文档 $request/$response 部分

// elecV2P 示例脚本
// 更新地址: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/0body.js

// 直接返回结果
$done({
  response: {
    status: 200,        // 状态码，比如 401/404/502 等。默认为 200，可省略
    // statusCode: 200, // 同上。优先级比 status 高。即当该项存在时，status 参数会被忽略
    // header: {},      // 同下。优先级比 headers 高
    headers: {          // 替换返回数据的头部信息。可省略
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'text/plain; charset=utf-8',     // 如使用替换 headers, 此项务必填写
      'X-Powered-By': 'elecV2P'
    },
    body: 'hello elecV2P'   // 返回的 body 可以是任意数据类型
  }
})

// 以上基本等同于
// @grant nodejs
$done({
  // bodyBytes 优先级比 body 高
  bodyBytes: Buffer.from('hello elecV2P')
})

// 或者直接全部省略（不推荐
$done(new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x65, 0x6c, 0x65, 0x63, 0x56, 0x32, 0x50]).buffer)

// 注意: 如果该脚本是在网络请求前执行，以上 $done 结果并不相同
// 第一个有 response 参数，第三个为非 object 结果，都会直接返回结果（不发送网络请求
// 而第二个只有 bodyBytes/body 参数表示修改网络请求体(request body)，然后继续网络请求

// 关于网络请求前可修改的相关参数如下:（每一项都可单独设置，不必同时使用
$done({
  protocol: 'https',           // 当此项不等于当前网络请求协议时，将直接返回使用此协议
  path: '/efss/test',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Linux; U; elecV2P; x64) ePhone Super Max Plus++ XII'
  },
  body: {
    "hello": "elecV2P"
  },
  bodyBytes: Buffer.from(`{"hello": "elecV2P bodyBytes"}`),     // bodyBytes 优化级高于 body
})

// 如果要进行 url 跳转，可以使用 301/307 statusCode
$done({
  response: {
    statusCode: 307,
    header: { Location: 'https://github.com/elecV2/elecV2P' }
  }
})