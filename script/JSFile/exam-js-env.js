// test task runjs -env arguments
// 定时任务运行 JS 附带其他参数测试
// 比如: exam-js-env.js -env name=我的名字 cookie=mycookie

let name = $env.name || 'elecV2P'       // 使用 $env 来获取临时环境变量(v3.4.5 之后)
console.log('hello', name)

if ($env.cookie) {
  console.log('a cookie from task env', $env.cookie)
}

/********  v3.4.5 之前使用的代码  ********/
// let name = 'elecV2P'
// if (typeof($name) != "undefined") {
//   name = $name
// }
// console.log('hello', name)

// if (typeof($cookie) != "undefined") {
//   console.log('a cookie from task env', $cookie)
// }