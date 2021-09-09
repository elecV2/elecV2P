const { exec } = require('../func')
const { logger, file } = require('../utils')

const clog = new logger({ head: 'webRPC', level: 'debug', file: 'webRPC.log' })

function eRPC(req, res) {
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
  case 'save':
    file[method](params[0], params[1], (err)=>{
      if (err) {
        clog.error(err)
        res.json({
          rescode: -1,
          message: err.message
        })
      } else {
        res.json({
          rescode: 0,
          message: 'success ' + method + ' file to ' + (method !== 'save' ? params[1] : params[0])
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