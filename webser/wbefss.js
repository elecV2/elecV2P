const formidable = require('formidable')
const express = require('express')
const cheerio = require('cheerio')
const path = require('path')

const { logger, file, sType, sString, errStack, now, Jsfile } = require('../utils')
const clog = new logger({ head: 'wbefss', level: 'debug' })

const { CONFIG } = require('../config')
const { runJSFile, getJsResponse } = require('../script')

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

const efhcache = new Map();

function efsshandler(req, res, next) {
  if (!req.params.favend) {
    return next()
  }
  clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), req.method, 'efss favend', req.params.favend)
  let fend = CONFIG.efss.favend && CONFIG.efss.favend[req.params.favend]
  let rbody = req.body
  if (!rbody) {
    rbody = req.query
  } else if (sType(rbody) === 'object') {
    Object.assign(rbody, req.query)
  }
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
      // .efh 文件测试 初版
      let efhc = { date: 0, html: '', script: '', type: '' };
      if (/\.efh$/.test(fend.target)) {
        if (/^https?:\/\/\S{4}/.test(fend.target)) {
          // 远程 efh 文件，待完成
          efhc.html = 'remote efh file not support yet';
          clog.debug(efhc.html);
        }
        // 本地 efh 文件，先判断 cache 是否存在，再获取内容
        let tdate = Jsfile.get(fend.target, 'date');
        if (efhcache.has(fend.target)) {
          // 有缓存
          efhc = efhcache.get(fend.target);
          if (efhc.date === tdate) {
            clog.debug('run', fend.target, 'with cache');
          } else {
            efhc.html = '';
            efhc.script = '';
          }
        } else {
          efhc.date = tdate;
          efhcache.set(fend.target, efhc)
        }
        if (!efhc.html) {
          let efhcont = Jsfile.get(fend.target);
          if (!efhcont) {
            efhc.html = fend.target + ' not exist';
            clog.debug(efhc.html);
          } else {
            clog.debug('deal', fend.target, 'content');
            let $ = cheerio.load(efhcont);
            let bcode = $("script[runon='elecV2P']");
            if (bcode.attr('src')) {
              // src 开头 /|./|空，即绝对/相对目录处理
              efhc.script = bcode.attr('src');
              if (efhc.script.startsWith('/')) {
                efhc.script = efhc.script.replace('/', '');  // 仅替换开头/
              } else if (!/^https?:\/\/\S{4}/.test(efhc.script)) {
                // 非远程 src，则相对当前 efh 文件
                let lastslash = fend.target.lastIndexOf('/');
                if (lastslash === -1) {
                  efhc.script = path.join(efhc.script);
                } else {
                  efhc.script = path.join(path.dirname(fend.target), efhc.script);
                }
              }
              efhc.type = 'file';
            } else {
              efhc.script = bcode.html();
              efhc.type = 'rawcode';
            }
            bcode.remove();
            efhc.html = $.html();
          }
        }

        if (req.originalUrl.replace(/\/$/, '') === '/efss/' + req.params.favend) {
          // 返回 html
          return res.send(efhc.html);
        } else {
          // 返回 run code 结果（即运行 efh 后台部分代码
          // 进入原来的 JS 处理环节
        }
      }
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
      runJSFile(efhc.script || fend.target, {
        $request: {
          protocol: req.protocol,
          headers: req.headers,
          method: req.method,
          hostname: req.hostname,
          host: req.get('host'),
          path: req.baseUrl + req.path,
          url: `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}${req.originalUrl}`,
          body: sString(rbody),
        },
        from: 'favend', env, type: efhc.type, filename: efhc.type === 'rawcode' ? fend.target : undefined,
        timeout: rbody.timeout === undefined ? CONFIG.efss.favendtimeout : rbody.timeout
      }).then(jsres=>{
        $response = getJsResponse(jsres, $response)
      }).catch(e=>{
        $response.body = `favend error on run js ${fend.target} ${errStack(e)}`
        clog.error('error on run js', fend.target, errStack(e))
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
      let reqfav = '/efss/' + req.params.favend
      if (requrl === reqfav) {
        let flist = file.list({ folder: favdir, max: rbody.max, dotfiles, detail: true })
        res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'})
        res.write('<head><meta name="viewport" content="width=device-width, initial-scale=1.0">')
        res.write(`<title>${fend.name} ${flist.length} - EFSS favorite 目录文件列表</title><style>.content{display: flex;flex-direction: column;border: 1px solid;border-radius: 8px;}.file {display: inline-flex;flex-wrap: wrap;width: 100%;padding: 6px 8px;color: #1890ff;border-bottom: 1px solid;justify-content: space-between;align-items: center;box-sizing: border-box;}.file:last-child {margin: 0;border-bottom: none;}.file_link {width: 50%;color: #1890ff;text-decoration: none;font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;}.file_mtime {color: #003153;font-size: 16px;}.file_size {width: 72px;text-align: right;font-size: 15px;color: #003153;}a {text-decoration: none;}@media screen and (max-width: 600px) {.file_mtime {display: none;}}</style></head><body><div class='content'>`)
        flist.forEach(file=>{
          res.write(`<div class='file'><a class='file_link' href='${reqfav}/${file.name}${ dotfiles === 'allow' ? '?dotfiles=allow' : '' }' target='_blank'>${file.name}</a><span class='file_mtime'>${ now(file.mtime, false) }</span><span class='file_size'>${ file.size }</span></div>`)
        })
        return res.end('</div></body>')
      }
      req.url = requrl.replace(reqfav + '/', '')
      return express.static(favdir, { dotfiles })(req, res, next)
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
    const subpath = decodeURI(req.query.subpath || '')
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 200 * 1024 * 1024 // 限制为最大 200M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    // uploadfile.uploadDir = file.get(CONFIG.efss.directory, 'path')
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error(errStack(err, true))
        return res.json({
          rescode: -1,
          message: 'efss upload fail: ' + err.message
        })
      }

      if (!files.efss) {
        clog.info('no efss file to upload')
        return res.json({
          rescode: -1,
          message: 'a file is expect'
        })
      }
      const efssF = file.get(CONFIG.efss.directory + subpath, 'path')
      if (!file.isExist(efssF)) {
        clog.error('efss folder:', efssF, 'not exist')
        return res.json({
          rescode: -1,
          message: efssF + ' not exist'
        })
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

  // 性能考虑放最后，* 用于匹配多级 path
  app.use("/efss/:favend*", efsshandler)
}