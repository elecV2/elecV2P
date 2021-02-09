const { logger, sJson, sUrl, sType, list, jsfile, wsSer } = require('../utils')
const clog = new logger({ head: 'elecV2P', level: 'debug' })

const { runJSFile } = require('./runJSFile')

const JSLISTS = jsfile.get('list')

const CONFIG_RULE = (()=>{
  function getUserAgent() {
    const ustr = list.get('useragent.list')
    return { uagent: sJson(ustr) || {} }
  }

  function getRewriteList() {
    let subrules = []
    let rewritelists = []
    let rlist = list.get('rewrite.list')
    if (rlist) {
      rlist.split(/\r|\n/).forEach(l=>{
        if (/^(#|\[|\/\/)/.test(l) || l.length<2) return
        let item = l.split(" ")
        if (item.length === 2) {
          if (/^sub/.test(item[0])) {
            subrules.push(item[1])
          } else if (/js$/.test(item[1])) {
            rewritelists.push([item[0], item[1]])
          }
        }
      })
    }

    return { subrules, rewritelists }
  }

  function getRulesList(){
    let reqlists = []
    let reslists = []
    let rstr = list.get('default.list')
    if (rstr) {
      rstr.split(/\n|\r/).forEach(l=>{
        if (l.length<=8 || /^(#|\[|\/\/)/.test(l)) return
        let item = l.split(",")
        if (item.length >= 4) {
          item = item.map(i=>i.trim())
          if (item[4] === "req") reqlists.push(item)
          else reslists.push(item)
        }
      })
    }
    return { reqlists, reslists }
  }

  function getMitmhost() {
    let mitmhost = []
    let mstr = list.get('mitmhost.list')
    if (mstr) {
      mitmhost = mstr.split(/\r|\n/).filter(host=>{
        if (/^(\[|#|;)/.test(host) || host.length < 3) {
          return false
        }
        return true
      })
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
  }
}

function getrules($request, $response, lists) {
  const $req = $request.requestOptions

  const urlObj = new URL($request.url)
  let matchstr = {
    ip: urlObj.hostname,
    url: $request.url,
    host: urlObj.hostname,
    reqmethod: $req.method,
    reqbody: $request.requestData,
    useragent: $req.headers["User-Agent"],
    resstatus: $response?$response.statusCode:"",
    restype: $response?$response.header["Content-Type"]:"",
    resbody: $response?$response.body:""
  }
  for (let mr of lists) {
    if ((new RegExp(mr[1])).test(matchstr[mr[0]])) {
      clog.info("match rule:", mr.join(','))
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
    let matchreq = getrules(requestDetail, null, CONFIG_RULE.reqlists)
    if (!matchreq) return requestDetail
    if (matchreq[2] === 'hold') {
      if (wsSer.recverlists.length === 0) {
        clog.notify('no websocket connected, skip $HOLD rule')
        return requestDetail
      }
      wsSer.send({
        type: 'hold',
        data: {
          title: matchreq[0] + ' - ' + matchreq[1] + ' (request)',
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

        if (Number(matchreq[3]) > 0) {
          setTimeout(()=>{
            wsSer.recv.hold = null
            wsSer.send({ type: 'hold', data: 'over' })
            clog.notify(requestDetail.url, '$HOLD timeout, continue with orignal data')
            resolve(requestDetail)
          }, Number(matchreq[3]) * 1000)
        }
      })
    }
    if ("block" === matchreq[2]) {
      clog.info("block - " + matchreq[3])
      return { response: localResponse[matchreq[3]] }
    }
    if (/^(30.)$/.test(matchreq[2])) {
      const orgurl = sUrl(requestDetail.url)
      const newurl = sUrl(matchreq[3], requestDetail.url)
      if (newurl.hash === '') newurl.hash = orgurl.hash
      if (newurl.search === '') newurl.search = orgurl.search
      if (newurl.pathname === '/') newurl.pathname = orgurl.pathname
      clog.info(requestDetail.url, matchreq[2], "重定向至", newurl.href)
      return {
        response: {
          statusCode: matchreq[2],
          header: { Location: newurl.href }
        }
      }
    }
    // 通过 JS 文件修改请求体
    if ('js' === matchreq[2] ) {
      return new Promise((resolve, reject)=>{
        runJSFile(matchreq[3], { $request: formRequest(requestDetail) }).then(jsres=>{
          if (sType(jsres) !== 'object') return
          if (jsres.response) {
            // 直接返回结果，不访问目标网址
            clog.notify(requestDetail.url, 'request force to local response')
            clog.debug(requestDetail.url, 'response:', jsres.response)
            return resolve({
              response: { ...localResponse.imghtml, ...jsres.response }
            })
          }
          // 请求信息修改
          if (jsres["User-Agent"]) {
            clog.notify(requestDetail.url, "User-Agent set to:", jsres["User-Agent"])
            requestDetail.requestOptions.headers["User-Agent"] = jsres["User-Agent"]
          } else if (jsres.body) {
            clog.notify(requestDetail.url, "request body changed")
            clog.debug(requestDetail.url, 'request body change to', jsres.body)
            requestDetail.requestData = jsres.body
          } else {
            Object.assign(requestDetail.requestOptions, jsres)
          }
        }).catch(e=>{
          clog.error('error on run js', matchreq[3], e)
        }).finally(()=>{
          resolve(requestDetail)
        })
      })
    }
    if ("ua" === matchreq[2]) {
      requestDetail.requestOptions.headers['User-Agent'] = CONFIG_RULE.uagent[matchreq[3]].header
      clog.notify(requestDetail.url, "User-Agent set to", CONFIG_RULE.uagent[matchreq[3]].name)
      return requestDetail
    }
  },
  *beforeSendResponse(requestDetail, responseDetail) {
    const $request = requestDetail
    const $response = responseDetail.response

    for (let r of CONFIG_RULE.rewritelists) {
      if ((new RegExp(r[0])).test($request.url)) {
        clog.info('match rewrite rules:', r[0], r[1])
        return new Promise((resolve, reject)=>{
          runJSFile(r[1], { $request: formRequest($request), $response: formResponse($response) }).then(jsres=>{
            Object.assign($response, jsres ? (jsres.response ? jsres.response : jsres) : {})
          }).catch(e=>{
            clog.error('error on run js', r[1], e)
          }).finally(()=>{
            resolve({ response: $response })
          })
        })
      }
    }

    let matchres = getrules($request, $response, CONFIG_RULE.reslists)
    if (!matchres) return { response: $response }
    if (matchres[2] === 'hold') {
      if (wsSer.recverlists.length === 0) {
        clog.notify('no websocket connected, skip $HOLD rule')
        return { response: $response }
      }
      wsSer.send({
        type: 'hold',
        data: {
          title: matchres[0] + ' - ' + matchres[1] + ' (response)',
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

        if (Number(matchres[3]) > 0) {
          setTimeout(()=>{
            wsSer.recv.hold = null
            wsSer.send({ type: 'hold', data: 'over' })
            clog.notify('$HOLD timeout, continue with orignal data')
            resolve({ response: $response })
          }, Number(matchres[3]) * 1000)
        }
      })
    }
    if ("block" === matchres[2]) {
      clog.info("block - " + matchres[3])
      return { response: localResponse[matchres[3]] }
    }
    if (/^(30.)$/.test(matchres[2])) {
      const orgurl = sUrl(requestDetail.url)
      const newurl = sUrl(matchres[3], requestDetail.url)
      if (newurl.hash === '') newurl.hash = orgurl.hash
      if (newurl.search === '') newurl.search = orgurl.search
      if (newurl.pathname === '/') newurl.pathname = orgurl.pathname
      clog.info(requestDetail.url, matchres[2], "重定向至", newurl.href)
      return {
        response: {
          statusCode: matchres[2],
          header: { Location: newurl.href }
        }
      }
    }
    if (matchres[2] === "js") {
      return new Promise(async (resolve, reject)=>{
        runJSFile(matchres[3], { $request: formRequest($request), $response: formResponse($response) }).then(jsres=>{
          Object.assign($response, jsres ? (jsres.response ? jsres.response : jsres) : {})
        }).catch(e=>{
          clog.error('error on run js', matchres[3], e)
        }).finally(()=>{
          resolve({ response: $response })
        })
      })
    }
  },
  *beforeDealHttpsRequest(requestDetail) {
    if (CONFIG_RULE.mitmtype === 'all') return true
    if (CONFIG_RULE.mitmtype === 'none') return false
    
    let host = requestDetail.host.split(":")[0]
    if (CONFIG_RULE.mitmhost.indexOf(host) !== -1) {
      return true
    } else {
      return (CONFIG_RULE.mitmhost.filter(h=>(/^\*/.test(h) && new RegExp('.' + h + '$').test(host))).length ? true : false)
    }
  }
}