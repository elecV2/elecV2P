const formidable = require('formidable')

const { logger, file, errStack } = require('../utils')
const clog = new logger({ head: 'wbefss' })

const { CONFIG } = require('../config')

const CONFIG_efss = {
  max: 200,        // 最大文件显示数
  deep: -1,        // 显示文件的最大目录深度。-1: 所有子文件夹，0: 不显示，1: 显示1级目录文件。
}

module.exports = app => {
  app.get('/efss', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'get efss resource')

    if (CONFIG.efss.enable === false) {
      res.end('efss is closed!')
      return
    }
    const efssF = file.get(CONFIG.efss.directory, 'path')
    if (!file.isExist(efssF)) {
      clog.error('efss folder dont exist')
      res.end(efssF + ' dont exist')
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
    res.write(`<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no, minimal-ui">
    <title>elecV2P file storage system</title>
    <style>
      .efss {--main-bk: #003153;--main-fc: #F8F8FF;--secd-fc: #000000a6;--btn-bk: #E0F0E9;font-family: 'Microsoft YaHei', -apple-system, Arial;}
      .efss_form {display: flex;box-sizing: border-box;padding: 6px;justify-content: space-around;height: 52px;border-radius: 8px;border: 1px solid var(--main-bk);}
      .efss_file {overflow: hidden;width: 60%;height: 100%;font-size: 16px;}
      .efss_file::-webkit-file-upload-button {visibility: hidden;}
      .efss_file:before {content: '选择文件';display: inline-flex;width: 108px;padding: 6px 12px;align-items: center;justify-content: space-around;vertical-align: middle;border-radius: 8px;outline: none;white-space: nowrap;-webkit-user-select: none;cursor: pointer;font-size: 18px;text-align: center;box-sizing: border-box;background: var(--btn-bk);color: var(--secd-fc);}
      .efss_submit {border: none;background: var(--main-bk);color: var(--main-fc);padding: 6px 16px;border-radius: 8px;font-size: 16px;}
      .efssa{display: flex;justify-content: space-between;align-items: center;word-break: break-all;margin: 6px 0;padding: 1px;font-size: 18px;font-family: 'Microsoft YaHei', -apple-system, Arial;text-decoration: none;background: #FFF;color: #003153;border-bottom: 1px solid #00315388;}
      .efss_span{font-size:14px;width: 86px;text-align: right;}
      .efssa:hover>.efss_span{opacity:.6}
    </style>
    </head>
    <body><div class='efss'><form action="/efss" enctype="multipart/form-data" method="post" class="efss_form"><input type="file" name="efss" multiple="multiple" class="efss_file"><input type="submit" value="开始上传" class="efss_submit"></form>`)
    file.aList(efssF, { deep: CONFIG_efss.deep, limit: CONFIG_efss.max }).forEach(fpath=>{
      const spath = fpath.path.replace(efssF, '').slice(1).replace(/\\/g, '/')
      res.write(`<a class='efssa' href='/efss/${ spath }' target='_blank'>${ spath } <span class='efss_span'>${ fpath.size }</span></a>`)
    })
    res.end('</div></body>')
  })

  app.post('/efss', (req, res)=>{
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "uploading efss file")
    const uploadfile = new formidable.IncomingForm()
    uploadfile.maxFieldsSize = 200 * 1024 * 1024 // 限制为最大 200M
    uploadfile.keepExtensions = true
    uploadfile.multiples = true
    // uploadfile.uploadDir = file.get(CONFIG.efss.directory, 'path')
    uploadfile.parse(req, (err, fields, files) => {
      if (err) {
        clog.error(errStack(err, true))
        res.end('efss upload fail!' + err.message)
        return
      }

      if (!files.efss) {
        clog.info('no efss file to upload.')
        res.end('a file is expect.')
        return
      }
      const efssF = file.get(CONFIG.efss.directory, 'path')
      if (files.efss.length) {
        files.efss.forEach(sgfile=>{
          clog.notify('upload file:', sgfile.name, 'to efss')
          file.copy(sgfile.path, efssF + '/' + sgfile.name)
        })
      } else if (files.efss.name) {
        clog.notify('upload a file:', files.efss.name, 'to efss')
        file.copy(files.efss.path, efssF + '/' + files.efss.name)
      }
      // res.end('upload success!')
      res.redirect('/efss')
    })
  })

  app.delete('/efss', (req, res)=>{
    const fn = req.body.fn
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), "delete efss file", fn)
    if (fn) {
      if (file.delete(fn, file.get(CONFIG.efss.directory, 'path'))) {
        res.end(fn + ' is deleted!')
        clog.info(fn, 'is deleted!')
      } else {
        res.end(fn + ' not existed!')
        clog.info(fn, 'not existed!')
      }
    } else {
      res.end('a parameter fn is expect.')
      clog.error('a file name is expect.')
    }
  })
}