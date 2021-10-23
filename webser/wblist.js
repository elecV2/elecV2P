const fs = require('fs')
const path = require('path')

const { logger, list } = require('../utils')
const clog = new logger({ head: 'wblist' })

module.exports = app => {
  const LISTPATH = path.join(__dirname, '../script', 'Lists')

  app.get('/filter', (req, res)=>{
    res.send(list.get('filter.list'))
  })

  app.post('/filterlist', (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'update filter.list')
    if (req.body.filterlist) {
      let file = fs.createWriteStream(path.join(LISTPATH, 'filter.list')), len = 0
      file.on('error', (err)=>clog.error(err))
      file.write('[elecV2P filter.list]\n')
      req.body.filterlist.forEach(fr=>{
        if (fr[1] && /^(DOMAIN(-SUFFIX)?|IP-CIDR)$/.test(fr[0])) {
          file.write(fr[0] + ',' + fr[1] + ',elecV2P\n')
          len++
        }
      })
      file.end()
      res.json({
        rescode: 0,
        message: 'success save filter list ' + len
      })
    } else {
      res.json({
        rescode: -1,
        message: 'a parameter filterlist is expect'
      })
    }
  })
}