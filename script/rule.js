const { logger, sJson, sUrl, sType, sString, list, wsSer, errStack, sbufBody } = require('../utils')
const clog = new logger({ head: 'elecV2P', level: 'debug' })

const { runJSFile } = require('./runJSFile')

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
      maxResBytes: 5*1024*1024,      // 当 response.body.byteLength 大于此值时，不进行处理。默认 5M
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

function getMatchRule($request, $response, lists) {
  let matchobj = {
    url: $request.url,
    host: $request.requestOptions.hostname,
    reqmethod: $request.requestOptions.method,
    reqbody: $request.requestData.toString(),
    useragent: $request.requestOptions.headers["User-Agent"],
    resstatus: $response ? $response.statusCode : "",
    restype: $response ? $response.header["Content-Type"] : "",
    resbody: $response ? $response.body.toString() : ""
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

function formRequest($request) {
  return {
    ...$request.requestOptions,
    protocol: $request.protocol,
    url: $request.url,
    body: $request.requestData.toString(),
    bodyBytes: $request.requestData
  }
}

function formResponse($response) {
  return {
    statusCode: $response.statusCode,
    status: $response.statusCode,
    headers: $response.header,
    body: $response.body.toString(),
    bodyBytes: $response.body
  }
}

function getJsResponse(jsres, orires = { ...localResponse.reject }) {
  if (sType(jsres) === 'object') {
    if (jsres.response) {
      return {
        statusCode: jsres.response.statusCode || jsres.response.status || orires.statusCode,
        header: sJson(jsres.response.header || jsres.response.headers) || orires.header,
        body: sbufBody(jsres.response.bodyBytes || jsres.response.body) || orires.body
      }
    }
    if (jsres.rescode === -1 && jsres.error) {
      return {
        statusCode: orires.statusCode,
        header: orires.header,
        body: 'error on run js to make response:\n' + (jsres.stack || jsres.error)
      }
    }
    // 返回结果修改
    return {
      statusCode: jsres.statusCode || jsres.status || orires.statusCode,
      header: sJson(jsres.header || jsres.headers) || orires.header,
      body: sbufBody(jsres.bodyBytes || jsres.body) || orires.body
    }
  } else {
    orires.body = sbufBody(jsres)
    return orires
  }
}

module.exports = {
  summary: 'elecV2P - customize personal network',
  CONFIG_RULE, getJsResponse,
  *beforeSendRequest(requestDetail) {
    if (bCircle.check(requestDetail.requestOptions.hostname)) {
      let error = 'access ' + requestDetail.requestOptions.hostname + ' be blocked, because of visiting over ' + bCircle.max + ' times in ' + bCircle.gap + ' milliseconds'
      clog.error(error)
      return { response: localResponse.get(requestDetail.requestOptions.headers, error) }
    }
    clog.debug('bCircle status:', bCircle.max, bCircle.count, bCircle.host)

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

    let matchreq = getMatchRule(requestDetail, null, CONFIG_RULE.reqlists)
    if (!matchreq) {
      // 不做任何处理
      return null
    }
    if ('block' === matchreq.ctype) {
      clog.notify(requestDetail.url, 'block, type:', matchreq.target)
      return { response: localResponse[matchreq.target] }
    }
    if ('ua' === matchreq.ctype) {
      requestDetail.requestOptions.headers['User-Agent'] = CONFIG_RULE.uagent[matchreq.target]?.header
      clog.notify(requestDetail.url, 'User-Agent set to', CONFIG_RULE.uagent[matchreq.target]?.name)
      return {
        requestOptions: requestDetail.requestOptions
      }
    }
    if ('hold' === matchreq.ctype) {
      if (wsSer.recverlists.length === 0) {
        clog.notify('no websocket connected, skip $HOLD rule')
        return null
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
          if (res.request) {
            Object.assign(requestDetail.requestOptions, res.request)
          }
          clog.notify(requestDetail.url, 'request $HOLD done')
          resolve({
            requestData: res.body,
            requestOptions: requestDetail.requestOptions
          })
        }

        if (Number(matchreq.target) > 0) {
          setTimeout(()=>{
            resolve(null)
            wsSer.recv.hold = null
            wsSer.send({ type: 'hold', data: 'over' })
            clog.notify(requestDetail.url, '$HOLD timeout of', matchreq.target, 'seconds, continue with orignal data')
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
        runJSFile(matchreq.target, {
          from: 'ruleReq',
          $request: formRequest(requestDetail)
        }).then(jsres=>{
          if (sType(jsres) !== 'object') {
            return resolve({
              response: {
                statusCode: 200,
                header: { "Content-Type": "text/plain;charset=utf-8" },
                body: sbufBody(jsres)
              }
            })
          }
          if (Object.keys(jsres).length === 0) {
            return resolve(null)
          }
          if (jsres.response) {
            // 直接返回结果，不访问目标网址
            clog.notify(requestDetail.url, 'request force to local response')
            clog.debug(requestDetail.url, 'response:', jsres.response)
            return resolve({
              response: {
                statusCode: jsres.response.statusCode || jsres.response.status || 200,
                header: sJson(jsres.response.header || jsres.response.headers) || { "Content-Type": "text/html;charset=utf-8" },
                body: sbufBody(jsres.response.bodyBytes || jsres.response.body)
              }
            })
          }
          if (jsres.rescode === -1 && jsres.error) {
            return resolve({
              response: {
                statusCode: 200,
                header: { "Content-Type": "text/plain;charset=utf-8" },
                body: 'error on elecV2P modify rule: ' + matchreq.target + '\n' + (jsres.stack || jsres.error)
              }
            })
          }
          if (jsres.protocol) {
            if (jsres.protocol === requestDetail.protocol) {
              clog.info('current protocol', requestDetail.protocol, 'no need to change')
            } else {
              return resolve({
                protocol: jsres.protocol
              })
            }
          }
          // 请求信息修改
          if (jsres.bodyBytes || jsres.body) {
            clog.notify(requestDetail.url, 'request body changed')
            clog.debug(requestDetail.url, 'request body change to', jsres.bodyBytes || jsres.body)
            requestDetail.requestData = sbufBody(jsres.bodyBytes || jsres.body)
          }
          if (jsres.path) {
            clog.debug(requestDetail.url, 'request path change to', jsres.path)
            requestDetail.requestOptions.path = jsres.path
          }
          if (jsres.method) {
            clog.debug(requestDetail.url, 'request method change to', jsres.method)
            requestDetail.requestOptions.method = jsres.method
          }
          if (sType(jsres.headers) === 'object') {
            clog.debug(requestDetail.url, 'request headers change to', jsres.headers)
            requestDetail.requestOptions.headers = jsres.headers
          }
          resolve({ requestData, requestOptions } = requestDetail)
        }).catch(e=>{
          resolve(null)
          clog.error('error on run js', matchreq.target, errStack(e))
        })
      })
    }
  },
  *beforeSendResponse(requestDetail, responseDetail) {
    const $response = responseDetail.response

    if (/^(audio|video)|(ogg|stream)$/.test($response.header['Content-Type'])) {
      // 跳过音/视频类数据处理
      clog.info('skip modify audio or video response content')
      return null
    }

    if ($response.body.byteLength > CONFIG_RULE.maxResBytes) {
      clog.info('response body is bigger than', CONFIG_RULE.maxResBytes, 'skip modify')
      return null
    }

    for (let r of CONFIG_RULE.rewritelists) {
      if ((new RegExp(r.match)).test(requestDetail.url)) {
        clog.info('match rewrite rule:', r.match, r.target)
        return new Promise((resolve, reject)=>{
          runJSFile(r.target, {
            from: 'rewrite',
            $request: formRequest(requestDetail),
            $response: formResponse($response)
          }).then(jsres=>{
            resolve({ response: getJsResponse(jsres, $response) })
          }).catch(e=>{
            resolve(null)
            clog.error('error on run js', r.target, errStack(e))
          })
        })
      }
    }

    let matchres = getMatchRule(requestDetail, $response, CONFIG_RULE.reslists)
    if (!matchres) {
      return null
    }
    if (matchres.ctype === 'hold') {
      if (wsSer.recverlists.length === 0) {
        clog.notify('no websocket connected, skip $HOLD rule')
        return null
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
            resolve(null)
            wsSer.recv.hold = null
            wsSer.send({ type: 'hold', data: 'over' })
            clog.notify('$HOLD timeout, continue with orignal data')
          }, Number(matchres.target) * 1000)
        }
      })
    }
    if ('block' === matchres.ctype) {
      clog.info(requestDetail.url, 'block, type', matchres.target)
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
      clog.info(requestDetail.url, matchres.ctype, 'redirect to', newurl.href)
      return {
        response: {
          statusCode: matchres.ctype,
          header: { Location: newurl.href }
        }
      }
    }
    if (matchres.ctype === 'js') {
      return new Promise((resolve, reject)=>{
        runJSFile(matchres.target, {
          from: 'ruleRes',
          $request: formRequest(requestDetail),
          $response: formResponse($response)
        }).then(jsres=>{
          resolve({ response: getJsResponse(jsres, $response) })
        }).catch(e=>{
          resolve(null)
          clog.error('error on run js', matchres.target, errStack(e))
        })
      })
    }
    clog.info('unknown match rule type, return the orignal response')
    return null
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
    
    let host = requestDetail.host.split(':')[0]
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