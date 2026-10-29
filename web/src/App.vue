<template>
  <section class="section app-root" @click="edelegate($event)">
    <hold /> <message /> <evui />
    <aside class="sider" :class="{ 'sider--collapsed': collapsed, 'sider--mobile': sidermobile }">
      <div class="sider_main">
        <div class="logo">
          <a class="logo_a" href="https://github.com/elecV2/elecV2P" target="elecV2PGit">
            <img class="logo_src" :src="logo_src" :alt="logo_name" @error="srcErr()">
            <span class="logo_name">{{ logo_name }}</span>
          </a>
        </div>
        <ul class="menu">
          <li v-for="(item, key) in navlist" class="menu_item" :class="{ 'menu_item--selected':currentpanel==key }" @click="nav(key)" :key="key">
            <span class="icon" v-html="icon[key]"></span>
            <span class="menu_text fadein">{{ item.name || $t('nav_' + key) }}</span>
          </li>
        </ul>
      </div>
      <div class="sider_trigger sider_trigger--mini" :class="{ 'sider_trigger--collapsed': collapsed }" @click="collapsed=!collapsed">
        <span>{{ collapsed ? '>' : '<' }}</span>
      </div>
      <div class="sider_trigger sider_trigger--mobile" @click="sidermobile=!sidermobile">
        <span>{{ sidermobile ? '☰' : 'X' }}</span>
      </div>
    </aside>
    <keep-alive>
      <component :is="currentpanel" @menunav="menunav" @theme="themeApply" />
    </keep-alive>
    <div class="pi-efh-btn" v-if="piEfhShow" @click="openPiEfh" @contextmenu.prevent="hidePiEfh" title="点击打开 Pi-Agent 界面，拖拽可移动按钮位置，右键关闭" @mousedown="dragStart($event)" @touchstart="dragStart($event)"><svg class="pi-efh-icon" viewBox="0 0 470 470" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M0 0H352.07V234.71H234.71V352.07H117.36V469.43H0V0ZM117.36 117.36V234.71H234.71V117.36H117.36Z"></path><path fill="currentColor" d="M352.07 234.71H469.43V469.43H352.07V234.71Z"></path></svg></div>
  </section>
</template>

<script>
import logo from './assets/logo.png'
import overview from './overview/overview.vue'
import rules from './rules/rules.vue'
import rewrite from './rewrite/rewrite.vue'
import jsmanage from './jsmanage/jsmanage.vue'
import setting from './setting/setting.vue'
import task from './task/task.vue'
import mitm from './mitm/mitm.vue'
import cfilter from './cfilter/cfilter.vue'
import about from './about/about.vue'
import donation from './donation/donation.vue'
import hold from './utils/hold.vue'
import message from './utils/message.vue'
import evui from './utils/evui.vue'
import icon from './utils/icon.js'
import { langset } from './i18n/lang'

export default {
  name: "app",
  data(){
    return {
      icon,
      logo_src: logo,
      logo_name: 'elecV2P',
      collapsed: window.innerWidth < 960 ? true : false,
      sidermobile: true,
      currentpanel: 'overview',
      islangzh: langset.locale.startsWith('zh'),
      piEfhShow: true,
      piEfhPosition: null,
      piEfhDragging: false,
      piEfhMouseStart: null,
      piEfhJustDragged: false,
      menulist: {
        overview: Object.create(null),
        task: Object.create(null),
        mitm: Object.create(null),
        rules: Object.create(null),
        rewrite: Object.create(null),
        jsmanage: Object.create(null),
        setting: Object.create(null),
        cfilter: Object.create(null),
        about: Object.create(null),
        donation: Object.create(null)
      },
    }
  },
  created(){
    let hashtag = location.hash.slice(1).toLowerCase()
    this.currentpanel = this.menulist[hashtag] ? hashtag : 'overview'
    this.setNavNames()
    let menunav_cache = this.$sJson(this.$uApi.store.get('menunav'))
    if (menunav_cache) {
      for (let nav in menunav_cache) {
        if (this.menulist[nav]) {
          if (menunav_cache[nav].name) {
            this.menulist[nav].name = menunav_cache[nav].name
          }
          if (menunav_cache[nav].show !== undefined) {
            this.menulist[nav].show = menunav_cache[nav].show
          }
        }
      }
    }
    this.menulist.setting.show = true
    this.menulist.donation.show = true
    // load piEfh button visibility from store
    // Only hide when explicitly set to false, otherwise show
    const storedPi = this.$uApi.store.get('piEfhShow')
    if (storedPi === 'false' || storedPi === false) this.piEfhShow = false
    let theme_cache = this.$sJson(this.$uApi.store.get('theme'))
    if (theme_cache) {
      this.themeApply(theme_cache)
    }
    /***** hashchange ******/
    addEventListener('hashchange', event => {
      let hashtag = location.hash.slice(1).toLowerCase()
      this.currentpanel = this.menulist[hashtag] ? hashtag : 'overview'
    });
    /***** hashchange end */
    /***** sw register ****/
    addEventListener('load', event => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(error=>{
          console.error('service worker registration failed', error)
        })
        navigator.serviceWorker.addEventListener('controllerchange', ()=>{
          console.debug('a new service worker activated')
          this.$message.success('a new service worker activated')
        })
      } else {
        if (location.protocol !== 'http:' && !this.$uApi.store.getCache('bChecked')) {
          this.$message.error('该浏览器暂不支持 service workers，webUI 部分功能可能受限')
        }
        console.error('This browser does not support service workers. webUI 部分功能可能受限')
      }
      if (location.search.includes('token')) {
        history.replaceState(null, "", "/"+location.hash)
      }
    })
    /*** sw register end **/
  },
  components: {
    overview,
    rules,
    rewrite,
    jsmanage,
    setting,
    task,
    mitm,
    cfilter,
    about,
    donation,
    hold,
    message,
    evui,
  },
  computed: {
    navlist(){
      let nlist = Object.create(null)
      for (let nav in this.menulist) {
        let item = this.menulist[nav]
        if (nav === 'setting') {
          nlist[nav] = item
        } else if (item.show !== false) {
          nlist[nav] = item
        }
      }
      return nlist
    }
  },
  methods: {
    setNavNames(){
      this.menulist.overview.name = this.$t('nav_overview')
      this.menulist.task.name     = this.$t('nav_task')
      this.menulist.mitm.name     = this.$t('nav_mitm')
      this.menulist.rules.name    = this.$t('nav_rules')
      this.menulist.rewrite.name  = this.$t('nav_rewrite')
      this.menulist.jsmanage.name = this.$t('nav_jsmanage')
      this.menulist.setting.name  = this.$t('nav_setting')
      this.menulist.cfilter.name  = this.$t('nav_cfilter')
      this.menulist.about.name    = this.$t('nav_about')
      this.menulist.donation.name = this.$t('nav_donation')
    },
    nav(key) {
      location.hash = '#' + key
      if (!this.sidermobile) {
        this.sidermobile = true;
      }
    },
    edelegate(event){
      switch (event.target.dataset.method) {
      case 'nav':
        let panel = event.target.dataset.panel || event.target.dataset.param
        if (panel) {
          this.nav(panel)
        }
        break
      }
    },
    menunav(mlist = null, force = false){
      if (!mlist) {
        console.debug('menu nav are expect')
        return
      }
      this.setNavNames()
      let custom = {}
      for (let nav in mlist) {
        if (this.menulist[nav]) {
          if (mlist[nav].name !== this.$t('nav_' + nav)) {
            this.menulist[nav].name = mlist[nav].name
            custom[nav] = { name: mlist[nav].name }
          }
          if (mlist[nav].show !== undefined) {
            this.menulist[nav].show = mlist[nav].show
            if (!custom[nav]) custom[nav] = {}
            custom[nav].show = mlist[nav].show
          }
        }
      }
      this.$uApi.store.set('menunav', JSON.stringify(Object.keys(custom).length ? custom : null))
    },
    themeApply(theme = null){
      if (!theme) {
        console.error('theme object is expect')
        return
      }
      if (theme.type === 'logo') {
        if (theme.enable === false) {
          this.logo_src = logo
          this.logo_name = 'elecV2P'
          return
        }
        if (theme.src) {
          this.logo_src = theme.src
        }
        if (theme.name) {
          this.logo_name = theme.name
        }
        return
      }
      if (theme.simple) {
        theme = theme.simple
      }
          if (theme.enable !== true) {
            this.$uApi.removeItem('.evtheme')
            this.$uApi.injectMeta('theme-color', '#003153')
            this.$uApi.store.set('theme', JSON.stringify(theme))
            return
          }
          let theme_css = ''
          if (theme.mainbk) {
            theme_css = `--main-bk: ${ theme.mainbk };`
            if (theme.mainbk.startsWith('#')) {
              theme_css += `--secd-fc: ${ theme.mainbk.padEnd(7, 8).slice(0, 7) }b8;`
            }
          }
          if (theme.maincl) {
            theme_css += `--main-cl: ${ theme.maincl };`
            if (theme.maincl.startsWith('#')) {
              theme_css += `--secd-bk: ${ theme.maincl.padEnd(7, 8).slice(0, 7) }b8;`
            }
          }
          if (theme.appbk) {
            if (/^http/.test(theme.appbk)) {
              theme.appbk = `url(${theme.appbk})`
            }
            theme_css += `background: ${ theme.appbk };--app-bg: ${ theme.appbk };`
          }
          if (theme_css) {
            theme_css = `.app-root{${ theme_css }}`
          }
          if (theme.style) {
            theme_css += theme.style
            if (/--main-fc/.test(theme.style)) {
              this.$uApi.hashToLogo()
            }
          }
          this.$uApi.injectCss(theme_css)
          this.$uApi.injectMeta('theme-color', theme.mainbk)
          this.$uApi.store.set('theme', JSON.stringify(theme))
    },
    srcErr(){
      this.$message.error('LOGO 图标加载失败，自动生成替换图标')
      this.logo_src = this.$uApi.hashToLogo(this.$uApi.store.get('userid'), this.logo_name, 4)
    },
    openPiEfh(){
      if (this.piEfhJustDragged) {
        this.piEfhJustDragged = false
        return
      }
      this.$evui({
        id: 'eapp_efh_pi',
        title: 'Pi-Agent',
        width: 900,
        height: 600,
        resizable: true,
        maximized: true,
        style: {
          content: 'padding: 0;'
        },
        content: `<iframe src="run/?target=${ encodeURIComponent('https://raw.ev2.workers.dev/elecV2/elecV2P/master/script/JSFile/pi.efh') }" style="position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;"></iframe>`
      })
    },
    hidePiEfh(){
      if (confirm('确定隐藏 Pi-Agent 入口按钮吗？\n\n提示：清除浏览器 localStorage 中的 piEfhShow 后刷新页面即可恢复')) {
        this.piEfhShow = false
        this.$uApi.store.set('piEfhShow', false)
        this.$message.success('Pi-Agent 入口按钮已隐藏（清除 localStorage 中 piEfhShow 可恢复）')
      }
    },
    dragStart(event){
      if (event.button !== 0 && event.type !== 'touchstart') return
      if (this.piEfhDragging) return
      this.piEfhDragging = true
      this.piEfhJustDragged = false
      const touch = event.touches && event.touches[0]
      this.piEfhMouseStart = {
        x: touch ? touch.clientX : event.clientX,
        y: touch ? touch.clientY : event.clientY
      }
      const btnRect = this.$el.querySelector('.pi-efh-btn').getBoundingClientRect()
      const rootRect = this.$el.getBoundingClientRect()
      this.piEfhPosition = {
        right: Math.round(rootRect.width - btnRect.right),
        bottom: Math.round(rootRect.height - btnRect.bottom),
        width: btnRect.width,
        height: btnRect.height
      }
      document.addEventListener('mousemove', this.dragMove)
      document.addEventListener('mouseup', this.dragEnd)
      document.addEventListener('touchmove', this.dragMove, { passive: false })
      document.addEventListener('touchend', this.dragEnd)
    },
    dragMove(event){
      if (!this.piEfhDragging || !this.piEfhPosition) return
      const touch = event.touches && event.touches[0]
      const clientX = touch ? touch.clientX : event.clientX
      const clientY = touch ? touch.clientY : event.clientY
      const dx = clientX - this.piEfhMouseStart.x
      const dy = clientY - this.piEfhMouseStart.y
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      this.piEfhJustDragged = true
      // 只有真正拖动时才 preventDefault，避免阻止 click
      event.preventDefault()
      const root = this.$el
      const rootRect = root.getBoundingClientRect()
      const btnRect = this.piEfhPosition
      const newRight = Math.max(20, btnRect.right - dx)
      const newBottom = Math.max(20, btnRect.bottom - dy)
      root.style.setProperty('--pi-efh-left', 'auto')
      root.style.setProperty('--pi-efh-top', 'auto')
      root.style.setProperty('--pi-efh-right', newRight + 'px')
      root.style.setProperty('--pi-efh-bottom', newBottom + 'px')
    },
    dragEnd(){
      if (!this.piEfhDragging) return
      this.piEfhDragging = false
      document.removeEventListener('mousemove', this.dragMove)
      document.removeEventListener('mouseup', this.dragEnd)
      document.removeEventListener('touchmove', this.dragMove)
      document.removeEventListener('touchend', this.dragEnd)
      if (this.piEfhPosition) {
        const btnRect = this.$el.querySelector('.pi-efh-btn').getBoundingClientRect()
        const rootW = this.$el.getBoundingClientRect().width
        const rootH = this.$el.getBoundingClientRect().height
        try {
          localStorage.setItem('piEfhPosition', JSON.stringify({
            right: Math.round(rootW - btnRect.right),
            bottom: Math.round(rootH - btnRect.bottom)
          }))
        } catch(e) {}
      }
      this.piEfhPosition = null
      this.piEfhMouseStart = null
    },
    restorePiEfhPosition(){
      let stored = null
      try {
        const s = localStorage.getItem('piEfhPosition')
        if (s) stored = JSON.parse(s)
      } catch(e) {}
      const root = this.$el
      if (stored && stored.right !== undefined && stored.bottom !== undefined) {
        root.style.setProperty('--pi-efh-left', 'auto')
        root.style.setProperty('--pi-efh-top', 'auto')
        root.style.setProperty('--pi-efh-right', stored.right + 'px')
        root.style.setProperty('--pi-efh-bottom', stored.bottom + 'px')
      }
    },
  },
  mounted(){
    this.restorePiEfhPosition()
  },
};
</script>

<style scoped>
.sider {
  position: sticky;
  overflow: hidden auto;
  top: 0px;
  left: 0px;
  flex: 0 0 200px;
  padding-bottom: 48px;
  box-sizing: border-box;
  width: 200px;
  height: 100vh;
  max-width: 200px;
  min-width: 200px;
  border-right: 1px solid var(--tras-bk);
  color: var(--main-fc);
  transition-property: flex,width,min-width,max-width;
  transition-duration: .2s;
  z-index: 2;
}

.sider_main {
  height: 100%;
  overflow: hidden auto;
}

.sider_trigger {
  position: fixed;
  bottom: 0;
  z-index: 1;
  width: 200px;
  height: 48px;
  line-height: 48px;
  font-size: 26px;
  font-weight: bold;
  text-align: center;
  border-top: 1px solid var(--tras-bk);
  cursor: pointer;
  transition: all 0.2s;
}

.sider_trigger--collapsed {
  width: 80px;
}

.sider_trigger--mobile {
  display: none;
  width: 46px;
  padding-right: 5px;
  left: 200px;
  border-radius: 0 2em 1em 0;
}

.sider--collapsed .sider_trigger--mobile {
  left: 80px;
}

.sider--mobile .sider_trigger--mobile {
  left: 0;
}

.sider--collapsed {
  flex: 0 0 80px;
  max-width: 80px;
  min-width: 80px;
  width: 80px;
}

.sider--collapsed .menu_text, .sider--collapsed .logo_name {
  display: none;
}

.logo {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 4em;
  border-bottom: 1px solid var(--tras-bk);
}

.logo_a {
  display: flex;
  align-items: center;
  padding-left: 1.4em;
  overflow: hidden;
  width: 100%;
  height: 2em;
}
.logo_a--offline {
  filter: invert(1);
}

.logo_src {
  height: 2em;
  width: 2em;
  margin-right: 1em;
}

.logo_name {
  width: 108px;
  white-space: nowrap;
  overflow: hidden;
  font-size: 22px;
  font-weight: bolder;
  color: var(--main-cl);
}

.menu {
  zoom: 1;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  line-height: 1.5;
  font-variant: tabular-nums;
  font-feature-settings: 'tnum';
  outline: none;
  list-style: none;
  color: var(--main-fc);
}

.menu_item {
  display: flex;
  overflow: hidden;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  height: 46px;
  padding-left: 2em;
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  opacity: 0.75;
}

.menu_item:hover {
  opacity: 1;
}

.menu_item--selected {
  background: var(--main-cl);
  opacity: 1;
}

.menu_text {
  margin-left: 1em;
  white-space: pre;
}

@media screen and (max-width: 600px) {
.sider {
  position: fixed;
  background: var(--main-bk);
}

.sider--mobile {
  left: -1px;
  flex: 0 0 0;
  width: 0;
  min-width: 0;
}

.sider--mobile .sider_trigger--mini {
  display: none;
}

.sider_trigger--mobile {
  display: block;
  background: var(--main-bk);
}

}
.pi-efh-btn {
  position: fixed;
  bottom: var(--pi-efh-bottom, calc(20px + env(safe-area-inset-bottom, 0px)));
  right: var(--pi-efh-right, calc(20px + env(safe-area-inset-right, 0px)));
  width: 48px;
  height: 48px;
  background: var(--main-bk);
  color: var(--main-cl);
  border: 1px solid var(--tras-bk);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: bold;
  cursor: pointer;
  opacity: 0.85;
  transition: opacity .2s, transform .2s;
  z-index: 10;
  user-select: none;
  -webkit-app-region: no-drag;
}

.pi-efh-icon {
  width: 25px;
  height: 25px;
}

.pi-efh-btn:hover {
  opacity: 1;
  transform: scale(1.05);
}
</style>
