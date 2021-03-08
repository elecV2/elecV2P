const fs = require('fs')
const path = require('path')

const CONFIG_Port = {
  proxy: 8001,    // anyproxy 代理端口
  webif: 8002,    // 网络请求查看端口
  webst: 80       // webUI 主页面端口
}

const CONFIG = {
  path: path.join(__dirname, 'script', 'Lists', 'config.json'),
  wbrtoken: 'a8c259b2-67fe-4c64-8700-7bfdf1f55cb3',    // webhook token（可在 webUI->SETTING 界面修改）
};

(()=>{
  if (fs.existsSync(CONFIG.path)) {
    try {
      const saveconfig = JSON.parse(fs.readFileSync(CONFIG.path, "utf8"))
      Object.assign(CONFIG, saveconfig)
    } catch(e) {
      console.log(`[CONFIG     error][${new Date().toLocaleString('zh', { hour12:false })}] JSON.parse config file error`, e.stack)
    }
  }

  CONFIG.version = require('./package.json').version
  CONFIG.start   = Date.now()
})();

module.exports = { CONFIG, CONFIG_Port }