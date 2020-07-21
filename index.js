const { CONFIG_Port } = require('./config')

const webstser = require('./webmodule')
webstser()

const aProxyOptions = {
  port: CONFIG_Port.proxy,
  rule: require('./runjs/rule.js'),
  webInterface: {
    enable: true,          // 是否打开代理请求查看端口
    port: CONFIG_Port.webif
  },
  rootCA: true             // 是否自动启动 rootCA 目录下根证书
}

const anyproxy = require('./utils/anyproxy')
const proxy = anyproxy(aProxyOptions)
proxy.start()