const { now, wait } = require('./time')
const { eAxios, CONFIG_Axios } = require('./eaxios')
const { logger, setGlog, LOGFILE } = require('./logger')
const { list, jsfile, store, file, downloadfile } = require('./file')
const { euid, isJson, bIsUrl, errStack, nStatus } = require('./string')
const { CONFIG_FEED, feedAddItem, iftttPush, feedPush, feedXml, feedClear } = require('./feed')

module.exports = {
  now, wait,
  eAxios, CONFIG_Axios,
  logger, setGlog, LOGFILE,
  list, jsfile, store, file, downloadfile,
  euid, isJson, bIsUrl, errStack, nStatus,
  CONFIG_FEED, feedAddItem, iftttPush, feedPush, feedXml, feedClear
}