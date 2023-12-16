<template>
  <section>
    <header class="header">{{ $t('overview') }}</header>
    <main class="content">
      <div class="overview"><div class="overview_ports">
        <a class="overview_item overview_item--big" href="./logs/" :target="isPwa ? '_self' : 'elecV2PLOGS'">{{ $t('logs_of_script') }}</a>
        <a class="overview_item overview_item--big" href="./efss/" :target="isPwa ? '_self' : 'elecV2PEFSS'">{{ $t('efss_file_manage') }}</a>
        <div class="overview_item overview_item--big" :class="{ 'overview_item--disable': !anyproxy.enable }" title="双击打开/关闭（代理端口不是网页，不能直接访问）">
          <span class="overview_btn" v-show="eopbtn.open" @click="eproxyToggle('open')">{{ $t('open') }}</span>
          <span @click="eproxyBtn()" @dblclick="eproxyToggle()">ANYPROXY {{ $t('port') }}: {{ anyproxy.port }}</span>
          <span class="overview_btn overview_btn--close" v-show="eopbtn.close" @click="eproxyToggle('close')">{{ $t('close') }}</span>
        </div>
        <div class="overview_item overview_item--big" :class="{ 'overview_item--disable': !anyproxy.enable }" @click="webifOpen()">ANYPROXY {{ $t('logs') }}: {{ anyproxy.webPort }}</div>
      </div>
      <div class="overview_rules" title="该部分数据在每次刷新页面时更新">
        <span class="overview_item" data-method="nav" data-panel="rules" :class="{ 'overview_item--disable': !enablelist.rule }">RULES: {{ ruleslen }}</span>
        <span class="overview_item" data-method="nav" data-panel="rewrite" :class="{ 'overview_item--disable': !enablelist.rewrite }">REWRITE: {{ rewriteslen }}</span>
        <span class="overview_item" data-method="nav" data-panel="task">TASKS: {{ taskstatus }}</span>
        <span class="overview_item" data-method="nav" data-panel="jsmanage">SCRIPTS: {{ jslistslen }}</span>
        <span class="overview_item" data-method="nav" data-panel="mitm" :class="{ 'overview_item--disable': !enablelist.mitmhost }">MITM HOST: {{ mitmhostlen }}</span>
      </div></div>
      <status :sysinfo="sysinfo" @ovInit="ovInit();eappfresh=!eappfresh;" />
      <eapp :fresh="eappfresh" />
    </main>
    <footer class="footer">
      <span class="cursor" :class="{ newversion }" @click="showUplog()" title="当前后台版本号，点击获取更新日志">{{ $t('version') }}: {{ version }}</span>
      <span @mouseover="runHour">{{ $t('startat') }}: {{ start }}</span>
    </footer>
  </section>
</template>

<script>
import status from './status.vue'
import eapp from './eapp.vue'
import { setLang } from '../i18n/lang'

export default {
  name: "overview",
  data(){
    return {
      version: '1.0.0',
      baseurl: location.protocol + '//' + location.hostname,
      anyproxy: {
        enable: true,
        port: 8001,
        webPort: 8002
      },
      ruleslen: 0,
      rewriteslen: 0,
      jslistslen: 0,
      taskstatus: '0/0/0',
      mitmhostlen: 0,
      start: this.$sTime(),
      newversion: '',
      sysinfo: Object.create(null),
      eopbtn: {
        open: false,
        close: false
      },
      enablelist: {
        rule: true,
        rewrite: true,
        mitmhost: true,
      },
      userid: this.$uApi.store.get('userid'),
      bcheck: this.$uApi.store.getCache('bChecked'),
      eappfresh: false,
      isPwa: this.$uApi.isPwa(),
    }
  },
  components: {
    status, eapp,
  },
  created(){
    this.ovInit()
    if (!this.bcheck) {
      this.$uApi.store.set('bcheck', new Date().getDate().toString())
      this.bcheck = true
      if (location.protocol === 'http:' && !/^(100|10|127|172|192\.168)/.test(location.hostname)) {
        this.$message.error('当前正通过 http 访问，建议升级到 https')
      }
    }
  },
  methods: {
    ovInit(){
      const hideloading = this.$message.loading('正在获取 overview 相关数据...', 0)
      this.$axios.get('/data?type=overview' + (this.bcheck ? '' : `&check=${this.bcheck}`)).then(res=>{
        this.$message.success(`成功获取 overview 相关数据\nwebUI 版本 ${VERSION} 后台版本 ${res.data.version}`)
        if (res.data.lang) {
          setLang(res.data.lang)
        }
        this.ruleslen = res.data.ruleslen
        this.rewriteslen = res.data.rewriteslen
        this.jslistslen = res.data.jslistslen
        this.mitmhostlen = res.data.mitmhostlen
        this.version = res.data.version
        this.start = this.$sTime(new Date(res.data.start), 0, 0)
        this.anyproxy = res.data.anyproxy
        this.newversion = res.data.newversion
        this.sysinfo = res.data.sysinfo
        this.userid  = res.data.userid
        if (this.userid !== this.$uApi.store.get('userid')) {
          this.$uApi.store.set('userid', this.userid)
        }
        this.$uApi.store.setCache('bSponsor', this.$uApi.store.getCache('sponsors').has(this.userid))
        Object.assign(this.enablelist, res.data.enablelist)
        if (typeof res.data.menunav === 'object') {
          this.$emit('menunav', { ...res.data.menunav })
        }
        if (typeof res.data.logo === 'object') {
          this.$emit('theme', { type: 'logo', ...res.data.logo })
        }
        if (this.$uApi.store.getCache('bSponsor')) {
          let rtheme = res.data.theme
          rtheme && this.$emit('theme', rtheme.simple || rtheme)
        } else {
          this.$emit('theme', { enable: false })
        }
        if (res.data.taskstatus) {
          this.taskstatus = res.data.taskstatus.running + '/' + res.data.taskstatus.total + '/' + res.data.taskstatus.sub
        }
        let vernum = Number(this.version.replace(/\.|v/g, ''))
        if (this.newversion && Number(this.newversion.replace(/\.|v/g, '')) > vernum) {
          console.log(`elecV2P 有新的版本 v${this.newversion} 可供更新`)
          if (this.$uApi.store.get('newversion') !== this.newversion) {
            this.$message.success(`elecV2P 有新的版本 v${this.newversion} 可供更新`, { url: 'https://github.com/elecV2/elecV2P/blob/master/logs/update.log', secd: 0 })
            this.$uApi.store.set('newversion', this.newversion)
          }
        } else {
          this.newversion = ''
        }
      }).catch(e=>{
        this.$message.error('获取端口数据失败', e.message)
        console.error('获取端口数据失败', e)
      }).finally(hideloading)
    },
    showUplog(){
      const hideloading = this.$message.loading('正在获取更新日志...', 0)
      this.$axios.get("https://raw.githubusercontent.com/elecV2/elecV2P/master/logs/update.log").then(res=>{
        this.$message.success('获取成功')
        this.$evui({
          title: '当前 elecV2P 版本: ' + this.version + ' 最近更新日志',
          width: 820,
          height: 460,
          style: {
            content: 'padding-left: 8px; font-size: 16px;'
          },
          content: `<div style="text-align: center;background: var(--icon-bk);margin-bottom: 6px;margin-left: -4px;border-radius: 0 0 12px 12px;font-size: 20px;">${ this.newversion ? '检测到有新版本 v' + this.newversion + '<br>请使用 <a href="/?fn=softupdate.js#jsmanage">softupdate.js</a> 或者 docker 命令进行升级' : '' }</div><div>${res.data}</div>`
        })
      }).catch(e=>{
        this.$message.error('获取失败', e.message)
        console.error('更新日志获取失败', e)
        this.$evui({
          title: '更新日志获取失败',
          width: 400,
          height: 160,
          content: `<h1 style="text-align: center;margin-top: 1em;"><a href="https://github.com/elecV2/elecV2P/blob/master/logs/update.log" target="elecV2PGit" ref="noreferrer">点击此链接</a> 前往 Github 查看最新更新日志</h1>`
        })
      }).finally(hideloading)
    },
    eproxyBtn(){
      if (this.anyproxy.enable) {
        this.eopbtn.close = !this.eopbtn.close
      } else {
        this.eopbtn.open = !this.eopbtn.open
      }
    },
    eproxyToggle(op = ''){
      if(!this.$wsrecv.connected) {
        this.$message.error('websocket 尚未连接，指令无法发送')
        return
      }
      if (this.anyproxy && this.anyproxy.enable) {
        if (op === 'close' || confirm('确定关闭 ANYPROXY？')) {
          this.$wsrecv.send('eproxy', 'close')
          this.anyproxy.enable = false
        }
      } else {
        if (op === 'open' || confirm('确定打开 ANYPROXY？')) {
          this.$wsrecv.send('eproxy', 'start')
          this.anyproxy.enable = true
        }
      }
      this.eopbtn.open  = false
      this.eopbtn.close = false
    },
    webifOpen(){
      if (this.anyproxy.enable) {
        this.$uApi.open(this.baseurl + ':' + this.anyproxy.webPort)
      } else {
        this.$message.success('当前 ANYPROXY 处于关闭状态，无可查看日志')
      }
    },
    runHour(e){
      e.target.title = 'elecV2P 已持续运行 ' + this.$uStr.hDays(Date.parse(this.start))
    }
  }
}
</script>

<style scoped>
.content{
  position: relative;
}
.overview {
  margin-bottom: var(--base-sz);
  border-radius: var(--radius-bs);
  background: var(--main-bk);
  color: var(--main-fc);
}

.overview_ports, .overview_rules {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  padding: 8px 0;
}

.overview_item {
  position: relative;
  width: 280px;
  max-width: 100%;
  border-radius: 8px;
  margin: 6px 1em;
  padding: 1px 10px;
  text-align: center;
  font-size: 20px;
  font-weight: bolder;
  box-sizing: border-box;
  word-break: break-word;
  user-select: none;
  cursor: pointer;
  background: var(--main-fc);
  color: var(--main-cl);
}

.overview_item--big {
  width: 380px;
  padding: 4px 0px;
  margin: 6px 12px;
  font-size: 24px;
}

.overview_item--disable {
  background: var(--tras-bk);
  text-shadow: 1px 0 1px var(--main-bk);
}

.overview_btn {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  padding: 0 0.5em;
  line-height: 44px;
  border-radius: 8px;
  color: var(--main-fc);
  background: var(--icon-bk);
}

.overview_btn--close {
  right: 0;
  left: initial;
  background: var(--note-bk);
}

.footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  line-height: 48px;
  padding: 0;
  font-size: 18px;
}

.newversion {
  position: relative;
}

.newversion:after {
  content: '';
  display: inline-block;
  position: absolute;
  top: 10px;
  width: 6px;
  height: 6px;
  background: var(--note-bk);
  border-radius: 3px;
}
</style>