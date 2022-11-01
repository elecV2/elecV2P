const fs = require('fs')
const path = require('path')
const { UUID, sHash } = require('./utils/string')

const CONFIG_Port = {     // 此处修改对应端口无效
  proxy: 8001,    // anyproxy 代理端口
  webif: 8002,    // 网络请求查看端口
  webst: 80,      // webUI 主页面端口

  // 其他 elecV2P 运行时参数
  path: path.resolve(__dirname, 'script/Lists', process.env.CONFIG || 'config.json'),
  start: Date.now(),
  version: require('./package.json').version,
}
delete process.env.CONFIG

const CONFIG = fs.existsSync(CONFIG_Port.path) ? require(CONFIG_Port.path) : Object.create(null);
CONFIG_Port.webst = process.env.PORT || CONFIG.webUI?.port || CONFIG_Port.webst;

CONFIG_Port.path_lists = path.resolve(__dirname, CONFIG.path_lists || 'script/Lists')
CONFIG_Port.path_script = path.resolve(__dirname, CONFIG.path_script || 'script/JSFile')
CONFIG_Port.path_store = path.resolve(__dirname, CONFIG.path_store || 'script/Store')
CONFIG_Port.path_shell = path.resolve(__dirname, CONFIG.path_shell || 'script/Shell')

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
  CONFIG.wbrtoken = CONFIG.webhook?.token || UUID()
}
if (!CONFIG.env) {
  CONFIG.env = {
    path: ''
  }
} else {
  const { path, PATH, ...config_other } = CONFIG.env
  for (let enkey in config_other) {
    process.env[enkey] = config_other[enkey]
  }
}
if (!CONFIG.SECURITY) {
  CONFIG.SECURITY = {
    enable: false,
  }
} else if (CONFIG.SECURITY.tokens) {
  const tokens = {}
  for (let rawkey in CONFIG.SECURITY.tokens) {
    let token = CONFIG.SECURITY.tokens[rawkey]
    if (token.token && token.token !== CONFIG.wbrtoken) {
      tokens[sHash(token.token)] = token
    }
  }
  CONFIG.SECURITY.tokens = tokens
}
if (!CONFIG.webUI) {
  CONFIG.webUI = {
    port: 80,
  }
}
process.env.PATH = [...new Set([
  ...process.env.PATH.split(path.delimiter),
  ...(CONFIG.env.path ?? CONFIG.env.PATH ?? '').split(path.delimiter),
  path.join(__dirname, 'script/Shell')
].filter(s=>s))].join(path.delimiter)
CONFIG.env.path = process.env.PATH

CONFIG_Port.userid = sHash(CONFIG.wbrtoken)
CONFIG_Port.vernum = Number(CONFIG_Port.version.replace(/\D/g, ''))

module.exports = { CONFIG, CONFIG_Port }