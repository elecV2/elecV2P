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
  }
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
</style>

