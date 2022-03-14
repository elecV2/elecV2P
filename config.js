const fs = require('fs')
const path = require('path')
const { sJson, UUID, sHash } = require('./utils/string')

const CONFIG_Port = {     // 此处修改对应端口无效
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

CONFIG_Port.webst = process.env.PORT || CONFIG.webUI?.port || CONFIG_Port.webst;

if (CONFIG.anyproxy) {
  if (CONFIG.anyproxy.port) {
    CONFIG_Port.proxy = CONFIG.anyproxy.port
  } else {
    CONFIG.anyproxy.port = CONFIG_Port.proxy
  }
  if (CONFIG.anyproxy.webPort) {
    CONFIG_Port.webif = CONFIG.anyproxy.webPort
  } else {
    CONFIG.anyproxy.webPort = CONFIG_Port.webif
  }
} else {
  CONFIG.anyproxy = {
    enable: false,
    port: CONFIG_Port.proxy,
    webPort: CONFIG_Port.webif
  }
}

if (process.env.TOKEN) {
  CONFIG.wbrtoken = process.env.TOKEN.trim()
  delete process.env.TOKEN
}
if (!CONFIG.wbrtoken) {
  CONFIG.wbrtoken = UUID()
}
CONFIG.userid  = sHash(CONFIG.wbrtoken)
CONFIG.version = require('./package.json').version
CONFIG.vernum  = Number(CONFIG.version.replace(/\.|v/g, ''))
CONFIG.start   = Date.now()

module.exports = { CONFIG, CONFIG_Port }