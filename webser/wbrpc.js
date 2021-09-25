const { exec } = require('../func')
const { logger, file, sType } = require('../utils')

const clog = new logger({ head: 'webRPC', level: 'debug', file: 'webRPC.log' })

const CONFIG_RPC = {
  v: 102,
}

function eRPC(req, res) {
  if (!req.body.v || req.body.v < CONFIG_RPC.v) {
    return res.json({
      rescode: 2,   // 前端需要更新
      message: 'webUI need update(try refresh page)'
    })
  }
  let { method, params } = req.body
  clog.info(req.headers['x-forwarded-for'] || req.connection.remoteAddress, 'run method', method, 'with', params && params[0])
  // method: string, params: array
  switch(method) {
  case 'pm2run':
    exec('pm2 start ' + params[0] + ' --attach --no-autorestart', {
      timeout: 5000, call: true, from: 'rpc',
      ...params[1],
      cb(data, error, finish){
        if (finish) {
          res.json({
            rescode: 0,
            message: data
          })
        } else if (error) {
          clog.error(error)
          res.json({
            rescode: -1,
            message: error
          })
        } else {
          clog.debug(data)
        }
      }
    })
    break
  case 'copy':
  case 'move':
    if (sType(params[0]) === 'array') {
      params[0].forEach(fn=>{
        file[method](params[1] + '/' + fn, params[2] + '/' + fn, (err)=>{
          if (err) {
            clog.error(method, fn, 'fail.', err)
          }
        })
      })

      res.json({
        rescode: 0,
        message: 'success ' + method + ' file to ' + params[2]
      })
    } else {
      res.json({
        rescode: -1,
        message: 'a array parameter[0] is expect'
      })
      clog.error(method, 'file error: a array parameter[0] is expect')
    }
    break
  case 'save':
    let fcont = params[1]
    if (params[2] === 'hex' && sType(params[1]) === 'array') {
      clog.info('save mode is', params[2], 'Buffer.from content')
      fcont = Buffer.from(params[1])
    }
    file.save(params[0], fcont, (err)=>{
      if (err) {
        clog.error(err)
        res.json({
          rescode: -1,
          message: err.message
        })
      } else {
        res.json({
          rescode: 0,
          message: 'success save file to ' + params[0]
        })
      }
    })
    break
  case 'mkdir':
    file.mkdir(params[0], (err)=>{
      if (err) {
        clog.error(err)
        res.json({
          rescode: -1,
          message: err.message
        })
      } else {
        res.json({
          rescode: 0,
          message: 'success make dir ' + params[0]
        })
      }
    })
    break
  default:
    clog.info('RPC method not found', method)
    res.status(405).json({
      rescode: 405,
      message: `method ${method || ''} not found`
    })
  }
}

module.exports = app => {
  app.post("/rpc", eRPC)
}