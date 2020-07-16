const { runJSFile } = require('./runJSFile')

const { logger } = require('../utils')
const clog = new logger({ head: 'eV2PRules' })

const { wsSer } = require('../func/websocket')

const CONFIG_RULE = (()=>{
  const fs = require('fs')
  const path = require('path')
  if (!fs.existsSync(path.join(__dirname, 'Lists'))) {
    fs.mkdirSync(path.join(__dirname, 'Lists'))
    clog.notify('暂无规则，新建 Lists 文件夹')
    return {}
  }

  function getUserAgent() {
    let uagent = {}
    if (fs.existsSync(path.join(__dirname, 'Lists', "useragent.list"))) {
      try {
        uagent = JSON.parse(fs.readFileSync(path.join(__dirname, 'Lists', "useragent.list"), "utf8"))
      } catch(e) {
        clog.error('User-Agent 获取失败')
      }
    }
    return { uagent }
  }

  function getRewriteList() {
    let subrules = []
    let rewritelists = []
    if (fs.existsSync(path.join(__dirname, 'Lists', 'rewrite.list'))) {
      fs.readFileSync(path.join(__dirname, 'Lists', 'rewrite.list'), 'utf8').split(/\r|\n/).forEach(l=>{
        if (/^(#|\[)/.test(l) || l.length<2) return
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
    if (fs.existsSync(path.join(__dirname, 'Lists', 'default.list'))) {
      fs.readFileSync(path.join(__dirname, 'Lists', 'default.list'), 'utf8').split(/\n|\r/).forEach(l=>{
        if (l.length<=8 || /^(#|\[)/.test(l)) return
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
    if (fs.existsSync(path.join(__dirname, 'Lists', 'mitmhost.list'))) {
      mitmhost = fs.readFileSync(path.join(__dirname, 'Lists', 'mitmhost.list'), 'utf8').split(/\r|\n/).filter(host=>{
        if (/^(\[|#|;)/.test(host) || host.length < 3) {
          return false
        }
        return true
      })
    }
    return { mitmhost }
  }

  let config = {
      mitmtype: 'list',
      ...getRulesList(),
      ...getRewriteList(),
      ...getMitmhost(),
      ...getUserAgent()
    }

  clog.notify(`default 规则 ${ config.reqlists.length + config.reslists.length } 条`)
  clog.notify(`rewrite 规则 ${ config.rewritelists.length } 条`)
  clog.notify(`MITM hosts ${ config.mitmhost.length } 个`)

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
  return typeof(body) === 'object' ? (Buffer.isBuffer(body) ? body.toString() : JSON.stringify(body)) : body
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
    body: formBody($response.body)
  }
}

module.exports = {
  summary: 'elecV2P - customize personal network',
  CONFIG_RULE,
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
      clog.notify('waiting $HOLD request results')
      return new Promise((resolve, reject) => {
        wsSer.recv.hold = res => {
          wsSer.recv.hold = null
          if (res.reject) {
            clog.notify('request $HOLD reject', res.body)
            delete res.reject
            return resolve({ response: Object.assign(localResponse.reject, res) })
          }
          requestDetail.requestOptions.headers = res.header
          requestDetail.requestData = res.body
          if (res.request) Object.assign(requestDetail.requestOptions, res.request)
          clog.notify('request $HOLD done')
          resolve(requestDetail)
        }

        if (Number(matchreq[3]) > 0) {
          setTimeout(()=>{
            wsSer.recv.hold = null
            wsSer.send({ type: 'hold', data: 'over' })
            clog.notify('$HOLD timeout, continue with orignal data')
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
      clog.info(matchreq[2], "重定向至", matchreq[3])
      return {
        response: {
          statusCode: matchreq[2],
          header: { Location: matchreq[3] }
        }
      }
    }
    // 通过 JS 文件修改请求体
    if ('js' === matchreq[2] ) {
      return new Promise(async (resolve, reject)=>{
        let jsres = runJSFile(matchreq[3], { $request: formRequest(requestDetail) })
        if (jsres instanceof Promise) {
          jsres = await jsres.catch(()=>{
            resolve(requestDetail)
          })
        }
        if (jsres) {
          if (jsres.response) {
            // 直接返回结果，不访问目标网址
            clog.notify('返回结果:', jsres.response)
            resolve({ 
              response: Object.assign(localResponse.reject, jsres.response) 
            })
          }
          // 请求信息修改
          if (jsres["User-Agent"]) {
            clog.notify("User-Agent 设置为: " + jsres["User-Agent"])
            requestDetail.requestOptions.headers["User-Agent"] = jsres["User-Agent"]
          } else if (jsres.body) {
            clog.notify("request body changed")
            requestDetail.requestData = jsres.body
          } else {
            Object.assign(requestDetail.requestOptions, jsres)
          }
        }
        resolve(requestDetail)
      })
    }
    if ("ua" === matchreq[2]) {
      requestDetail.requestOptions.headers['User-Agent'] = CONFIG_RULE.uagent[matchreq[3]].header
      clog.info("User-Agent 设置为：" + CONFIG_RULE.uagent[matchreq[3]])
      return requestDetail
    }
  },
  *beforeSendResponse(requestDetail, responseDetail) {
    const $request = requestDetail
    const $response = responseDetail.response

    for (let r of CONFIG_RULE.rewritelists) {
      if ((new RegExp(r[0])).test($request.url)) {
        clog.info('match rewrite rules:', r[0], r[1])
        return new Promise(async (resolve, reject)=>{
          let jsres = runJSFile(r[1], { $request: formRequest($request), $response: formResponse($response) })
          if (jsres instanceof Promise) {
            jsres = await jsres.catch(()=>{
              resolve({ response: $response })
            })
          }
          Object.assign($response, jsres ? (jsres.response ? jsres.response : jsres) : {})
          resolve({ response: $response })
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
      clog.info(matchres[2], "重定向至", matchres[3])
      return {
        response: {
          statusCode: matchres[2],
          header: { Location: matchres[3] }
        }
      }
    }
    if (matchres[2] === "js") {
      return new Promise(async (resolve, reject)=>{
        let jsres = runJSFile(matchres[3], { $request: formRequest($request), $response: formResponse($response) })
        if (jsres instanceof Promise) {
          jsres = await jsres.catch(()=>{
            resolve({ response: $response })
          })
        }
        Object.assign($response, jsres ? (jsres.response ? jsres.response : jsres) : {})
        resolve({ response: $response })
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