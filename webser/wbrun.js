const { logger, sType, sbufBody, errStack } = require('../utils')
const clog = new logger({ head: 'wbrun', level: 'debug' })

const { runJSFile, getJsResponse } = require('../script')
const { CONFIG } = require('../config')

function runHandler(req, res){
  let filename = req.params.filename
  // 子目录文件 test>test.efh
  if (filename) {
    filename = filename.replace(/>/g, '/')
  } else if (req.query.target) {
    filename = decodeURI(req.query.target)
    delete req.query.target
  } else {
    return res.json({
      rescode: -1,
      message: 'a target is expect to run',
    })
  }
  let rbody = req.body
  if (!rbody) {
    rbody = req.query
  } else if (sType(rbody) === 'object') {
    Object.assign(rbody, req.query)
  }
  let $response = {
    statusCode: 200,
    header: {
      'Content-Type': 'text/plain;charset=utf-8',
      'X-Powered-By': 'elecV2P'
    }
  }
  const [host, port] = req.get('host').split(':')
  const [pathname] = req.originalUrl.split('?')
  runJSFile(filename, {
    $request: {
      protocol: req.protocol,
      headers: req.headers,
      method: req.method,
      hostname: req.hostname,
      host: req.get('host'),
      port: Number(port) || (req.protocol === 'http' ? 80 : 443),
      path: pathname,
      pathname: pathname,
      url: `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}${req.originalUrl}`,
      body: sbufBody(rbody),
    },
    from: 'wbrun', env: sType(rbody.env) === 'object' ? rbody.env : null,
    timeout: rbody.timeout ?? CONFIG.efss.favendtimeout
  }).then(jsres=>{
    $response = getJsResponse(jsres, $response)
  }).catch(e=>{
    $response.body = `run script ${filename} ${errStack(e)}`
    clog.error($response.body)
  }).finally(()=>{
    res.set($response.header || $response.headers || {'Content-Type': 'text/html;charset=utf-8'})
    res.status($response.statusCode || $response.status || 200).send($response.body)
  })
}

module.exports = app => {
  app.get('/run', runHandler)
  app.post('/run', runHandler)
  app.get('/run/:filename', runHandler)
  app.post('/run/:filename', runHandler)
}