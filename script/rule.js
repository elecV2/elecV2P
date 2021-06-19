const { logger, sJson, sUrl, sType, sString, list, Jsfile, wsSer, errStack } = require('../utils')
const clog = new logger({ head: 'elecV2P', level: 'debug' })

const { runJSFile } = require('./runJSFile')

const JSLISTS = Jsfile.get('list')

const bCircle = {
  max: 50,      // 单位时间内对同一个 host 最大的请求数
  gap: 1000,    // 单位时间，ms
  host: '',     // 上一个请求 host
  start: Date.now(),
  count: 0,     // 当前已请求数
  check(host){
    if (host !== this.host) {
      this.host = host
      this.count = 0
      this.start = Date.now()
      return false
    }
    if (Date.now() - this.start >= this.gap) {
      this.count = 0
      return false
    }
    this.count++
    if (this.count >= this.max) {
      this.count = 0
      return true
    }
    return false
  }
}

const CONFIG_RULE = (()=>{
  function getUserAgent() {
    let ustr = list.get('useragent.list')
    return { 
      uagent: sJson(ustr) || {
        "iPhone": {
          "name": "iPhone 6s",
          "header": "Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1"
        },
        "chrome": {
          "name": "chrome85 win10",
          "header": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36"
        }
      }
    }
  }

  function getRewriteList() {
    let rewritelists = []
    let rewritereject = []
    let rlist = list.get('rewrite.list')
    if (rlist && rlist.rewrite && rlist.rewrite.list) {
      rlist.rewrite.list.filter(r=>r.enable !== false).forEach(r=>{
        if (/^reject(-200|-dict|-json|-array|-img)?$/.test(r.target)) {
          rewritereject.push(r)
        } else {
          rewritelists.push(r)
        }
      })
    }

    return { rewritereject, rewritelists }
  }

  function getRulesList(){
    let reqlists = []
    let reslists = []
    let robj = list.get('default.list')
    if (robj && robj.rules && robj.rules.list) {
      robj.rules.list.filter(r=>r.enable !== false).forEach(r=>{
        if (r.stage === 'req') {
          reqlists.push(r)
        } else {
          reslists.push(r)
        }
      })
    }
    return { reqlists, reslists }
  }

  function getMitmhost() {
    let mitmhost = []
    let mstr = list.get('mitmhost.list')
    if (mstr && mstr.list) {
      mitmhost = mstr.list.filter(host=>host.enable !== false).map(host=>typeof host === 'string' ? host : host.host)
    }
    return { mitmhost }
  }

  const config = {
      mitmtype: 'list',
      ...getRulesList(),
      ...getRewriteList(),
      ...getMitmhost(),
      ...getUserAgent()
    }

  clog.notify(`default rules: ${ config.reqlists.length + config.reslists.length }`)
  clog.notify(`rewrite rules: ${ config.rewritelists.length }`)
  clog.notify(`MITM hosts: ${ config.mitmhost.length }`)

  return config
})();

const localResponse = {
  reject: {
    statusCode: 200,
    header: { "Content-Type": "text/plain;charset=utf-8" },
    body: ''
  },
  imghtml: {
    statusCode: 200,
    header: { "Content-Type": "text/html;charset=utf-8" },
    body: '<img src="data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="elecV2P"/>'
  },
  json: {
    statusCode: 200,
    header: { "Content-Type": "application/json;charset=utf-8" },
    body: '{"data": "elecV2P"}'
  },
  tinyimg: {
    statusCode: 200,
    header: { "Content-Type": "image/png" },
    body: Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64')
  },
  get(headers, body) {
    if (!(headers && headers.Accept)) {
      if (body) {
        return {...this.reject, body: sString(body) }
      }
      return this.reject
    }
    if (headers.Accept.includes('json')) {
      if (body) {
        return {...this.json, body: sString(body) }
      }
      return this.json
    }
    if (headers.Accept.includes('image')) {
      if (body) {
        return {...this.tinyimg, body }
      }
      return this.tinyimg
    }
    return this.reject
  }
}

function getrules($request, $response, lists) {
  let matchobj = {
    url: $request.url,
    host: $request.requestOptions.hostname,
    reqmethod: $request.requestOptions.method,
    reqbody: $request.requestData,
    useragent: $request.requestOptions.headers["User-Agent"],
    resstatus: $response ? $response.statusCode : "",
    restype: $response ? $response.header["Content-Type"] : "",
    resbody: $response ? $response.body : ""
  }
  for (let mr of lists) {
    // 逐行正则匹配，待优化
    if ((new RegExp(mr.match)).test(matchobj[mr.mtype])) {
      clog.info("match rule:", mr.mtype, mr.match, mr.ctype, mr.target, mr.stage)
      return mr
    }
  }
  return false
}

function formBody(body) {
  // 因为 null/undefined，不要用 sString 替换
  return sType(body) === 'object' ? JSON.stringify(body) : String(body)
}

function formRequest($request) {
  return {
    ...$request.requestOptions,
    url: $request.url,
    body: formBody($request.requestData),
  }
}

function formResponse($response) {
  return {
    ...$response,
    headers: $response.header,
    body: formBody($response.body)
  }
}

module.exports = {
  summary: 'elecV2P - customize personal network',
  CONFIG_RULE,
  JSLISTS,
  *beforeSendRequest(requestDetail) {
    if (bCircle.check(requestDetail.requestOptions.hostname)) {
      let error = 'access ' + requestDetail.requestOptions.hostname + ' be blocked, because of visiting over ' + bCircle.max + ' times in ' + bCircle.gap + ' milliseconds'
      clog.error(error)
      return { response: localResponse.get(requestDetail.requestOptions.headers, error) }
    }
    clog.debug(bCircle.max, bCircle.count, bCircle.host)

    for (let r of CONFIG_RULE.rewritereject) {
      if ((new RegExp(r.match)).test(requestDetail.url)) {
        clog.info('match rewrite reject rule:', r.match, r.target)
        switch(r.target) {
        case 'reject':
        case 'reject-200':
          return { response: localResponse.reject }
        case 'reject-dict':
        case 'reject-json':
          return { response: localResponse.json }
        case 'reject-array':
          return { response: localResponse.get(requestDetail.requestOptions.headers, '[]') }
        case 'reject-img':
          return { response: localResponse.tinyimg }
          break
        default:
          clog.error('unknow rewrite reject target', r.target)
        }
      }
    }

    let matchreq = getrules(requestDetail, null, CONFIG_RULE.reqlists)
    if (!matchreq) {
      return requestDetail
    }
    if ("block" === matchreq.ctype) {
      clog.info("block - " + matchreq.target)
      return { response: localResponse[matchreq.target] }
    }
    if ("ua" === matchreq.ctype) {
      requestDetail.requestOptions.headers['User-Agent'] = CONFIG_RULE.uagent[matchreq.target].header
      clog.notify(requestDetail.url, "User-Agent set to", CONFIG_RULE.uagent[matchreq.target].name)
      return requestDetail
    }
    if (matchreq.ctype === 'hold') {
      if (wsSer.recverlists.length === 0) {
        clog.notify('no websocket connected, skip $HOLD rule')
        return requestDetail
      }
      wsSer.send({
        type: 'hold',
        data: {
          title: matchreq.mtype + ' - ' + matchreq.match + ' (request)',
          request: {
            method: requestDetail.requestOptions.method,
            hostname: requestDetail.requestOptions.hostname,
            port: requestDetail.requestOptions.port,
            path: requestDetail.requestOptions.path
          },
          header: requestDetail.requestOptions.headers,
          body: requestDetail.requestData.toString()
        }
      })
      clog.notify(requestDetail.url, 'waiting $HOLD request results')
      return new Promise((resolve, reject) => {
        wsSer.recv.hold = res => {
          wsSer.recv.hold = null
          if (res.reject) {
            clog.notify('request $HOLD local response', res.body)
            return resolve({ 
              response: {
                statusCode: 200,
                header: { ...localResponse.reject.header, ...res.header },
                body: res.body
              }
            })
          }
          requestDetail.requestOptions.headers = res.header
          requestDetail.requestData = res.body
          if (res.request) {
            Object.assign(requestDetail.requestOptions, res.request)
          }
          clog.notify(requestDetail.url, 'request $HOLD done')
          resolve(requestDetail)
        }

        if (Number(matchreq.target) > 0) {
          setTimeout(()=>{
            wsSer.recv.hold = null
            wsSer.send({ type: 'hold', data: 'over' })
            clog.notify(requestDetail.url, '$HOLD timeout, continue with orignal data')
            resolve(requestDetail)
          }, Number(matchreq.target) * 1000)
        }
      })
    }
    if (/^(30.)$/.test(matchreq.ctype)) {
      const orgurl = sUrl(requestDetail.url)
      const newurl = sUrl(matchreq.target, requestDetail.url)
      if (newurl.hash === '') {
        newurl.hash = orgurl.hash
      }
      if (newurl.search === '') {
        newurl.search = orgurl.search
      }
      if (newurl.pathname === '/') {
        newurl.pathname = orgurl.pathname
      }
      clog.info(requestDetail.url, matchreq.ctype, "redirect to", newurl.href)
      return {
        response: {
          statusCode: matchreq.ctype,
          header: { Location: newurl.href }
        }
      }
    }
    // 通过 JS 文件修改请求体
    if ('js' === matchreq.ctype ) {
      return new Promise((resolve, reject)=>{
        runJSFile(matchreq.target, { $request: formRequest(requestDetail) }).then(jsres=>{
          if (sType(jsres) !== 'object') {
            return resolve({
              response: { ...localResponse.reject, body: sString(jsres) }
            })
          }
          if (jsres.response) {
            // 直接返回结果，不访问目标网址
            clog.notify(requestDetail.url, 'request force to local response')
            clog.debug(requestDetail.url, 'response:', jsres.response)
            jsres.response.body = formBody(jsres.response.body)
            return resolve({
              response: { ...localResponse.imghtml, ...jsres.response }
            })
          }
          if (jsres.rescode === -1 && jsres.error) {
            return resolve({
              response: { ...localResponse.reject, body: 'error on elecV2P modify rule: ' + matchreq.target + '\n' + (jsres.stack || jsres.error) }
            })
          }
          // 请求信息修改
          if (jsres["User-Agent"] || jsres["user-agent"]) {
            clog.notify(requestDetail.url, "User-Agent set to:", jsres["User-Agent"] || jsres["user-agent"])
            requestDetail.requestOptions.headers["User-Agent"] = jsres["User-Agent"] || jsres["user-agent"]
          } else if (jsres.body) {
            clog.notify(requestDetail.url, "request body changed")
            clog.debug(requestDetail.url, 'request body change to', jsres.body)
            requestDetail.requestData = formBody(jsres.body)
          } else {
            Object.assign(requestDetail.requestOptions, jsres)
          }
        }).catch(e=>{
          clog.error('error on run js', matchreq.target, errStack(e))
        }).finally(()=>{
          resolve(requestDetail)
        })
      })
    }
  },
  *beforeSendResponse(requestDetail, responseDetail) {
    const $request = requestDetail
    const $response = responseDetail.response

    for (let r of CONFIG_RULE.rewritelists) {
      if ((new RegExp(r.match)).test($request.url)) {
        clog.info('match rewrite rule:', r.match, r.target)
        return new Promise((resolve, reject)=>{
          runJSFile(r.target, { $request: formRequest($request), $response: formResponse($response) }).then(jsres=>{
            if (sType(jsres) === 'object') {
              Object.assign($response, jsres.response || jsres)
            } else {
              $response.body = sString(jsres)
            }
          }).catch(e=>{
            $response.body += '\nerror on run js' + r.target + errStack(e)
            clog.error('error on run js', r.target, errStack(e))
          }).finally(()=>{
            resolve({ response: $response })
          })
        })
      }
    }

    let matchres = getrules($request, $response, CONFIG_RULE.reslists)
    if (!matchres) {
      return { response: $response }
    }
    if (matchres.ctype === 'hold') {
      if (wsSer.recverlists.length === 0) {
        clog.notify('no websocket connected, skip $HOLD rule')
        return { response: $response }
      }
      wsSer.send({
        type: 'hold',
        data: {
          title: matchres.mtype + ' - ' + matchres.match + ' (response)',
          header: $response.header,
          body: $response.body.toString()
        }
      })
      clog.notify('waiting $HOLD response results')
      return new Promise((resolve, reject) => {
        wsSer.recv.hold = res => {
          wsSer.recv.hold = null
          Object.assign($response, res)
          clog.notify('response $HOLD done')
          resolve({ response: $response })
        }

        if (Number(matchres.target) > 0) {
          setTimeout(()=>{
            wsSer.recv.hold = null
            wsSer.send({ type: 'hold', data: 'over' })
            clog.notify('$HOLD timeout, continue with orignal data')
            resolve({ response: $response })
          }, Number(matchres.target) * 1000)
        }
      })
    }
    if ("block" === matchres.ctype) {
      clog.info("block - " + matchres.target)
      return { response: localResponse[matchres.target] }
    }
    if (/^(30.)$/.test(matchres.ctype)) {
      const orgurl = sUrl(requestDetail.url)
      const newurl = sUrl(matchres.target, requestDetail.url)
      if (newurl.hash === '') {
        newurl.hash = orgurl.hash
      }
      if (newurl.search === '') {
        newurl.search = orgurl.search
      }
      if (newurl.pathname === '/') {
        newurl.pathname = orgurl.pathname
      }
      clog.info(requestDetail.url, matchres.ctype, "redirect to", newurl.href)
      return {
        response: {
          statusCode: matchres.ctype,
          header: { Location: newurl.href }
        }
      }
    }
    if (matchres.ctype === "js") {
      return new Promise(async (resolve, reject)=>{
        runJSFile(matchres.target, { $request: formRequest($request), $response: formResponse($response) }).then(jsres=>{
          if (sType(jsres) === 'object') {
            Object.assign($response, jsres.response || jsres)
          } else {
            $response.body = sString(jsres)
          }
        }).catch(e=>{
          clog.error('error on run js', matchres.target, errStack(e))
        }).finally(()=>{
          resolve({ response: $response })
        })
      })
    }
    clog.info('unknown match rule type, return the orignal response')
    return { response: $response }
  },
  *beforeDealHttpsRequest(requestDetail) {
    if (CONFIG_RULE.mitmtype === 'all') {
      return true
    }
    if (bCircle.check(requestDetail.host)) {
      return true
    }
    if (CONFIG_RULE.mitmtype === 'none') {
      return false
    }
    
    let host = requestDetail.host.split(":")[0]
    if (CONFIG_RULE.mitmhost.indexOf(host) !== -1) {
      return true
    }
    // 正则匹配，待优化
    for (let h of CONFIG_RULE.mitmhost) {
      if (/\*/.test(h) && new RegExp(h.replace(/\./g, '\\.').replace(/\*/g, '.*')).test(host)) {
        return true
      }
    }
    return false
  }
}