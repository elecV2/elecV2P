const fs = require('fs')
const path = require('path')

const { logger } = require('../utils')
const clog = new logger({ head: 'wbefss' })

const { CONFIG } = require('../config')

module.exports = app => {
  app.get('/efss', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get efss resource')

    if (CONFIG.efss === false) {
      res.end('efss is closed!')
      return
    }
    const efssF = path.resolve(__dirname, '../', CONFIG.efss)
    const listFile = function(folder){
      fs.readdirSync(folder).forEach(file=>{
        const fpath = path.join(folder, file)
        if (fs.statSync(fpath).isDirectory()) {
          listFile(fpath)
        } else {
          const spath = fpath.replace(efssF, '').slice(1).replace(/\\/g, '/')
          res.write(`<a class='efssa' href='./${ spath }' target='_blank'>${ spath }</a>`)
        }
      })
    }
    res.write(`
    <title>elecV2P file storage system</title>
    <style>
      .efssa {
        text-decoration: none;
        display: flex;
        background: #003153;
        color: #F8F8FF;
        margin: 6px 0;
        padding: 6px;
        border-radius: 6px;
      }
    </style>`)
    listFile(efssF)
    res.end()
  })
}