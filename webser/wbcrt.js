const homedir = require('os').homedir()

const { logger } = require('../utils')
const clog = new logger({ head: 'wbcrt' })

const { rootCrtSync, clearCrt, newRootCrt } = require('../func')

module.exports = app => {
  app.get("/crt", (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress) 
      , "根证书下载")
    res.download(homedir + '/.anyproxy/certificates/rootCA.crt')
  })

  app.put("/crt", (req, res)=>{
    let op = req.body.op
    switch(op){
      case 'new':
        newRootCrt(req.body.data, (error, keyPath)=>{
          if (error) res.end('失败! ' + error)
          else res.end('新的根证书已生成: ' + keyPath)
        })
        break
      case 'rootsync':
        if(rootCrtSync()) {
          res.end('已启用 rootCA 文件夹下根证书')
        } else {
          res.end('rootCA 目录下无根证书，请先放置再同步')
        }
        break
      case 'clearcrt':
        clearCrt()
        res.end('其他证书已清除')
        break
      default: {
        res.end("未知操作")
        break
      }
    }
  })
}