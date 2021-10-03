/**
 * 一些合法性检测
 */

const { parse } = require('url')
const { CONFIG } = require('../config')

const { logger } = require('./logger')
const clog = new logger({ head: 'access', level: 'debug', file: 'access.log' })

// 检测某个网络请求是否合法
function isAuthReq(req) {
  if (!CONFIG.SECURITY || CONFIG.SECURITY.enable === false) {
    clog.debug('config security is not enable')
    return true
  }
  let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (ipAddress.startsWith('::ffff:')) {
    ipAddress = ipAddress.substr(7)
  }
  let headstr = `${ipAddress} ${req.method} ${req.originalUrl || '/'}.`
  if (CONFIG.wbrtoken) {
    if (!req.query) {
      req.query = parse(req.url, true).query
    }
    let token = req.query?.token || req.body?.token
    if (token) {
      clog.debug(headstr, 'get token from request query or body')
    } else {
      if (req.headers['authorization']) {
        token = req.headers['authorization'].split(' ')[1]
        clog.debug(headstr, 'get token from request headers authorization')
      } else if (req.headers['referer']) {
        token = parse(req.headers['referer'], true).query?.token
        if (token) {
          clog.debug(headstr, 'get token from request headers referer')
        }
      }
    }
    if (token === CONFIG.wbrtoken) {
      clog.debug(headstr, 'authorized by token')
      return true
    }
  }
  let blacklist = CONFIG.SECURITY.blacklist || []
  let whitelist = CONFIG.SECURITY.whitelist || []

  if (whitelist.indexOf(ipAddress) !== -1 || (blacklist.indexOf('*') === -1 && blacklist.indexOf(ipAddress) === -1)) {
    clog.debug(headstr, 'authorized by IP')
    return true
  } else {
    clog.notify(ipAddress, 'trying to access elecV2P.', req.method, req.originalUrl || '/')
    return false
  }
}

module.exports = { isAuthReq }