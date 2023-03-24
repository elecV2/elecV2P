const { logger, sJson, sUrl, sType, sString, list, wsSer, errStack, sbufBody, htmlTemplate, bBufType } = require('../utils')
const clog = new logger({ head: 'eV2Proxy', level: 'debug' })

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

function setRewriteRule(list = [], rewritereq = [], rewriteres = []) {
  list.forEach(r=>{
    if (!(r.enable !== false && r.match && r.target)) {
      return
    }
    if (r.stage === 'req') {
      rewritereq.push({ match: r.match, target: r.target })
    } else if (r.stage === 'res') {
      rewriteres.push({ match: r.match, target: r.target })
    } else if (/^reject(-200|-dict|-json|-array|-img)?$/.test(r.target)) {
      rewritereq.push({ match: r.match, target: r.target })
    } else {
      rewriteres.push({ match: r.match, target: r.target })
    }
  })
  return [ rewritereq, rewriteres ]
}

const CONFIG_RULE = (()=>{
  function getUserAgent() {
    return {
      uagent: list.get('useragent.list')
    }
  }

  function getRewriteList() {
    let rewritereq = [], rewriteres = []
    let rlist = list.get('rewrite.list')
    let rewriteenable = rlist?.rewrite?.enable !== false
    if (rewriteenable) {
      if (rlist?.rewrite?.list?.length) {
        setRewriteRule(rlist.rewrite.list, rewritereq, rewriteres)
      }
      let rewritesub = rlist?.rewritesub || {}
      Object.keys(rewritesub).forEach(skey=>{
        if (rewritesub[skey].enable && rewritesub[skey]?.list?.length) {
          setRewriteRule(rewritesub[skey].list, rewritereq, rewriteres)
        }
      })
    }
    return { rewriteenable, rewritereq, rewriteres }
  }

  function getRulesList(){
    let reqlists = [], reslists = []
    let robj = list.get('default.list')
    let ruleenable = robj?.rules?.enable !== false
    let ruleenbody = robj?.rules?.enbody === true
    if (ruleenable && robj?.rules?.list?.length) {
      robj.rules.list.filter(r=>r.enable !== false).forEach(r=>{
        if (r.stage === 'req') {
          reqlists.push(r)
        } else {
          reslists.push(r)
        }
      })
    }
    return { ruleenable, ruleenbody, reqlists, reslists }
  }

  function getMitmhost() {
    let mitmhost = []
    let mstr = list.get('mitmhost.list')
    let mitmhostenable = mstr?.enable !== false
    if (mitmhostenable && mstr?.list?.length) {
      mitmhost = mstr.list.filter(host=>host.enable !== false).map(host=>typeof host === 'string' ? host : host.host)
    }
    return { mitmhostenable, mitmhost }
  }

  const config = {
      maxResBytes: 15*1024*1024,      // 当 response.body.byteLength 大于此值时，不进行处理。默认 15M
      mitmtype: 'list',
      cache: {
        host: new Map(),
        rewritereq: new Map(),
        rewriteres: new Map(),
      },
      ...getRulesList(),
      ...getRewriteList(),
      ...getMitmhost(),
      ...getUserAgent()
    }

  if (config.mitmhostenable && config.mitmhost.indexOf('*') !== -1) {
    clog.notify('MITM enabled for all host')
    config.mitmtype = 'all'
  }

  clog.notify(`default rules: ${ config.ruleenable ? (config.reqlists.length + config.reslists.length) : 'disabled' }`)
  clog.notify(`rewrite rules: ${ config.rewriteenable ? (config.rewritereq.length + config.rewriteres.length) : 'disabled' }`)
  clog.notify(`MITM hosts: ${ config.mitmhostenable ? config.mitmhost.length : 'disabled' }`)

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
    body: '{"rescode": 0, "message": "local response from elecV2P"}'
  },
  array: {
    statusCode: 200,
    header: { "Content-Type": "application/json;charset=utf-8" },
    body: '[]'
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
    const amatch = headers.Accept.match(/html|json|plain|image/)
    if (!amatch) {
      return this.reject
    }
    switch (amatch[0]) {
    case 'html':
      return {...this.imghtml, body: sString(body) }
    case 'plain':
      return {...this.reject, body: sString(body) }
    case 'json':
      if (body) {
        return {...this.json, body: sString(body) }
      }
      return this.json
    case 'image':
      return this.tinyimg
    default:
      return this.reject
    }
  }
}

function getMatchRule($request, $response, lists) {
  let matchobj = {
    url: $request.url,
    host: $request.requestOptions.hostname,
    reqmethod: $request.requestOptions.method,
    reqbody: (CONFIG_RULE.ruleenbody && !bBufType($request.requestOptions.headers["Content-Type"])) ? $request.requestData.toString() : "",
    useragent: $request.requestOptions.headers["User-Agent"],
    resstatus: $response ? $response.statusCode : "",
    restype: $response ? $response.header["Content-Type"] : "",
    resbody: (CONFIG_RULE.ruleenbody && $response && !bBufType($response.header["Content-Type"])) ? $response.body.toString() : ""
  }
  for (let mr of lists) {
    // 逐行正则匹配，待优化
    if ((new RegExp(mr.match)).test(matchobj[mr.mtype])) {
      clog.info('match rule:', mr.mtype, mr.match, mr.ctype, mr.target, mr.stage)
      return mr
    }
  }
  clog.debug('no match for:', $request.url, 'skip modify')
  return false
}

function getRewriteRes(rtarget, { rmatch = '', type = 'response', request = {}, response = localResponse, from = '' }) {
  clog.info(request.url, type, 'match rule:', rmatch, rtarget, 'from rewrite', from)
  if (response === localResponse && /\.efh$/.test(rtarget.split(' ')[0])) {
    type = 'response';
    response = localResponse.imghtml;
  }
  if (type === 'request') {
    switch(rtarget) {
    case 'reject':
    case 'reject-200':
      return { response: response.reject }
    case 'reject-dict':
    case 'reject-json':
      return { response: response.json }
    case 'reject-array':
      return { response: response.array }
    case 'reject-img':
      return { response: response.tinyimg }
    default:
      return new Promise((resolve, reject)=>{
        runJSFile(rtarget, {
          from: 'rewriteReq',
          $request: formRequest(request)
        }).then(jsres=>{
          resolve(getJsRequest(jsres, request))
        }).catch(e=>{
          resolve(null)
          clog.error('rewrite', request.url, 'request error on run js', rtarget, errStack(e))
        })
      })
    }
  } else {
    return new Promise((resolve, reject)=>{
      runJSFile(rtarget, {
        from: 'rewriteRes',
        $request: formRequest(request),
        $response: formResponse(response)
      }).then(jsres=>{
        resolve(ruleResponse(jsres, response))
      }).catch(e=>{
        resolve(null)
        clog.error('rewrite', request.url, 'response error on run js', rtarget, errStack(e))
      })
    })
  }
}

function formRequest($request) {
  return {
    ...$request.requestOptions,
    protocol: $request.protocol,
    pathname: $request.requestOptions?.path,
    url: $request.url,
    body: bBufType($request.requestOptions?.headers?.['Content-Type'])
          ? $request.requestData
          : $request.requestData.toString(),
    bodyBytes: $request.requestData
  }
}

function formResponse($response) {
  return {
    statusCode: $response.statusCode,
    status: $response.statusCode,
    headers: $response.header,
    body: bBufType($response.header?.['Content-Type'])
          ? $response.body
          : $response.body.toString(),
    bodyBytes: $response.body
  }
}

function getJsResponse(jsres, orires = { ...localResponse.reject }) {
  if (sType(jsres) === 'object') {
    if (Object.keys(jsres).length === 0) {
      return orires
    }
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
    if (jsres.body === undefined && !jsres.statusCode && !jsres.status && !jsres.header && !jsres.headers) {
      return {
        statusCode: 200,
        header: { ...orires.header, "Content-Type": "application/json;charset=utf-8" },
        body: sbufBody(jsres)
      }
    }
    return {
      statusCode: jsres.statusCode || jsres.status || orires.statusCode,
      header: sJson(jsres.header || jsres.headers) || orires.header,
      body: sbufBody(jsres.bodyBytes || jsres.body) || orires.body
    }
  } else {
    return {
      ...orires,
      body: sbufBody(jsres)
    }
  }
}

function getJsRequest(jsres, requestDetail={}) {
  if (sType(jsres) !== 'object') {
    return {
      response: {
        statusCode: 200,
        header: requestDetail.requestOptions?.headers || { "Content-Type": "text/plain;charset=utf-8" },
        body: sbufBody(jsres)
      }
    }
  }
  if (Object.keys(jsres).length === 0) {
    return null
  }
  if (jsres.response) {
    // 直接返回结果，不访问目标网址
    clog.notify(requestDetail.url, 'request force to local response')
    return {
      response: {
        statusCode: jsres.response.statusCode || jsres.response.status || 200,
        header: sJson(jsres.response.header || jsres.response.headers) || { "Content-Type": "text/html;charset=utf-8" },
        body: sbufBody(jsres.response.bodyBytes || jsres.response.body || jsres.response)
      }
    }
  }
  if (jsres.rescode === -1 && jsres.error) {
    return {
      response: {
        statusCode: 200,
        header: { "Content-Type": "text/plain;charset=utf-8" },
        body: 'error on elecV2P modify request:\n' + (jsres.stack || jsres.error)
      }
    }
  }
  if (jsres.protocol) {
    if (jsres.protocol === requestDetail.protocol) {
      clog.info('current protocol', requestDetail.protocol, 'no need to change')
    } else {
      return {
        protocol: jsres.protocol
      }
    }
  }
  // 请求信息修改
  let newRequest = Object.create(null)
  if (jsres.bodyBytes || jsres.body) {
    clog.notify(requestDetail.url, 'request body changed')
    clog.debug(requestDetail.url, 'request body change to', jsres.bodyBytes || jsres.body)
    newRequest.requestData = sbufBody(jsres.bodyBytes || jsres.body)
  }
  if (jsres.path || jsres.pathname) {
    clog.debug(requestDetail.url, 'request path change to', jsres.path)
    newRequest.requestOptions = { ...requestDetail.requestOptions, path: jsres.path || jsres.pathname }
  }
  if (jsres.method) {
    clog.debug(requestDetail.url, 'request method change to', jsres.method)
    newRequest.requestOptions = { ...(newRequest.requestOptions || requestDetail.requestOptions), method: jsres.method }
  }
  if (sType(jsres.headers || jsres.header) === 'object') {
    clog.debug(requestDetail.url, 'request headers change to', jsres.headers || jsres.header)
    newRequest.requestOptions = { ...(newRequest.requestOptions || requestDetail.requestOptions), headers: jsres.headers || jsres.header }
  }
  return Object.keys(newRequest).length ? newRequest : null
}

function ruleResponse(scriptRes, response) {
  if (sType(scriptRes) === 'object' && Object.keys(scriptRes).length === 0) {
    return null
  } else {
    return { response: getJsResponse(scriptRes, response) }
  }
}

module.exports = {
  summary: 'elecV2P - customize personal network',
  CONFIG_RULE, getJsResponse, setRewriteRule,
  *beforeSendRequest(requestDetail) {
    if (requestDetail.protocol === 'http' && requestDetail._req.url.startsWith('/')) {
      // 禁止直接访问 no direct access to proxy
      return { response: localResponse.get(requestDetail.requestOptions.headers, htmlTemplate(`<h2 style="margin-top: 0;padding-top: 120px;">Congratulations! Anyproxy is enabled. Please use it as a proxy.</h2><p><span>Powered BY </span><a target="_blank" href="https://github.com/elecV2/elecV2P">elecV2P</a></p><p><span>TG Channel </span><a target="_blank" href="https://t.me/elecV2">@elecV2</a></p>`)) }
    }
    if (bCircle.check(requestDetail.requestOptions.hostname + ':' + requestDetail.requestOptions.port)) {
      let error = 'access ' + requestDetail.requestOptions.hostname + ' be blocked, because of visiting over ' + bCircle.max + ' times in ' + bCircle.gap + ' milliseconds'
      clog.error(error)
      return { response: localResponse.get(requestDetail.requestOptions.headers, error) }
    }
    clog.debug('bCircle status:', bCircle.host, `${bCircle.count}/${bCircle.max}`)

    if (CONFIG_RULE.rewriteenable === false) {
      // rewrite 列表不启用时不直接返回，继续 rule 匹配
      clog.debug('rewrite rule not enabled yet')
    } else if (CONFIG_RULE.cache.rewritereq.has(requestDetail.url)) {
      let [rmatch, rtarget] = CONFIG_RULE.cache.rewritereq.get(requestDetail.url) || []
      if (rtarget) {
        return getRewriteRes(rtarget, { rmatch, type: 'request', request: requestDetail, from: 'cache' })
      }
    } else {
      for (let r of CONFIG_RULE.rewritereq) {
        if ((new RegExp(r.match)).test(requestDetail.url)) {
          CONFIG_RULE.cache.rewritereq.set(requestDetail.url, [r.match, r.target])
          return getRewriteRes(r.target, { rmatch: r.match, type: 'request', request: requestDetail })
        }
      }
      if (CONFIG_RULE.cache.rewritereq.size > 1000) {
        CONFIG_RULE.cache.rewritereq.clear()
      }
      CONFIG_RULE.cache.rewritereq.set(requestDetail.url, false)
    }

    if (CONFIG_RULE.ruleenable === false) {
      clog.debug('modify rule not enabled yet')
      return null
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
      if (wsSer.recverlists.size === 0) {
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
            clog.notify(requestDetail.url, '$HOLD timeout of', matchreq.target, 'seconds, continue with original data')
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
          if (/\.efh$/.test(matchreq.target.split(' ')[0])) {
            resolve({ response: getJsResponse(jsres, { ...localResponse.imghtml }) });
          } else {
            resolve(getJsRequest(jsres, requestDetail));
          }
        }).catch(e=>{
          resolve(null)
          clog.error('modify', requestDetail.url, 'request error on run js', matchreq.target, errStack(e))
        })
      })
    }
  },
  *beforeSendResponse(requestDetail, responseDetail) {
    const $response = responseDetail.response

    if ($response.body.byteLength > CONFIG_RULE.maxResBytes) {
      clog.info('response body byteLength:', $response.body.byteLength, 'is bigger than', CONFIG_RULE.maxResBytes, ', skip modify')
      return null
    }

    if (CONFIG_RULE.rewriteenable === false) {
      // rewrite 列表不启用时不直接返回，继续 rule 匹配
      clog.debug('rewrite rule not enabled yet')
    } else if (CONFIG_RULE.cache.rewriteres.has(requestDetail.url)) {
      let [rmatch, rtarget] = CONFIG_RULE.cache.rewriteres.get(requestDetail.url) || []
      if (rtarget) {
        return getRewriteRes(rtarget, { rmatch, request: requestDetail, response: $response, from: 'cache' })
      }
    } else {
      for (let r of CONFIG_RULE.rewriteres) {
        if ((new RegExp(r.match)).test(requestDetail.url)) {
          CONFIG_RULE.cache.rewriteres.set(requestDetail.url, [r.match, r.target])
          return getRewriteRes(r.target, { rmatch: r.match, request: requestDetail, response: $response })
        }
      }
      if (CONFIG_RULE.cache.rewriteres.size > 1000) {
        CONFIG_RULE.cache.rewriteres.clear()
      }
      CONFIG_RULE.cache.rewriteres.set(requestDetail.url, false)
    }

    if (CONFIG_RULE.ruleenable === false) {
      clog.debug('modify rule not enabled yet')
      return null
    }
    let matchres = getMatchRule(requestDetail, $response, CONFIG_RULE.reslists)
    if (!matchres) {
      return null
    }
    if (matchres.ctype === 'hold') {
      if (wsSer.recverlists.size === 0) {
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
            clog.notify('$HOLD timeout, continue with original data')
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
          resolve(ruleResponse(jsres, $response))
        }).catch(e=>{
          resolve(null)
          clog.error('modify', requestDetail.url, 'response error on run js', matchres.target, errStack(e))
        })
      })
    }
    clog.info('unknown match rule type, return the original response')
    return null
  },
  *beforeDealHttpsRequest(requestDetail) {
    if (CONFIG_RULE.mitmhostenable && CONFIG_RULE.mitmtype === 'all') {
      clog.debug('MITM enable for all host')
      return true
    }
    if (bCircle.check(requestDetail.host)) {
      clog.debug('MITM enable for', requestDetail.host, 'from bCircle check')
      return true
    }
    if (CONFIG_RULE.mitmhostenable === false) {
      clog.debug('MITM is disabled, skip deal with https request')
      return false
    }
    if (CONFIG_RULE.cache.host.has(requestDetail.host)) {
      clog.debug('get MITM host', requestDetail.host, 'match result from cache')
      return CONFIG_RULE.cache.host.get(requestDetail.host)
    }
    let host = requestDetail.host.split(':')[0]
    if (CONFIG_RULE.mitmhost.indexOf(host) !== -1) {
      clog.debug('MITM enable for', requestDetail.host, 'from normal mitmhost list')
      CONFIG_RULE.cache.host.set(requestDetail.host, true)
      return true
    }
    // 首次正则逐行匹配
    for (let h of CONFIG_RULE.mitmhost) {
      if (/\*/.test(h) && new RegExp(h.replace(/\./g, '\\.').replace(/\*/g, '.*')).test(host)) {
        clog.debug('MITM enable for', requestDetail.host, 'from regexp mitmhost', h)
        CONFIG_RULE.cache.host.set(requestDetail.host, true)
        return true
      }
    }
    if (CONFIG_RULE.cache.host.size > 2000) {
      CONFIG_RULE.cache.host.clear()
    }
    clog.debug('no match for', requestDetail.host, 'in mitmhost list')
    CONFIG_RULE.cache.host.set(requestDetail.host, false)
    return false
  },
  onError(requestDetail, error) {
    return {
      response: {
        statusCode: 200,
        header: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json;charset=utf-8',
          'X-Powered-By': 'elecV2P',
        },
        body: JSON.stringify({
          rescode: -1,
          message: error.message,
          resdata: {
            error: errStack(error),
            url: requestDetail.url,
            method: requestDetail.requestOptions.method,
            headers: requestDetail.requestOptions.headers,
            body: requestDetail.requestData.byteLength ? requestDetail.requestData.toString() : undefined,
          }
        }, null, 2)
      }
    }
  }
}