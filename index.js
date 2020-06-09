const webstser = require('./webmodule')
const anyproxy = require('./anyproxy')
const { websocketSer } = require('./func/websocket')

const proxyPort = 8001,    // 代理端口
      webifPort = 8002,    // 代理的所有请求查看端口
      webstPort = 80,      // 设置页面端口（规则更改，JS 添加等）
      webskPort = 8005     // websocket 端口

const aProxyOptions = {
        port: proxyPort,
        rule: require('./runjs/rule.js'),
        webInterface: {
          enable: true,          // 是否打开代理请求查看端口
          port: webifPort
        },
        rootCA: true             // 是否自动启动 rootCA 目录下根证书
      }
      
const CONFIG_WS = {
  webskPort,
  webskPath: '/elecV2P'
}

const proxy = anyproxy(aProxyOptions)

const webst = webstser({ webstPort: process.env.PORT || webstPort || 80, proxyPort, webifPort, webskPort: CONFIG_WS.webskPort, webskPath: CONFIG_WS.webskPath })

const wsser = websocketSer({ port: CONFIG_WS.webskPort, path: CONFIG_WS.webskPath })