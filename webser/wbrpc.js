// RPC learn-test 101

const { exec } = require('../func')
const { logger } = require('../utils')

const clog = new logger({ head: 'webRPC', level: 'debug' })

function eRPC(req, res) {
  let { method, params, id } = req.body
  // method: string, params: array
  switch(method) {
  case 'pm2run':
    exec('pm2 start ' + params[0] + ' --attach --no-autorestart', {
      timeout: 5000, call: true, from: 'rpc',
      ...params[1],
      cb(data, error, finish){
        if (finish) {
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            result: data, id
          }))
        } else if (error) {
          clog.error(error)
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error
            },
            id: null
          }))
        } else {
          clog.debug(data)
        }
      }
    })
    break
  default:
    clog.info('RPC method not found', method)
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: `method ${method || ''} not found`
      },
      id: null
    }))
  }
}

module.exports = app => {
  app.post("/rpc", eRPC)
}