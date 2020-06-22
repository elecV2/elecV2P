const webstser = require('./webmodule')
const anyproxy = require('./anyproxy')

const CONFIG_Port = {
  proxy: 8001,    // 代理端口
  webif: 8002,    // 代理的所有请求查看端口
  webst: 80       // 设置页面端口（规则更改，JS 添加等）
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
      
const proxy = anyproxy(aProxyOptions)
proxy.start()

webstser(CONFIG_Port)