// 一个通过 $cheerio 库来修改网页内容的简单小例子
// Author: https://t.me/elecV2
// 在 elecV2P webUI->REWRITE 中添加
// ^https:\/\/httpbin\.org https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/exam-cheerio.js

let body = $response.body
let restype = $response.headers['Content-Type']

if (/html/.test(restype)) {
  const $ = $cheerio.load(body)
  if ($('.title').length) {
    $('.title').text('changed by elecV2P')
    body = $.html()
    // console.log(body)
  }
}

if (/json/.test(restype)) {
  try {
    let obj = JSON.parse(body)
    if (obj.info && obj.info.title) {
      obj.info.title = 'changed by elecV2P'
      obj.info.description = 'elecV2P 是一款基于 NodeJS，可通过 JS 修改网络请求，以及定时运行脚本或 SHELL 指令的网络工具。<br/> <br/><b>项目地址: https://github.com/elecV2/elecV2P'
      body = JSON.stringify(obj)
    }
  } catch(e) {
    console.error(__name, 'error', e.message)
  }
}

$done(body)