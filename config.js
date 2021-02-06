const fs = require('fs')
const path = require('path')

const CONFIG_Port = {
  proxy: 8001,    // anyproxy 代理端口
  webif: 8002,    // 网络请求查看端口
  webst: 80       // 主页面端口
}

const CONFIG = {
  path: path.join(__dirname, 'script', 'Lists', 'config.json'),
  wbrtoken: 'a8c259b2-67fe-4c64-8700-7bfdf1f55cb3',    // webhook token（建议修改）
  efss: {                    // elecV2P file storage system
    enable: true,            // 默认开启。关闭： false
    directory: './efss'      // 文件存储位置
  }
};

(()=>{
  if (fs.existsSync(CONFIG.path)) {
    try {
      const saveconfig = JSON.parse(fs.readFileSync(CONFIG.path, "utf8"))
      Object.assign(CONFIG, saveconfig)
    } catch(e) {
      console.log(`[CONFIG     error][${new Date().toLocaleString('zh', { hour12:false })}]: JSON.parse config file error`, e.stack)
    }
  }

  if (CONFIG.efss.enable) {
    const efssF = path.resolve(__dirname, CONFIG.efss.directory)
    if(!fs.existsSync(efssF)) fs.mkdirSync(efssF, {recursive: true})
  }

  CONFIG.version = require('./package.json').version
  CONFIG.start   = Date.now()
})();

module.exports = { CONFIG, CONFIG_Port }