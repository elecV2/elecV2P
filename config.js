const fs = require('fs')
const path = require('path')
const { sJson } = require('./utils/string')

const CONFIG_Port = {
  proxy: 8001,    // anyproxy 代理端口
  webif: 8002,    // 网络请求查看端口
  webst: 80       // webUI 主页面端口
}

const CONFIG = {
  path: path.join(__dirname, 'script', 'Lists', 'config.json'),
}

if (fs.existsSync(CONFIG.path)) {
  Object.assign(CONFIG, sJson(fs.readFileSync(CONFIG.path, "utf8")))
}

CONFIG.version = require('./package.json').version
CONFIG.start   = Date.now()

module.exports = { CONFIG, CONFIG_Port }