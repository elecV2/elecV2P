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

process.on('unhandledRejection', err => {
  clog.error('unhandledRejection at Promise', errStack(err))
})

process.on('uncaughtException', err => {
  clog.error('Caught exception', errStack(err))
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