// test task runjs -env arguments
// 定时任务附带其他参数，比如: exam-js-env.js -env name=我的名字 cookie=mycookie

let name = 'elecV2P'
if (typeof($name) != "undefined") {
  name = $name
}
console.log('hello', name)

if (typeof($cookie) != "undefined") {
  console.log('a cookie from task env', $cookie)
}