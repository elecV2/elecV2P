const { now, wait } = require('./time')
const { logger, setGlog, LOGFILE } = require('./logger')
const { list, jsfile, store, file } = require('./file')
const { eAxios, downloadfile, CONFIG_Axios } = require('./eaxios')
const { euid, sJson, sString, bEmpty, sUrl, sType, errStack, nStatus, UUID, iRandom, escapeHtml } = require('./string')
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
  now, wait,
  eAxios, CONFIG_Axios,
  logger, setGlog, LOGFILE,
  list, jsfile, store, file, downloadfile,
  euid, sJson, sString, bEmpty, sUrl, sType, errStack, nStatus, UUID, iRandom, escapeHtml,
  CONFIG_FEED, feedAddItem, iftttPush, barkPush, custPush, feedPush, feedXml, feedClear
}