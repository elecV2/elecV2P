const { exec } = require('../func')
const { logger, file, sType, sJson, downloadfile, errStack, sseSer } = require('../utils')

const clog = new logger({ head: 'webRPC', level: 'debug', file: 'webRPC.log' })

const statusRPC = {
  download: new Map(),
}

function eRPC(req, res) {
  let { method, params } = req.body
  clog.info(req.headers['x-forwarded-for'] || req.connection.remoteAddress, 'run method', method, 'with', params && params[0])
  // method: string, params: array
  switch(method) {
  case 'pm2run':
    let undone = true
    exec('pm2 start ' + params[0] + ' --attach --no-autorestart', {
      timeout: 5000, call: true, from: 'rpc',
      ...params[1],
      cb(data, error, finish){
        if (undone && finish) {
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
          undone = false
        } else {
          clog.debug(data)
        }
      }
    })
    break
  case 'copy':
  case 'move':
    if (sType(params[0]) === 'array') {
      let message = `${method} operation completed`
      params[0].forEach(fn=>{
        file[method](params[1] + '/' + fn, params[2] + '/' + fn, (err)=>{
          if (err) {
            clog.error(method, fn, 'fail', err)
            message += `\nfail to ${method} ${fn}`
          }
        })
      })

      res.json({
        rescode: 0,
        message
      })
    } else {
      res.json({
        rescode: -1,
        message: 'a array parameter is expect'
      })
      clog.error(method, 'file error: a array parameter is expect')
    }
    break
  case 'rename':
    file.rename(params[0], params[1], (err)=>{
      if (err) {
        res.json({
          rescode: -1,
          message: err.message
        })
        clog.error(err)
      } else {
        res.json({
          rescode: 0,
          message: 'success rename file'
        })
      }
    })
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
  case 'zip':
    if (file.zip(params[0], params[1])) {
      res.json({
        rescode: 0,
        message: 'success make zip file ' + params[1]
      })
    } else {
      res.json({
        rescode: -1,
        message: 'fail to make zip file ' + params[1]
      })
    }
    break
  case 'unzip':
    let unzipres = file.unzip(params[0], params[1], { filelist: true })
    if (unzipres) {
      res.json({
        rescode: 0,
        message: 'success unzip ' + params[0],
        reslist: unzipres
      })
    } else {
      res.json({
        rescode: -1,
        message: 'fail to unzip ' + params[0]
      })
    }
    break
  case 'download':
    let name = params[2] || surlName(params[0]);
    let key = params[0] + params[1] + name;
    if (statusRPC.download.has(key)) {
      return res.json({
        rescode: 1,
        message: `${name} already in download list, try different folder or name`,
        resdata: name
      });
    }
    let downloaditem = {
      url: params[0],
      name: name,
      folder: params[1],
      status: 'downloading'
    }
    statusRPC.download.set(key, downloaditem);
    downloadfile(params[0], {
      folder: params[1],
      name: name
    }, (options)=>{
      if (params[3] && options.progress) {
        sseSer.Send(params[3], {
          method: 'message',
          params: [
            options.progress,
            { mid: 'progress' + statusRPC.download.size }
          ]
        });
      }
    }).then(dest=>{
      res.json({
        rescode: 0,
        message: 'file download to: ' + dest,
        resdata: dest
      });
      downloaditem.status = 'finished';
    }).catch(e=>{
      res.json({
        rescode: -1,
        message: `${params[1] || ''} ${errStack(e)}`
      });
      downloaditem.status = 'aborted';
    })
    break
  default:
    clog.info('RPC method', method, 'not found')
    res.status(501).json({
      rescode: 501,
      message: `method ${method || ''} not found`
    })
  }
}

module.exports = app => {
  app.post("/rpc", eRPC);
  app.get("/rpc/:status", (req, res)=>{
    switch (req.params.status) {
    case 'downloadlist':
      res.json({
        rescode: 0,
        message: 'Get current efss download list',
        resdata: sJson(statusRPC.download)
      });
      break;
    default:
      res.json({
        rescode: -1,
        message: 'unknow rpc status ' + req.params.status
      })
    }
  });
  app.get("/sse/elecV2P/:sid", (req, res)=>{
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache'
    });
    let target = req.params.sid;
    if (sseSer.clients.has(target)) {
      clog.info('end old sse connection', target);
      sseSer.clients.get(target).end();
    }
    sseSer.clients.set(target, res);
    clog.info('sse connection', target, 'connected, total connections', sseSer.clients.size);
    req.on('close', ()=>{
      sseSer.clients.delete(target);
      clog.info('sse connection', target, 'closed, total connections', sseSer.clients.size);
    })
  });
}