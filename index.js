const CONFIG_Port = {
  proxy: 8001,    // anyproxy 代理端口
  webif: 8002,    // 网络请求查看端口
  webst: 80       // 主页面端口
}

const aProxyOptions = {
        port: CONFIG_Port.proxy,
        rule: require('./runjs/rule.js'),
        webInterface: {
          enable: true,          // 是否打开代理请求查看端口
          port: CONFIG_Port.webif
        },
        rootCA: true             // 是否自动启动 rootCA 目录下根证书
      }
      
const anyproxy = require('./anyproxy')
const webstser = require('./webmodule')

const proxy = anyproxy(aProxyOptions)
proxy.start()

webstser(CONFIG_Port)