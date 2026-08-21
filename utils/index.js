const { eproxy } = require('./eproxy')
const { isAuthReq, validate_status } = require('./validate')
const { now, wait, waituntil, hDays } = require('./time')
const { logger, setGlog, LOGFILE } = require('./logger')
const { list, Jsfile, store, file } = require('./file')
const { websocketSer, wsSer, message, sseSer } = require('./websocket')
const { eAxios, axProxy, stream, downloadfile, CONFIG_Axios, checkupdate } = require('./eaxios')
const { euid, sJson, sString, strJoin, bEmpty, sUrl, sType, sBool, errStack, kSize, nStatus, UUID, iRandom, escapeHtml, surlName, progressBar, btoa, atob, sbufBody, sParam, sTypetoExt, sHash, sHmac, htmlTemplate, bBufType } = require('./string')
const { CONFIG_FEED, feedAddItem, iftttPush, barkPush, custPush, feedPush, feedXml, feedClear } = require('./feed')

const clog = new logger({ head: 'elecV2Proc', file: 'elecV2Proc' })

// 全局异常节流：相同堆栈特征在 5 秒内只记一次，避免定时任务裸 Promise 反复刷屏
// 写满 elecV2Proc.log / errors.log
const _errThrottle = new Map()
const _errThrottleMs = 5000
const _errThrottleMax = 500
function _errThrottled(head, estk) {
  const key = head + '::' + String(estk).slice(0, 200)
  const now = Date.now()
  const last = _errThrottle.get(key)
  if (last && now - last < _errThrottleMs) {
    return true  // 跳过
  }
  _errThrottle.set(key, now)
  if (_errThrottle.size > _errThrottleMax) {
    // 防止 Map 无限增长，设上限后清空旧项
    _errThrottle.clear()
    _errThrottle.set(key, now)
  }
  return false
}

process.on('unhandledRejection', err => {
  const estk = errStack(err)
  if (_errThrottled('unhandledRejection', estk)) return
  clog.error('unhandledRejection at Promise', estk)
})

process.on('uncaughtException', err => {
  const estk = errStack(err)
  if (_errThrottled('uncaughtException', estk)) return
  clog.error('Caught exception', estk)
})

process
.on('exit', ()=>console.log(`[elecV2Proc  info][${now()}] elecV2P exited`))
.on('SIGINT', ()=>{
  clog.info('thanks for using, see you next time.')
  process.exit()
})
.on('SIGTERM', ()=>{
  clog.info('thanks for using, see you next time.')
  process.exit()
})

module.exports = {
  eproxy, isAuthReq, validate_status,
  now, wait, waituntil, hDays,
  logger, setGlog, LOGFILE,
  list, Jsfile, store, file,
  websocketSer, wsSer, message, sseSer,
  eAxios, axProxy, stream, downloadfile, CONFIG_Axios, checkupdate,
  euid, sJson, sString, strJoin, bEmpty, sUrl, sType, sBool, errStack, kSize, nStatus, UUID, iRandom, escapeHtml, surlName, progressBar, btoa, atob, sbufBody, sParam, sTypetoExt, sHash, sHmac, htmlTemplate, bBufType,
  CONFIG_FEED, feedAddItem, iftttPush, barkPush, custPush, feedPush, feedXml, feedClear
}