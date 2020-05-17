const webstser = require('./webmodule.js')
const anyproxy = require('./anyproxy.js')

const proxyPort = 8001,    // 代理端口
      webifPort = 8002,    // 代理的所有请求查看端口
      webstPort = 8004       // 设置页面端口（规则更改，JS 添加等）

const aProxyOptions = {
        port: proxyPort,
        rule: require('./runjs/rule.js'),
        webInterface: {
          enable: true,          // 是否打开代理请求查看端口
          port: webifPort
        }
      }
      
const proxy = anyproxy(aProxyOptions)

const webst = webstser({webstPort: process.env.PORT || webstPort || 80, proxyPort, webifPort})