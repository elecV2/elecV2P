const { eproxy } = require('./eproxy')
const { now, wait, waituntil } = require('./time')
const { logger, setGlog, LOGFILE } = require('./logger')
const { list, Jsfile, store, file } = require('./file')
const { websocketSer, wsSer, message } = require('./websocket')
const { eAxios, axProxy, stream, downloadfile, CONFIG_Axios, checkupdate } = require('./eaxios')
const { euid, sJson, sString, bEmpty, sUrl, sType, sBool, errStack, kSize, nStatus, UUID, iRandom, escapeHtml, surlName, progressBar, btoa, atob } = require('./string')
const { CONFIG_FEED, feedAddItem, iftttPush, barkPush, custPush, feedPush, feedXml, feedClear } = require('./feed')

const clog = new logger({ head: 'elecV2Proc', file: 'elecV2Proc' })

process.on('unhandledRejection', err => {
  clog.error('unhandledRejection at Promise', err.stack)
})

process.on('uncaughtException', err => {
  clog.error('Caught exception', err.stack)
})

process
.on('exit', ()=>console.log('elecV2P exited.'))
.on('SIGINT', ()=>{
  clog.info('thanks for using, see you next time.')
  process.exit()
})
.on('SIGTERM', ()=>{
  clog.info('thanks for using, see you next time.')
  process.exit()
})

module.exports = {
  eproxy,
  now, wait, waituntil,
  logger, setGlog, LOGFILE,
  list, Jsfile, store, file,
  websocketSer, wsSer, message,
  eAxios, axProxy, stream, downloadfile, CONFIG_Axios, checkupdate,
  euid, sJson, sString, bEmpty, sUrl, sType, sBool, errStack, kSize, nStatus, UUID, iRandom, escapeHtml, surlName, progressBar, btoa, atob,
  CONFIG_FEED, feedAddItem, iftttPush, barkPush, custPush, feedPush, feedXml, feedClear
}