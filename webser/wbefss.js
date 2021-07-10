const formidable = require('formidable')
const express = require('express')

const { logger, file, sType, sString, errStack } = require('../utils')
const clog = new logger({ head: 'wbefss', level: 'debug' })

const { CONFIG } = require('../config')
const { runJSFile } = require('../script')

const CONFIG_efss = {
  enable: true,            // 默认开启。关闭： false
  directory: './efss',     // 文件存储位置
  dotshow: {
    enable: false,         // 显示 dot(.) 开头文件
  },
  max: 600,                // 最大文件显示数。默认：600，-1 表示不限制
  skip: {                  // 跳过显示部分文件/文件夹
    folder: [],
    file: []
  },
  favend: {                // favend 设置
    test: {
      key: "test",
      name: "测试",
      type: "runjs",
      target: "https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/0body.js",
      enable: true
    },
    shell: {
      key: "shell",
      name: "shell目录",
      type: "favorite",
      target: "script/Shell",
      enable: true
    }
  },
  favendtimeout: 5000,     // favend runjs timeout
}

CONFIG.efss = Object.assign(CONFIG_efss, CONFIG.efss)

function efsshandler(req, res, next) {
  // efss efsshandler
  if (!req.params.favend) {
    return next()
  }
  clog.debug('efss favend', req.params.favend, req.originalUrl)
  let fend = CONFIG.efss.favend && CONFIG.efss.favend[req.params.favend]
  let rbody = Object.assign(req.body || {}, req.query || {})
  let requrl = decodeURI(req.originalUrl.split('?')[0].replace(/\/$/, ''))
  let dotfiles = 'deny'
  if (rbody.dotfiles) {
    dotfiles = rbody.dotfiles !== 'deny' ? 'allow' : 'deny'
  } else {
    dotfiles = (CONFIG.efss.dotshow && CONFIG.efss.dotshow.enable) ?  'allow' : 'deny'
  }
  if (fend && fend.enable !== false) {
    switch(fend.type) {
    case 'runjs':
      let $response = {
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        }
      }
      runJSFile(fend.target, {
        $request: {
          protocol: req.protocol,
          headers: req.headers,
          method: req.method,
          hostname: req.hostname,
          host: req.get('host'),
          path: req.path,
          url: `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}${req.originalUrl}`,
          body: rbody,
          key: req.params.favend
        },
        from: 'favend',
        timeout: rbody.timeout === undefined ? CONFIG.efss.favendtimeout : rbody.timeout
      }).then(jsres=>{
        if (sType(jsres) === 'object') {
          Object.assign($response, jsres.response || jsres)
        }
        if ($response.body === undefined) {
          $response.body = jsres
        }
      }).catch(e=>{
        $response.body = `favend error on run js ${fend.target} ${errStack(e)}`
        clog.error('error on run js', fend.target, errStack(e))
      }).finally(()=>{
        res.writeHead($response.statusCode || $response.status || 200, $response.headers || {'Content-Type': 'text/html;charset=utf-8'})
        res.end(sString($response.body))
      })
      break
    case 'favorite':
      let favdir = file.get(fend.target, 'path')
      if (!file.isExist(favdir, true)) {
        return res.end(JSON.stringify({
          rescode: 404,
          message: 'directory ' + fend.target + ' not exist'
        }))
      }
      let reqfav = '/efss/' + req.params.favend
      if (requrl === reqfav) {
        let flist = file.list({ folder: favdir, max: rbody.max, dotfiles })
        res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'})
        res.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
        res.write(`<title>${flist.length} - EFSS favorite ${fend.name} 目录文件列表</title><style>body{border: 1px solid;
  border-radius: 8px;}.item{display: block;color: #1890ff;margin: 6px 0;padding-bottom: 2px;padding-left: 6px;text-decoration: none;border-bottom: 1px solid;font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.item:last-child {margin: 0;border-bottom: none;}</style>`)
        flist.forEach(file=>{
          res.write(`<a class='item' href='${reqfav}/${file}${ dotfiles === 'allow' ? '?dotfiles=allow' : '' }' target='_blank'>${file}</a>`)
        })
        return res.end()
      }
      req.url = requrl.replace(reqfav + '/', '')
      return express.static(favdir, { dotfiles })(req, res, next)
    default:
      res.end(JSON.stringify({
        rescode: -1,
        message: `unknow favend type ${fend.type}`
      }))
    }
    return
  }
  clog.debug('efss favend match none, continue')
  let efssdir = file.get(CONFIG.efss.directory, 'path')
  if (!file.isExist(efssdir, true)) {
    res.writeHead(404)
    return res.end(JSON.stringify({
      rescode: 404,
      message: efssdir + ' not exist'
    }))
  }
  if (!CONFIG.efss.enable) {
    return res.end(JSON.stringify({
      rescode: -1,
      message: 'EFSS is disabled'
    }))
  }
  req.url = requrl.replace('/efss/', '')
  return express.static(efssdir, { dotfiles })(req, res, next)
}

module.exports = app => {
  app.get('/sefss', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get efss resource')

    let resdata = {}
    if (req.query.type === 'list' || req.query.type !== 'config') {
      const efssF = file.get(CONFIG.efss.directory, 'path')
      resdata.list = CONFIG.efss.enable ? file.aList(efssF, { max: CONFIG.efss.max, dot: CONFIG.efss.dotshow.enable, skip: CONFIG.efss.skip }) : {}
    }
    if (req.query.type === 'config' || req.query.type !== 'list') {
      resdata.config = CONFIG.efss
    }

    res.end(JSON.stringify(resdata))
  })

  app.post('/sefss', (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "uploading efss file")

    if (!(CONFIG.efss && CONFIG.efss.enable)) {
      return res.end(JSON.stringify({
        rescode: 403,
        message: 'efss is closed'
      }))
    }
    const subpath = decodeURI(req.query.subpath || '')
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 200 * 1024 * 1024 // 限制为最大 200M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    // uploadfile.uploadDir = file.get(CONFIG.efss.directory, 'path')
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error(errStack(err, true))
        return res.end(JSON.stringify({
          rescode: -1,
          message: 'efss upload fail: ' + err.message
        }))
      }

      if (!files.efss) {
        clog.info('no efss file to upload')
        return res.end(JSON.stringify({
          rescode: -1,
          message: 'a file is expect'
        }))
      }
      const efssF = file.get(CONFIG.efss.directory + subpath, 'path')
      if (!file.isExist(efssF)) {
        clog.error('efss folder:', efssF, 'not exist')
        return res.end(JSON.stringify({
          rescode: -1,
          message: efssF + ' not exist'
        }))
      }
      if (files.efss.length) {
        files.efss.forEach(sgfile=>{
          clog.notify('upload file:', sgfile.name, 'to', efssF)
          file.copy(sgfile.path, efssF + '/' + sgfile.name)
        })
      } else if (files.efss.name) {
        clog.notify('upload a file:', files.efss.name, 'to', efssF)
        file.copy(files.efss.path, efssF + '/' + files.efss.name)
      }
      res.end(JSON.stringify({
        rescode: 0,
        message: 'upload success'
      }))
    })
  })

  app.delete('/sefss', (req, res)=>{
    if (!(CONFIG.efss && CONFIG.efss.enable)) {
      return res.end(JSON.stringify({
        rescode: 403,
        message: 'efss is closed'
      }))
    }

    let fn = req.body.fn
    fn = fn.replace(/^\//, '')
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'delete efss file', fn)
    if (fn) {
      let fpath = file.get(CONFIG.efss.directory + '/' + fn, 'path')
      if (file.delete(fpath)) {
        res.end(JSON.stringify({
          rescode: 0,
          message: fpath + ' is deleted'
        }))
      } else {
        res.end(JSON.stringify({
          rescode: -1,
          message: fpath + ' fail to delete'
        }))
      }
    } else {
      res.end(JSON.stringify({
        rescode: 100,
        message: 'a parameter fn is expect'
      }))
      clog.error('a parameter fn is expect')
    }
  })

  // 性能考虑放最后
  app.use("/efss/:favend*", efsshandler)
}