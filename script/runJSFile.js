const vm = require('vm')
const path = require('path')
const cheerio = require('cheerio')
const EventEmitter = require('events')

const { logger, feedAddItem, now, sType, sString, surlName, euid, errStack, downloadfile, Jsfile, file, wsSer, sParam, eAxios, sHash } = require('../utils')
const clog = new logger({ head: 'runJSFile', level: 'debug' })

const vmEvent = new EventEmitter()
vmEvent.on('error', err=>clog.error(errStack(err)))

const { context } = require('./context')
const { CONFIG, CONFIG_Port } = require('../config')

const CONFIG_RUNJS = {
  timeout: 5000,          // 脚本运行超时时间。单位：毫秒
  intervals: 86400,       // 远程脚本最低更新时间间隔。单位：秒。 默认：86400(一天)。0: 有则不更新
  numtofeed: 50,          // 每运行 { numtofeed } 次脚本, 添加一个 Feed item。0: 不通知

  jslogfile: true,        // 是否将脚本运行日志保存到 logs 文件夹
  eaxioslog: false,       // 打印/保存网络请求 url 到日志
  proxy: true,            // 是否应用网络请求设置中的代理（如有）

  white: {                // 白名单脚本。放行所有网络请求，不进行屏蔽检测
    enable: false,
    list: []
  }
}

// 同步 CONFIG 数据
CONFIG.CONFIG_RUNJS = Object.assign(CONFIG_RUNJS, CONFIG.CONFIG_RUNJS)

const efhcache = new Map();
const scriptcache = new Map();

// 初始化脚本运行
if (CONFIG.init?.runjs && CONFIG.init.runjsenable !== false) {
  CONFIG.init.runjs.split(/ ?, ?|，/).filter(s=>s).forEach(js=>{
    runJSFile(js, { from: 'initialization' })
  })
}

// websocket/通知触发脚本
wsSer.recv.runjs = (data={})=>runJSFile(data.fn, data.addContext)

const runstatus = {
  start: now(),
  times: CONFIG_RUNJS.numtofeed,
  detail: {},
  total: 0
}

/**
 * 脚本运行次数统计
 * @param  {string}    filename     脚本文件名
 * @return {none}
 */
async function taskCount(filename) {
  if (CONFIG_RUNJS.numtofeed === 0) {
    clog.debug(filename, 'skip count run times by set')
    return
  }
  if (/test/.test(filename)) {
    clog.debug(filename, 'match key word: test, skip count run times')
    return
  }
  if (runstatus.detail[filename]) {
    runstatus.detail[filename]++
  } else {
    runstatus.detail[filename] = 1
  }
  runstatus.total++
  runstatus.times--

  wsSer.send({
    type: 'jsrunstatus',
    data: { total: runstatus.total, detail: runstatus.detail }
  })

  clog.debug('script run status:', runstatus)
  if (runstatus.times === 0) {
    let des = []
    for (let jsname in runstatus.detail) {
      des.push(`${jsname}: ${runstatus.detail[jsname]}`)
    }
    runstatus.detail = {}
    feedAddItem('run script ' + CONFIG_RUNJS.numtofeed + ' times', des.join(', ') + ` from ${runstatus.start}`)
    runstatus.times = CONFIG_RUNJS.numtofeed
    runstatus.start = now()
  }
}

/**
 * 远程文件 filename 是否需要更新
 * @param     {string}    filename    文件名称
 * @return    {boolean}               true or false
 */
function bOutDate(filename) {
  return CONFIG_RUNJS.intervals > 0 && new Date().getTime() - Jsfile.get(filename, 'date') > CONFIG_RUNJS.intervals*1000;
}

/**
 * efh 文件处理
 * @param     {string}    filename    efh 文件
 * @param     {object}    options     title: efh html 缺省 title
 * @return    {object}                efh 文件处理结果 { html, script }
 */
async function efhParse(filename, { title='', type='', name } = {}) {
  let efhc = { name: '', date: 0, html: '', script: '', type: '' };
  if (type !== 'rawcode' && /^https?:\/\/\S{4}/.test(filename)) {
    // 远程 efh 文件
    let furl = filename.split(' ')[0];
    filename = name || surlName(furl);
    let efhfulpath = Jsfile.get(filename, 'path');
    let efhIsExist = file.isExist(efhfulpath);
    if (efhIsExist && type === 'local') {
      clog.info('run', filename, 'locally');
    } else if (!efhIsExist || bOutDate(filename)) {
      clog.info('downloading', filename, 'from', furl);
      try {
        await downloadfile(furl, { name: efhfulpath });
        clog.info(`success download ${filename}, ready to run`);
      } catch(error) {
        clog.error(`run ${furl}, error: ${error}`);
        clog.info(`try to run ${filename} locally`);
      }
    }
  } else {
    if (type === 'rawcode') {
      efhc.html = filename
      filename  = name || 'rawcode.efh'
    } else if (name) {
      filename = name;
    }
  }
  // 本地 efh 文件，先判断 cache 是否存在，再处理内容
  let tdate = type === 'rawcode' ? 0 : Jsfile.get(filename, 'date');
  if (tdate && efhcache.has(filename)) {
    efhc = efhcache.get(filename);
    if (efhc.date === tdate) {
      clog.info('run', filename, 'with cache');
    } else {
      // 非最新文件缓存，清空内容
      efhc.date = tdate;
      efhc.html = '';
      efhc.script = '';
    }
  } else if (tdate) {
    efhc.date = tdate;
    efhcache.set(filename, efhc);
  }
  efhc.name = filename;
  if (type === 'rawcode' || !efhc.html) {
    let efhcont = efhc.html;
    if (type !== 'rawcode') {
      efhcont = Jsfile.get(filename);
    }
    if (!efhcont) {
      efhc.html = filename + ' not exist';
      clog.info(efhc.html);
    } else {
      clog.info('deal', filename, 'content');
      let $ = cheerio.load(efhcont);
      if (title && $('title').length === 0) {
        $('head').append('<title>' + title + '</title>');
      }
      $('head').append(`<script>function $fend(key, data){if(!key) {let msg='a key for $fend is expect';alert(msg);return Promise.reject(msg)};return fetch('', {method: 'post',headers: {'Content-Type': 'application/json'},body: JSON.stringify({key, data})})};let $=(s,a='')=>a?document.querySelectorAll(s):document.querySelector(s);</script>`);
      let bcode = $("script[favend]");
      if (bcode.length === 0) {
        bcode = $("script[runon='elecV2P']");
        if (bcode.length === 0) {
          bcode = $("script[runon='backend']");
        }
      }
      if (bcode.attr('src')) {
        // src 开头 /|./|空，即绝对/相对目录处理
        efhc.script = bcode.attr('src');
        if (efhc.script.startsWith('/')) {
          efhc.script = efhc.script.replace('/', '');  // 仅替换开头/
        } else if (!/^https?:\/\/\S{4}/.test(efhc.script)) {
          // 非远程 src，则相对当前 efh 文件
          let lastslash = filename.lastIndexOf('/');
          if (lastslash === -1) {
            efhc.script = path.join(efhc.script);
          } else {
            efhc.script = path.join(path.dirname(filename), efhc.script);
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
  return efhc;
}

/**
 * 脚本执行函数
 * @param  {string} filename   脚本文件名
 * @param  {string} jscode     脚本执行代码
 * @param  {object} addContext 附加执行参数 context
 * @return {promise}     脚本执行结果
 */
function runJS(filename, jscode, addContext={}) {
  if (!filename || !jscode) {
    clog.error('some script code are expect')
    return Promise.resolve('no script code to run')
  }
  clog.notify('run', filename, 'from', addContext.from)
  taskCount(filename)

  let fconsole = null,
      bGrant   = false
  if (/^\/\/ +@grant/m.test(jscode)) {
    bGrant = true

    // 日志显示类型判断
    if (/^\/\/ +@grant +(still|silent)$/m.test(jscode)) {
      clog.notify('log of', filename, 'is disabled')
      fconsole = { log(){},err(){},info(){},error(){},notify(){},debug(){},clear(){} }
    } else if (/^\/\/ +@grant +calm$/m.test(jscode)) {
      clog.notify('log of', filename, 'keep in file, but no stdout')
      fconsole = new logger({ head: filename, level: 'error', file: CONFIG_RUNJS.jslogfile ? filename : false })
    }
  }
  if (sType(fconsole) !== 'object') {
    fconsole = new logger({ head: filename, level: 'debug', file: CONFIG_RUNJS.jslogfile ? filename : false, cb: addContext.cb })
  }
  const CONTEXT = new context({ fconsole, name: filename })
  CONTEXT.final.__dirname  = Jsfile.get(filename, 'dir')
  CONTEXT.final.__filename = Jsfile.get(filename, 'path')
  CONTEXT.final.__taskname = addContext.__taskname
  CONTEXT.final.__taskid   = addContext.__taskid
  CONTEXT.final.require = (request)=>{
    fconsole.notify('require external resource:', request)
    request = require.resolve(request, { paths: [CONTEXT.final.__dirname] })
    return require(request)
  }
  CONTEXT.final.require.resolve = (request)=>require.resolve(request, { paths: [CONTEXT.final.__dirname] })
  CONTEXT.final.require.clear = (request)=>delete require.cache[require.resolve(request, { paths: [CONTEXT.final.__dirname] })]
  CONTEXT.final.require.cache = require.cache

  let addtimeout = addContext.timeout, addfrom = addContext.from;
  switch (addfrom) {
  case 'feedPush':
    CONTEXT.final.$feed.push = ()=>fconsole.notify(filename, 'is triggered by notification, $feed.push is disabled to avoid circle callback');
    break;
  default:
    break;
  }
  CONTEXT.final.$env = {
    ...process.env,
    lang: CONFIG.lang,
    userid: CONFIG_Port.userid,
    vernum: CONFIG_Port.vernum,
    version: CONFIG_Port.version,
    ...addContext.env,
    ...addContext.$env,
  }
  CONTEXT.final.$fend.clear = ()=>{
    fconsole.info('efh file cache cleared');
    efhcache.clear();
  }

  if (bGrant) {
    if (/^\/\/ +@grant +(quiet|silent)$/m.test(jscode)) {
      fconsole.notify('default notification is disabled for script', filename);
      CONTEXT.final.$feed = { push(){}, bark(){}, ifttt(){}, cust(){} };
      if (CONTEXT.final.$notify) {
        CONTEXT.final.$notify = ()=>{};
      }
      if (CONTEXT.final.$notification) {
        CONTEXT.final.$notification.post = ()=>{};
      }
    }

    // sudo 模式
    if (/^\/\/ +@grant +sudo$/m.test(jscode)) {
      fconsole.notify(filename, 'run in sudo mode');
      CONTEXT.final.$task = require('../func').taskMa;
      CONTEXT.final.$webhook = (type, data=null) => {
        const payload = {
          token: CONFIG.wbrtoken,
        };
        if (sType(type) === 'object') {
          Object.assign(payload, type);
        } else {
          payload.type = type;
        }
        if (data && sType(data) === 'object') {
          Object.assign(payload, data);
        };
        if (payload.type === 'runjs' && addfrom === 'webhook') {
          let msg = `${filename} run from webhook, $webhook type runjs is disabled`;
          fconsole.error(msg);
          return Promise.reject(Error(msg));
        }
        fconsole.notify('$webhook function run, type:', payload.type)
        return eAxios({
          url: `${CONFIG.webUI.tls?.enable ? 'https' : 'http'}://localhost:${CONFIG_Port.webst}/webhook`,
          method: 'post',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8'
          },
          data: payload
        }, false);
      };
    }
  }

  delete addContext.cb
  delete addContext.env
  delete addContext.$env
  delete addContext.type
  delete addContext.from
  delete addContext.rename
  delete addContext.timeout
  delete addContext.__taskid
  delete addContext.__taskname
  Object.assign(CONTEXT.final, addContext)

  return new Promise((resolve, reject)=>{
    try {
      // 判断脚本中是否使用 $done 函数（待优化多选注释
      let bDone = /^(?!\/\/).*\$(done|fend)/m.test(jscode);
      let tout = addtimeout ?? CONFIG_RUNJS.timeout;
      if (bDone) {
        CONTEXT.final.ok = filename + '-' + euid(2) + '-' + Date.now()
        let vmtout = null
        if (tout > 0) {
          vmtout = setTimeout(()=>{
            let message = `run ${filename} timeout of ${tout} ms`
            if (addtimeout !== undefined) {
              message = `${filename} still running after ${tout}ms...`
            }
            if (addfrom === 'favend') {
              message += `\ncheck the favend setting on webUI/efss`
            }
            vmEvent.emit(CONTEXT.final.ok, message)
            clog.debug(message)
          }, tout)
        }

        vmEvent.once(CONTEXT.final.ok, (data)=>{
          resolve(data)
          clearTimeout(vmtout)
        })
        CONTEXT.final.$vmEvent = vmEvent
      }
      let option = {
        filename, timeout: tout > 0 ? Number(tout) : undefined,
        breakOnSigint: true
      }
      let result = vm.runInNewContext(jscode, CONTEXT.final, option)

      if (bDone === false) {
        resolve(result)
      }
    } catch(error) {
      let result = { error: error.message }
      if (/^(ruleReq|ruleRes|rewrite|webhook|favend)/.test(addfrom)) {
        result.rescode = -1
        result.stack = error.stack
      }
      resolve(result)
      fconsole.error(error.stack)
    }
  })
}

/**
 * runJSFile 函数 获取初始的 filename rawcode addContext
 * @param     {string}    filename      文件名。当 addContext.type = rawcode 时表示此项为原生代码
 * @param     {object}    addContext    附加环境变量 context
 * @return    {Promise}                 runJS() 的结果
 */
async function runJSFile(filename, addContext={}) {
  if (sType(filename) !== 'string' || (filename = filename.trim()) === '') {
    return Promise.resolve('a script filename or code is expect')
  }
  if (sType(addContext) !== 'object') {
    return Promise.resolve('type of addContext must be object')
  }
  if (sType(addContext.env) !== 'object') {
    addContext.env = {}
  }
  if (addContext.$request?.headers) {
    const header = Object.create(null)
    const headers = addContext.$request.headers
    for (let key in headers) {
      header[key.toLowerCase()] = headers[key]
    }
    addContext.$request.headers = new Proxy(header, {
      get(target, prop){
        if (typeof(prop) !== 'string') return Reflect.get(target, prop)
        return target[prop] ?? target[prop.toLowerCase()]
      }
    })
  }
  if (addContext.$response?.headers) {
    const header = Object.create(null)
    const headers = addContext.$response.headers
    for (let key in headers) {
      header[key.toLowerCase()] = headers[key]
    }
    addContext.$response.headers = new Proxy(header, {
      get(target, prop){
        if (typeof(prop) !== 'string') return Reflect.get(target, prop)
        return target[prop] ?? target[prop.toLowerCase()]
      }
    })
  }

  // filename 附带参数处理
  if (addContext.type !== 'rawcode' && / -/.test(filename)) {
    let { local, timeout, rename, fstr } = sParam(filename);
    if (local) {
      addContext.type = 'local';
    }
    if (timeout !== undefined) {
      addContext.timeout = timeout;
    }
    if (rename) {
      addContext.rename = rename;
    }
    filename = fstr;
    // -grant 参数添加
    let comp = filename.match(/ -grant(=| )([^\- ]+)/)
    if (comp && comp[2]) {
      addContext.grant = comp[2]
      filename = filename.replace(/ -grant(=| )([^\- ]+)/, '')
    }
    // -env 参数处理
    let jobenvs = filename.split(' -env ')
    if (jobenvs[1] !== undefined) {
      let envlist = jobenvs[1].trim().split(' ')
      envlist.forEach(ev=>{
        let ei = ev.match(/(.*?)=(.*)/)
        if (ei?.length === 3) {
          addContext.env[ei[1]] = decodeURI(ei[2])
        }
      })
      filename = jobenvs[0]
    }
  }
  // end filename 附带参数处理

  let runclog = addContext.cb
      ? new logger({ head: addContext.from + 'RunJS', level: 'debug', file: CONFIG_RUNJS.jslogfile ? (addContext.rename || addContext.filename || (/^https?:/.test(filename) && surlName(filename)) || ((addContext.type === 'rawcode') && (addContext.from || 'rawcode.js')) || filename) : false, cb: addContext.cb })
      : clog;
  if (/\.efh$/.test(addContext.rename || addContext.filename || filename)) {
    // 直接运行 efh 文件初版。本地/远程/rawcode 命名
    let efhname = addContext.rename || addContext.filename || filename;
    let efhc = await efhParse(filename, {
      type: addContext.type,
      name: addContext.rename || addContext.filename,
      title: efhname,
    })
    if (addContext.env.runon === 'backend' || (efhc.script && addContext.$request?.method === 'POST')) {
      runclog.debug('run', efhname, 'backend code from', addContext.from);
      filename = efhc.script;
      addContext.type = efhc.type;
      addContext.filename = efhname;
    } else {
      runclog.debug('send', efhname, 'html directly');
      return new Promise(resolve=>{
        if (/^(rule|rewrite|favend|wbrun)/.test(addContext.from)) {
          resolve({response: {
            statusCode: 200,
            header: { ...addContext.$response?.headers, "Content-Type": "text/html;charset=utf-8" },
            body: efhc.html
          }})
        } else {
          resolve(efhc.html);
        }
        let res = efhc.html;
        if (CONFIG.gloglevel === 'debug') {
          runclog.debug(`run ${efhname} result: ${res.slice(0, 1200)}`);
          return;
        }
        if (res.length > 480) {
          res = res.slice(0, 480) + '...';
        }
        runclog.info(`run ${efhname} result: ${res}`);
      })
    }
  }
  if (/^https?:\/\/\S{4}/.test(filename)) {
    let furl = filename;
    filename = addContext.rename || surlName(furl);
    if (!/\.js$/i.test(filename)) {
      filename += '.js'
    }
    let jsfulpath = Jsfile.get(filename, 'path')
    let jsIsExist = file.isExist(jsfulpath)
    if (jsIsExist && addContext.type === 'local') {
      runclog.info('run', filename, 'locally')
    } else if (!jsIsExist || addContext.from === 'webhook' || bOutDate(filename)) {
      runclog.info('downloading', filename, 'from', furl)
      try {
        await downloadfile(furl, { name: jsfulpath });
        runclog.info(`success download ${filename}, ready to run`)
      } catch(error) {
        runclog.error(`run ${furl}, error: ${error}`);
        runclog.info(`try to run ${filename} locally`)
      }
    }
  }

  let rawcode = ''
  if (addContext.type === 'rawcode') {
    rawcode = filename
    filename = addContext.filename || addContext.from || 'rawcode.js'
    addContext.__md5hash = sHash(rawcode)
  } else {
    let sdate = Jsfile.get(filename, 'date'), scache = {
      name: filename,
      date: 0,
      code: '',
      hash: '',
    }
    if (scriptcache.has(filename)) {
      scache = scriptcache.get(filename)
      if (scache.date === sdate) {
        clog.debug(`get ${filename} from cache`)
        rawcode = scache.code
      } else {
        // cache outdate
        scache.date = 0
      }
    }
    if (sdate === false) {
      runclog.error(`${filename} not exist`)
      return Promise.resolve(`${filename} not exist`)
    }
    if (scache.date === 0) {
      clog.debug(`get ${filename} raw code`)
      rawcode = Jsfile.get(filename)
      scache.date = sdate
      scache.code = rawcode
      scache.hash = sHash(rawcode)
      scriptcache.set(filename, scache)
    }
    addContext.__md5hash = scache.hash || sHash(rawcode)
  }
  if (addContext.rename) {
    Jsfile.put(addContext.rename, rawcode);
    filename = addContext.rename
  }
  if (sType(addContext.grant) === 'string') {
    let grantcode = ''
    addContext.grant.split('|').forEach(val=>{
      if (val) {
        grantcode += '\n// @grant ' + val
      }
    })
    rawcode += grantcode
    delete addContext.grant
  }
  if (!/\.(js|efh)$/i.test(filename)) {
    filename += '.js'
  }

  return new Promise((resolve, reject)=>{
    runJS(filename, rawcode, addContext).then(res=>{
      resolve(res)
      if (res !== undefined) {
        res = sString(res)
        if (CONFIG.gloglevel === 'debug') {
          runclog.debug(`run ${filename} result: ${res.slice(0, 1200)}`)
          return
        }
        if (res.length > 480) {
          res = res.slice(0, 480) + '...'
        }
        runclog.info(`run ${filename} result: ${res}`)
      }
    }).catch(e=>{
      resolve(e.message)
      runclog.error(`run ${filename}, error: ${errStack(e)}`)
    })
  })
}

module.exports = { runJSFile, CONFIG_RUNJS }