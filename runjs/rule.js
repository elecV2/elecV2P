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
    header: { 'Content-Type': 'text/plain' },
    body: ''
  },
  imghtml: {
    statusCode: 200,
    header: { 'Content-Type': 'text/html; charset=utf-8' },
    body: '<img src="data:image/png;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="elecV2P"/>'
  },
  json: {
    statusCode: 200,
    header: { 'Content-Type': 'application/json' },
    body: '{"data": "elecV2P"}'
  },
  tinyimg: {
    statusCode: 200,
    header: { 'Content-Type': 'image/png' },
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
  return lists.filter(l=>{ return (new RegExp(l[1])).test(matchstr[l[0]]) })
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
    let getr = getrules(requestDetail, null, CONFIG_RULE.reqlists)
    if(getr.length) clog.info("match request modify rules:", getr.length)
    for(let r of getr) {
      if (r[2] === 'hold') {
        if (wsSer.recverlists.length === 0) {
          clog.notify('no websocket connected, skip $HOLD rule')
          return requestDetail
        }
        wsSer.send({
          type: 'hold',
          data: {
            title: r[0] + ' - ' + r[1] + ' (request)',
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
            requestDetail.requestOptions.headers = res.header
            requestDetail.requestData = res.body
            if (res.request) Object.assign(requestDetail.requestOptions, res.request)
            clog.notify('request $HOLD done')
            resolve(requestDetail)
          }

          if (Number(r[3]) > 0) {
            setTimeout(()=>{
              wsSer.recv.hold = null
              wsSer.send({ type: 'hold', data: 'over' })
              clog.notify('$HOLD timeout, continue with orignal data')
              resolve(requestDetail)
            }, Number(r[3]) * 1000)
          }
        })
      }
      if ("block" === r[2]) {
        clog.info("block - " + r[3])
        return { response: localResponse[r[3]] }
      }
      if (/^(30.)$/.test(r[2])) {
        clog.info(r[2], "重定向至", r[3])
        return {
          response: {
            statusCode: r[2],
            header: { Location: r[3] }
          }
        }
      }
      if ("ua" === r[2]) {
        requestDetail.requestOptions.headers['User-Agent'] = CONFIG_RULE.uagent[r[3]].header
        clog.info("User-Agent 设置为：" + CONFIG_RULE.uagent[r[3]])
        continue
      }
      // 通过 JS 文件修改请求体
      if ('js' === r[2] ) {
        let jsres = runJSFile(r[3], { $request: formRequest(requestDetail) })
        if (jsres.response) {
          // 直接返回结果，不访问目标网址
          clog.notify('返回结果:', jsres.response)
          return { 
            response: Object.assign(localResponse.reject, jsres.response) 
          }
        }
        // 请求信息修改
        if (jsres["User-Agent"]) {
          clog.notify("User-Agent 设置为: " + jsres["User-Agent"])
          requestDetail.requestOptions.headers["User-Agent"] = jsres["User-Agent"]
        } else if (jsres.body) {
          clog.notify("body changed")
          requestDetail.requestData = jsres.body
        } else {
          Object.assign(requestDetail.requestOptions, jsres)
        }
      }
    }
    return requestDetail
  },
  *beforeSendResponse(requestDetail, responseDetail) {
    const $request = requestDetail
    const $response = responseDetail.response

    for (let r of CONFIG_RULE.rewritelists) {
      if ((new RegExp(r[0])).test($request.url)) {
        clog.info('match rewrite rules:', r[0], r[1])
        let jsres = runJSFile(r[1], { $request: formRequest($request), $response: formResponse($response) })
        Object.assign($response, jsres ? (jsres.response ? jsres.response : jsres) : {})
        break
      }
    }

    let getr = getrules($request, $response, CONFIG_RULE.reslists)
    if (getr.length) clog.info("match response modify rules:", getr.length)
    for (let r of getr) {
      if (r[2] === 'hold') {
        if (wsSer.recverlists.length === 0) {
          clog.notify('no websocket connected, skip $HOLD rule')
          return { response: $response }
        }
        wsSer.send({
          type: 'hold',
          data: {
            title: r[0] + ' - ' + r[1] + ' (response)',
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

          if (Number(r[3]) > 0) {
            setTimeout(()=>{
              wsSer.recv.hold = null
              wsSer.send({ type: 'hold', data: 'over' })
              clog.notify('$HOLD timeout, continue with orignal data')
              resolve({ response: $response })
            }, Number(r[3]) * 1000)
          }
        })
      } else if ("block" === r[2]) {
        clog.info("block - " + r[3])
        return { response: localResponse[r[3]] }
      } else if (/^(30.)$/.test(r[2])) {
        clog.info(r[2], "重定向至", r[3])
        return {
          response: {
            statusCode: r[2],
            header: { Location: r[3] }
          }
        }
      } else if (r[2] === "js") {
        let jsres = runJSFile(r[3], { $request: formRequest($request), $response: formResponse($response) })
        Object.assign($response, jsres ? (jsres.response ? jsres.response : jsres) : {})
      }
    }

    return { response: $response }
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