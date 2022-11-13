const express = require('express')
const formidable = require('formidable')

const { logger, file, sType, sbufBody, errStack, now } = require('../utils')
const clog = new logger({ head: 'wbefss', level: 'debug' })

const { CONFIG, CONFIG_Port } = require('../config')
const { runJSFile, getJsResponse } = require('../script')

const CONFIG_efss = {
  enable: true,            // 默认开启。关闭： false
  directory: './efss',     // 文件存储位置
  dotshow: {
    enable: false,         // 显示 dot(.) 开头文件
  },
  max: 600,                // 最大文件显示数。默认：600，-1 表示不限制
  skip: {                  // 跳过显示部分文件/文件夹
    folder: ['node_modules'],
    file: []
  },
  favend: {                // favend 设置
    efh: {
      key: "efh",
      name: "efh 初版",
      type: "runjs",
      target: "elecV2P.efh",
      enable: true
    },
    test: {
      key: "test",
      name: "测试",
      type: "runjs",
      target: "https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/favend.js",
      enable: true
    },
    logs: {
      key: "logs",
      name: "logs 查看",
      type: "favorite",
      target: "logs",
      enable: true
    },
    shell: {
      key: "shell",
      name: "shell 目录",
      type: "favorite",
      target: "script/Shell",
      enable: true
    }
  },
  favendtimeout: 5000,     // favend runjs timeout
}

CONFIG.efss = Object.assign(CONFIG_efss, CONFIG.efss)

async function efssHandler(req, res, next) {
  clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), req.method, 'efss favend', req.params.favend)
  let fend = CONFIG.efss.favend && CONFIG.efss.favend[req.params.favend]
  let rbody = req.body
  if (!rbody) {
    rbody = req.query
  } else if (sType(rbody) === 'object') {
    Object.assign(rbody, req.query)
  }
  let dotfiles = 'deny'
  if (rbody.dotfiles) {
    dotfiles = rbody.dotfiles !== 'deny' ? 'allow' : 'deny'
  } else {
    dotfiles = (CONFIG.efss.dotshow && CONFIG.efss.dotshow.enable) ?  'allow' : 'deny'
  }
  if (fend && fend.enable !== false) {
    const [pathname, search] = req.originalUrl.split('?')
    switch(fend.type) {
    case 'runjs':
      let $response = {
        statusCode: 200,
        header: {
          'Content-Type': 'text/plain;charset=utf-8',
          'X-Powered-By': 'elecV2P'
        }
      }
      let env = {
          key: req.params.favend,
          name: fend.name
        }
      if (sType(rbody.env) === 'object') {
        Object.assign(env, rbody.env)
      }
      const [host, port] = req.get('host').split(':')
      runJSFile(fend.target, {
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
        from: 'favend', env,
        timeout: rbody.timeout ?? rbody.data?.timeout ?? CONFIG.efss.favendtimeout
      }).then(jsres=>{
        $response = getJsResponse(jsres, $response)
      }).catch(e=>{
        $response.body = `favend error on run script ${fend.target} ${errStack(e)}`
        clog.error($response.body);
      }).finally(()=>{
        res.set($response.header || $response.headers || {'Content-Type': 'text/html;charset=utf-8'})
        res.status($response.statusCode || $response.status || 200).send($response.body)
      })
      break
    case 'favorite':
      let favdir = file.get(fend.target, 'path')
      if (!file.isExist(favdir, true)) {
        return res.status(404).json({
          rescode: 404,
          message: 'directory ' + fend.target + ' not exist'
        })
      }
      if (req.path === '/') {
        let flist = file.list({ folder: favdir, max: rbody.max, dotfiles, detail: true, index: rbody.index ?? 'index.html' })
        if (flist[0]?.index) {
          return /\/$/.test(pathname) ? res.sendFile(favdir + '/' + flist[0].name) : res.redirect(307, req.baseUrl + '/' + (search?'?'+search:''))
        }
        res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'})
        res.write('<head><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><meta name="theme-color" content="#003153"><link rel="apple-touch-icon" href="/efss/logo/elecV2P.png">')
        res.write(`<title>${fend.name} ${flist.length} - EFSS favorite</title><style>.content{display: flex;flex-direction: column;border: 1px solid;border-radius: 8px;}.file {display: inline-flex;flex-wrap: wrap;width: 100%;padding: 6px 8px;color: #1890ff;border-bottom: 1px solid;justify-content: space-between;align-items: center;box-sizing: border-box;}.file:last-child {margin: 0;border-bottom: none;}.file_link {width: 50%;color: #1890ff;text-decoration: none;font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.file_mtime {color: #003153;font-size: 16px;}.file_size {width: 72px;text-align: right;font-size: 15px;color: #003153;}a {text-decoration: none;}@media screen and (max-width: 600px) {.file_mtime {display: none;}}</style></head><body><div class='content'>`)
        flist.forEach(file=>{
          res.write(`<div class='file'><a class='file_link' href='${req.baseUrl}/${file.name}${ dotfiles === 'allow' ? '?dotfiles=allow' : '' }' target='_blank'>${file.name}</a><span class='file_mtime'>${ now(file.mtime, false, 0) }</span><span class='file_size'>${ file.size }</span></div>`)
        })
        return res.end('</div></body>')
      }
      return express.static(favdir, { dotfiles, index: rbody.index })(req, res, next)
    default:
      res.json({
        rescode: -1,
        message: `unknow favend type ${fend.type}`
      })
    }
    return
  }
  clog.debug('favend no match, continue with efss static file')
  let efssdir = file.get(CONFIG.efss.directory, 'path')
  if (!file.isExist(efssdir, true)) {
    return res.status(404).json({
      rescode: 404,
      message: efssdir + ' not exist'
    })
  }
  if (!CONFIG.efss.enable) {
    return res.json({
      rescode: -1,
      message: 'EFSS is disabled'
    })
  }
  req.url = req.originalUrl.replace('/efss', '')
  return express.static(efssdir, { dotfiles, index: rbody.index })(req, res, next)
}

module.exports = app => {
  app.get('/sefss', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get efss resource')

    let resdata = {
      rescode: 0,
      userid: CONFIG_Port.userid,
    }
    if (req.query.type === 'list' || req.query.type !== 'config') {
      resdata.list = CONFIG.efss.enable ? file.aList(file.get(CONFIG.efss.directory, 'path'), {
        max: CONFIG.efss.max,
        dot: CONFIG.efss.dotshow.enable,
        skip: CONFIG.efss.skip
      }) : {}
    }
    if (req.query.type === 'config' || req.query.type !== 'list') {
      resdata.config = CONFIG.efss
    }

    res.json(resdata)
  })

  app.post('/sefss', (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "uploading efss file")

    if (!(CONFIG.efss && CONFIG.efss.enable)) {
      return res.json({
        rescode: 403,
        message: 'efss is closed'
      })
    }
    const efssF = file.get(CONFIG.efss.directory + decodeURI(req.query.subpath || ''), 'path')
    if (!file.isExist(efssF)) {
      clog.error('efss folder:', efssF, 'not exist')
      return res.json({
        rescode: -1,
        message: efssF + ' not exist'
      })
    }
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 200 * 1024 * 1024 // 限制为最大 200M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    // uploadfile.uploadDir = efssF
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error(errStack(err, true))
        return res.json({
          rescode: -1,
          message: 'efss upload fail: ' + err.message
        })
      }

      for (const name in files) {
        const sgfile = files[name]
        clog.notify('upload file:', sgfile.originalFilename, 'to', efssF)
        file.copy(sgfile.filepath, efssF + '/' + sgfile.originalFilename)
      }
      res.json({
        rescode: 0,
        message: 'upload success'
      })
    })
  })

  app.delete('/sefss', (req, res)=>{
    if (!(CONFIG.efss && CONFIG.efss.enable)) {
      return res.json({
        rescode: 403,
        message: 'efss is closed'
      })
    }

    let files = req.body.files
    let folder = CONFIG.efss.directory + req.body.path
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'delete efss files', files, 'on folder', folder)
    if (sType(files) === 'array') {
      let sucdel = [], faildel = []
      files.forEach(fn=>{
        if (file.delete(fn, folder)) {
          sucdel.push(fn)
        } else {
          faildel.push(fn)
        }
      })
      res.json({
        rescode: 0,
        message: (sucdel.length ? `success delete: ${ sucdel.join(', ') }\n` : '') + (faildel.length ? `fail to delete: ${ faildel.join(', ') }` : '')
      })
    } else {
      res.json({
        rescode: -1,
        message: 'a array parameter files is expect'
      })
      clog.error('delete efss files error: a array parameter files is expect')
    }
  })

  app.use("/efss/:favend", efssHandler)
}