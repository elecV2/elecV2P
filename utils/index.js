const { now, wait } = require('./time')
const { logger, setGlog, LOGFILE } = require('./logger')
const { list, jsfile, store, file } = require('./file')
const { eAxios, downloadfile, CONFIG_Axios } = require('./eaxios')
const { euid, sJson, sString, bEmpty, sUrl, sType, errStack, nStatus, UUID, iRandom } = require('./string')
const { CONFIG_FEED, feedAddItem, iftttPush, barkPush, schanPush, feedPush, feedXml, feedClear } = require('./feed')

module.exports = {
  now, wait,
  eAxios, CONFIG_Axios,
  logger, setGlog, LOGFILE,
  list, jsfile, store, file, downloadfile,
  euid, sJson, sString, bEmpty, sUrl, sType, errStack, nStatus, UUID, iRandom,
  CONFIG_FEED, feedAddItem, iftttPush, barkPush, schanPush, feedPush, feedXml, feedClear
}