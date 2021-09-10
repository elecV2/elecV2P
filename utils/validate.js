/**
 * 一些合法性检测
 */

const { parse } = require('url')
const { CONFIG } = require('../config')

// 检测某个网络请求是否合法
function isAuthReq(req) {
  if (!CONFIG.SECURITY || CONFIG.SECURITY.enable === false) {
    return true
  }
  if (CONFIG.wbrtoken) {
    if (!req.query) {
      req.query = parse(req.url, true).query
    }
    let token = req.query?.token || req.body?.token
    if (token === undefined) {
      let ref = req.headers['referer']
      if (ref) {
        token = parse(ref, true).query?.token
      }
    }
    if (token === CONFIG.wbrtoken) {
      return true
    }
  }
  let blacklist = CONFIG.SECURITY.blacklist || []
  let whitelist = CONFIG.SECURITY.whitelist || []

  let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (ipAddress.substr(0, 7) == "::ffff:") {
    ipAddress = ipAddress.substr(7)
  }
  if (whitelist.indexOf(ipAddress) !== -1 || (blacklist.indexOf('*') === -1 && blacklist.indexOf(ipAddress) === -1)) {
    return true
  } else {
    return false
  }
}

module.exports = { isAuthReq }