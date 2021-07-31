// require example
// require 函数使用范例

// 引用 nodejs 公用库
const path = require('path')
console.log(path.join(__dirname))

// 引用同目录下其他文件
const rob = require('./requireob')
rob('hello elecV2P')

const { wait } = require('./utils.js')
wait(3).then(()=>$done('require test done'))