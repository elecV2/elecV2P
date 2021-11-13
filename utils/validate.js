/**
 * 前端 UI 网络请求合法性检测
 */

const cookie = require('cookie')
const { parse } = require('url')
const { CONFIG } = require('../config')

const { logger } = require('./logger')
const clog = new logger({ head: 'access', level: 'debug', file: 'access.log' })
const { atob, btoa, iRandom } = require('./string')

// 检测某个网络请求是否合法
function isAuthReq(req, res) {
  if (!CONFIG.SECURITY || CONFIG.SECURITY.enable === false) {
    clog.debug('config security is not enable')
    return true
  }
  let ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
  if (ipAddress.startsWith('::ffff:')) {
    ipAddress = ipAddress.substr(7)
  }
  let headstr = `${ipAddress} ${req.method} ${req.originalUrl || '/'},`
  let cookies = cookie.parse(req.headers.cookie || '')
  if (cookies?.token?.length > 10 && (CONFIG.wbrtoken + CONFIG.wbrtoken).indexOf(atob(cookies.token)) !== -1) {
    clog.debug(headstr, 'authorized by cookie')
    return true
  }
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
      if (res) {
        let days = req.query?.cookie === 'long' ? 365 : 7
        clog.notify('set cookie for', ipAddress, 'Max-Age:', days, 'days')
        res.setHeader('Set-Cookie', cookie.serialize('token', btoa((CONFIG.wbrtoken + CONFIG.wbrtoken ).substr(iRandom(CONFIG.wbrtoken.length), 10)), {
          // httpOnly: true,
          maxAge: 60 * 60 * 24 * days // cookie 有效期
        }))
      }
      return true
    }
  }
  let blacklist = CONFIG.SECURITY.blacklist || []
  let whitelist = CONFIG.SECURITY.whitelist || []

  if (whitelist.indexOf(ipAddress) !== -1 || (blacklist.indexOf('*') === -1 && blacklist.indexOf(ipAddress) === -1)) {
    clog.debug(headstr, 'authorized by IP')
    return true
  } else {
    clog.notify(headstr, 'rejected by elecV2P because of unauthorized')
    return false
  }
}

module.exports = { isAuthReq }