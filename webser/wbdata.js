const { CONFIG, CONFIG_Port } = require('../config')

const { logger, list, Jsfile, sType, stream, checkupdate, eAxios } = require('../utils')
const clog = new logger({ head: 'wbdata' })

const { CONFIG_RULE, setRewriteRule } = require('../script')
const { crtInfo, taskMa, sysInfo } = require('../func')

module.exports = app => {
  app.get('/data', (req, res)=>{
    let type = req.query.type
    clog.info((req.headers['x-forwarded-for'] || req.connection.remoteAddress), `get data ${type}`)
    switch (type) {
      case 'overview':
        res.json({
          ruleslen: CONFIG_RULE.reqlists.length + CONFIG_RULE.reslists.length,
          rewriteslen: CONFIG_RULE.rewritereq.length + CONFIG_RULE.rewriteres.length,
          jslistslen: Jsfile.get('list').length,
          taskstatus: taskMa.status(),
          mitmhostlen: CONFIG_RULE.mitmhost.length,
          version: CONFIG_Port.version,
          start: CONFIG_Port.start,
          anyproxy: CONFIG_Port.anyproxy,
          newversion: CONFIG_Port.newversion,
          sysinfo: sysInfo(),
          enablelist: {
            rule: CONFIG_RULE.ruleenable,
            rewrite: CONFIG_RULE.rewriteenable,
            mitmhost: CONFIG_RULE.mitmhostenable
          },
          menunav: CONFIG.webUI?.nav,
          theme: CONFIG.webUI?.theme,
          logo: CONFIG.webUI?.logo,
          userid: CONFIG_Port.userid,
          lang: CONFIG.lang,
        })
        if (req.query.check) {
          checkupdate()
        }
        break
      case 'rules':
        let rlist = list.get('default.list')
        res.json({
          eplists: rlist?.rules || { list: [] },
          uagent: CONFIG_RULE.uagent
        })
        break
      case 'rewritelists':
        let wlist = list.get('rewrite.list')
        res.json(wlist?.rewrite?.list ? wlist : { rewrite: { list: [] } })
        break
      case 'mitmhost':
        let mlist = list.get('mitmhost.list')
        res.json({
          host: mlist?.list || [],
          enable: mlist?.enable !== false,
          eproxy: CONFIG_Port.anyproxy,
          crtinfo: crtInfo(),
          pacproxy: CONFIG.pac?.proxy,
          pacfinal: CONFIG.pac?.final,
        })
        break
      case 'filter':
        res.send(list.get('filter.list'))
        break
      case 'update':
      case 'newversion':
      case 'checkupdate':
        checkupdate(Boolean(req.query.force)).then(body=>{
          res.json(body)
        })
        break
      case 'stream':
        if (req.query.url && /^https?:\/\/\S{4}/.test(req.query.url)) {
          stream(req.query.url, req.headers).then(response=>{
            res.status(response.status)
            res.set(response.headers)

            response.data.pipe(res)
          }).catch(e=>{
            res.json({
              rescode: -1,
              message: e
            })
          })
        } else {
          clog.error('wrong stream url', req.query.url)
          res.json({
            rescode: -1,
            message: 'wrong stream url ' + req.query.url
          })
        }
        break
      case 'sponsors':
        eAxios(`https://sponsors.elecv2.workers.dev/${ req.query.param || '' }?userid=${ CONFIG_Port.userid }`).then(response=>{
          res.json({
            rescode: 0,
            message: 'success get sponsors list',
            resdata: {
              userid: CONFIG_Port.userid,
              sponsors: response.data,
            }
          })
        }).catch(e=>{
          res.json({
            rescode: -1,
            message: 'fail to get sponsors list',
            resdata: e.message
          })
        })
        break
      default: {
        clog.error('unknow data get type', type)
        res.status(501).json({
          rescode: 501,
          message: 'unknow data get type ' + type
        })
      }
    }
  })

  app.put('/data', (req, res)=>{
    clog.notify((req.headers['x-forwarded-for'] || req.connection.remoteAddress), 'put data', req.body.type)
    switch(req.body.type){
      case 'rules':
        let fdata = req.body.eplists
        if (fdata && fdata.length) {
          let renlist = fdata.filter(r=>r.enable !== false)
          if (list.put('default.list', {
            rules: {
              note: req.body.note || 'elecV2P RULES 规则列表',
              total: fdata.length,
              active: renlist.length,
              enable: req.body.ruleenable,
              list: fdata
            }
          })){
            res.json({
              rescode: 0,
              message: 'success saved modify list ' + renlist.length + '/' + fdata.length
            })
            CONFIG_RULE.ruleenable = req.body.ruleenable !== false
            CONFIG_RULE.reqlists = []
            CONFIG_RULE.reslists = []
            renlist.forEach(r=>{
              if (r.stage === 'req') {
                CONFIG_RULE.reqlists.push(r)
              } else {
                CONFIG_RULE.reslists.push(r)
              }
            })
          } else {
            res.json({
              rescode: -1,
              message: 'fail to save rules list'
            })
          }
        } else {
          res.json({
            rescode: -1,
            message: 'some data is expect'
          })
        }
        break
      case 'rewrite':
        if (req.body.rewritesub || req.body.rewritelists) {
          let norenlist = req.body.rewritelists.filter(r=>r.enable !== false && r.match && r.target)
          let enlist = [ ...norenlist ]
          let enbnum = norenlist.length, total = req.body.rewritelists.length
          let rewritesub = req.body.rewritesub, subkeys = Object.keys(rewritesub)
          subkeys.forEach(skey=>{
            if (rewritesub[skey].enable && rewritesub[skey].list) {
              let subenlist = rewritesub[skey].list.filter(r=>r.enable !== false && r.match && r.target)
              enlist.push(...subenlist)
              enbnum += subenlist.length
              total += rewritesub[skey].list.length
              rewritesub[skey].active = subenlist.length
              rewritesub[skey].total = rewritesub[skey].list.length
            }
          })
          if (list.put('rewrite.list', {
            rewrite: {
              note: req.body.note || 'elecV2P 重写规则',
              total: req.body.rewritelists.length,
              active: norenlist.length,
              enable: req.body.rewriteenable,
              list: req.body.rewritelists
            }, rewritesub,
          })){
            res.json({
              rescode: 0,
              message: 'success saved rewrite list ' + enbnum + '/' + total + '/' + subkeys.length
            })
            CONFIG_RULE.rewriteenable = req.body.rewriteenable !== false
            CONFIG_RULE.rewritereq = []
            CONFIG_RULE.rewriteres = []
            setRewriteRule(enlist, CONFIG_RULE.rewritereq, CONFIG_RULE.rewriteres)
            clog.info('clear rewrite list match results cache')
            CONFIG_RULE.cache.rewritereq.clear()
            CONFIG_RULE.cache.rewriteres.clear()
          } else {
            res.json({
              rescode: -1,
              message: 'fail to save rewrite list'
            })
          }
        } else {
          res.json({
            rescode: -1,
            message: 'some data is expect'
          })
        }
        break
      case 'mitmhost':
        let mhost = req.body.data
        let enhost = mhost.filter(host=>host.enable !== false).map(host=>host.host)
        if (list.put('mitmhost.list', {
          mitmhost: {
            note: req.body.note || 'elecV2P mitmhost',
            total: mhost.length,
            active: enhost.length,
            enable: req.body.mitmhostenable,
            list: mhost
          }
        })){
          res.json({
            rescode: 0,
            message: 'success saved mitmhost list ' + enhost.length + '/' + mhost.length
          })
          CONFIG_RULE.mitmhostenable = req.body.mitmhostenable !== false
          if (CONFIG_RULE.mitmhostenable) {if (enhost.indexOf('*') !== -1) {
            clog.info('MITM enable for all host')
            CONFIG_RULE.mitmtype = 'all'
          } else {
            CONFIG_RULE.mitmtype = 'list'
          }}
          CONFIG_RULE.mitmhost = enhost
          clog.info('clear mitmhost match results cache')
          CONFIG_RULE.cache.host.clear()
        } else {
          res.json({
            rescode: -1,
            message: 'fail to save mitmhost list'
          })
        }
        break
      case 'mitmhostadd':
        if (req.body.data && sType(req.body.data) === 'array' && req.body.data.length) {
          let faddhost = req.body.data.filter(host=>host.length>2 && CONFIG_RULE.mitmhost.indexOf(host) === -1)
          if (list.put('mitmhost.list', faddhost, { type: 'add', note: req.body.note })) {
            res.json({
              rescode: 0,
              message: 'success add mitmhost ' + faddhost.length
            })
            CONFIG_RULE.mitmhost.push(...faddhost)
          } else {
            res.json({
              rescode: -1,
              message: 'fail to update mitmhost list'
            })
          }
        } else {
          res.json({
            rescode: -1,
            message: 'a array of mitmhost is expect'
          })
        }
        break
      default:{
        clog.error('unknow data put type', req.body.type)
        res.status(501).json({
          rescode: 501,
          message: 'unknow data put type'
        })
      }
    }
  })
}