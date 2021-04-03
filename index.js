const { CONFIG_Port } = require('./config')

const webstser = require('./webmodule')
webstser()

const aProxyOptions = {
  port: CONFIG_Port.proxy,
  rule: require('./script/rule.js'),
  webInterface: {
    enable: true,          // 是否打开代理请求查看端口
    webPort: CONFIG_Port.webif
  },
  rootCA: true             // 是否自动应用 rootCA 目录下根证书
}

const anyproxy = require('./utils/anyproxy')
const proxy = anyproxy(aProxyOptions)
proxy.start()