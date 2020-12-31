// require example. require 函数使用范例

const path = require('path')
const ob2 = require('./requireob2.js')
console.log(ob2, path.join(__dirname))

const rob = require('requireob')
rob('hello elecV2P')

const { wait } = require('utils.js')
wait(3).then(()=>console.log('done'))