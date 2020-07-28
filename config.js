const fs = require('fs')
const path = require('path')

const CONFIG = {
  path: path.join(__dirname, 'script', 'Lists', 'config.json'),
  wbrtoken: 'a8c259b2-67fe-4c64-8700-7bfdf1f55cb3',    // webhook token（建议修改）
}

if (fs.existsSync(CONFIG.path)) {
  try {
    let saveconfig = fs.readFileSync(CONFIG.path, "utf8")
    Object.assign(CONFIG, JSON.parse(saveconfig))
  } catch {
    // do something or not
  }
}

CONFIG.version = require('./package.json').version
CONFIG.start   = Date.now()

const CONFIG_Port = {
  proxy: 8001,    // anyproxy 代理端口
  webif: 8002,    // 网络请求查看端口
  webst: 80       // 主页面端口
}

module.exports = { CONFIG, CONFIG_Port }