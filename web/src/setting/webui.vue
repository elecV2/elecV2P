<template>
  <div class="setting setting--vflex" :class="{ 'setting--collapsed': collapse }" @keydown.ctrl.83.prevent.stop="webuiSave()">
    <h4 class="setting_title">
      <sapn class="title_main">webUI {{ $t('setting_of') }}</sapn>
      <span @click="collapse=!collapse" class="title_collapse" :class="{ 'title_collapse--collapsed': collapse }"></span>
    </h4>
    <div class="border setting setting--inline" v-show="!collapse">
      <div class="eflex">
        <label title="左上角显示信息">自定义 LOGO：</label>
        <checkbox :oCheck="logo" />
      </div>
      <label class="eflex eflex--wrap emargin">图标链接：<input class="elecTable_input logo_src" v-model="logo.src" placeholder="比如 https://x.xx/x.png 或 efss/logo/my.png"></label>
      <label class="eflex">显示名称：<input class="elecTable_input w120" v-model="logo.name" placeholder="elecV2P"></label>
      <button class="elecBtn w120" @click.prevent="logoSave()">保存</button>
    </div>
    <div class="border setting setting--inline" v-show="!collapse">
      <h4 class="title_inline" title="SETTING/DONATION 暂时不支持隐藏">左侧导航栏设置</h4>
      <ul class="eflex eflex--wrap emargin">
        <li class="menunav_item" v-for="(nav, key) in menulist" :key="key">
          <label>{{ key.toUpperCase() }}: 别名</label>
          <input class="emargin--left elecTable_input w220" type="text" v-model="nav.name" placeholder="显示为其他名称">
          <label class="emargin--left">显示</label>
          <input class="echeckbox" type="checkbox" v-model="nav.show">
        </li>
      </ul>
      <span class="tip tip--small"> • SETTING/DONATION 暂时不可隐藏      • 隐藏界面可通过 #hash 的形式直接访问</span>
    </div>
    <div class="border setting setting--inline" v-if="$uApi.store.getCache('bSponsor')" v-show="!collapse">
      <div class="eflex">
        <label>启用主题：</label>
        <checkbox :oCheck="theme_simple" />
        <input class="emargin--left elecTable_input w220" type="text" v-model="theme_simple.name" placeholder="主题名称">
      </div>
      <div class="emargin">
        <label>主色彩:</label>
        <input class="elecTable_input w120" type="text" v-model="theme_simple.mainbk" placeholder="#326733">
      </div>
      <div class="emargin">
        <label>文字色彩:</label>
        <input class="elecTable_input w120" type="text" v-model="theme_simple.maincl" placeholder="#ff9800">
      </div>
      <div class="emargin">
        <label>应用背景:</label>
        <input class="elecTable_input w220" type="text" v-model="theme_simple.appbk" placeholder="url(https://x.xx/x.png)">
      </div>
      <div class="emargin eflex eflex--wrap w100">
        <div class="theme_style">
          <label>附加样式：</label>
          <textarea class="editor_textarea editor_textarea--oneline" v-model="theme_simple.style" placeholder="#app {--main-bk: #2E3784;--main-fc: #FFCB40;--main-cl: #64AAD0;}"></textarea>
        </div>
        <button class="elecBtn greenbk" @click="themePreview()">预览</button>
        <button class="elecBtn w120" @click="themeSave()">保存为常用</button>
      </div>
      <div class="w100">
        <ul class="w100">
          <li class="theme_item" v-for="(titem, idx) in theme_list">
            <span class="w220">{{ titem.name }}：</span>
            <div class="theme_view">
              <span class="theme_viewitem" @click.prevent="copyColor(titem.mainbk)" :style="{ 'background': titem.mainbk }" :title="titem.mainbk"></span>
              <span class="theme_viewitem" @click.prevent="copyColor(titem.maincl)" :style="{ 'background': titem.maincl }" :title="titem.maincl"></span>
              <span class="theme_viewitem" @click.prevent="copyColor(titem.appbk)" :style="{ 'background': titem.appbk }" :title="titem.appbk"></span>
            </div>
            <div class="theme_op">
              <button class="elecBtn greenbk elecBtn--h32" @click="themePreview(idx)">预览</button>
              <button class="elecBtn elecBtn--clear elecBtn--h32" @click="theme_list.splice(idx, 1)">删除</button>
            </div>
          </li>
        </ul>
        <div class="theme_imexport">
          <button class="elecBtn elecBtn--h32 minw160" @click.prevent="themeExport()">导出常用主题</button>
          <button class="elecBtn elecBtn--h32 minw160" @click.prevent="themeImport()">导入常用主题</button>
        </div>
      </div>
    </div>
    <button v-show="!collapse" @click="webuiSave()" class="elecBtn elecBtn--stlong">{{ $t('save') }}</button>
  </div>
</template>

<script>
import checkbox from '../utils/checkbox.vue'

export default {
  name: "webui",
  props: ["menunav", "theme", "logo"],
  data(){
    return {
      collapse: this.$uStr.iRandom(0, 10) > 5,
      navkey: [
        'overview', 'task', 'mitm',
        'rules', 'rewrite', 'jsmanage',
        'setting', 'cfilter', 'about', 'donation'
      ]
    }
  },
  components: { checkbox },
  computed: {
    menulist(){
      for (let key of this.navkey) {
        if (!this.menunav[key]) {
          this.menunav[key] = Object.create(null)
        }
        if (this.menunav[key].show !== false) {
          this.menunav[key].show = true
        }
      }
      return this.menunav
    },
    theme_simple(){
      if (!this.theme.simple) {
        this.theme.simple = Object.create(null)
      }
      return this.theme.simple
    },
    theme_list(){
      if (!this.theme.list) {
        this.theme.list = []
      }
      return this.theme.list
    },
  },
  methods: {
    webuiSave(){
      if (this.theme_simple.style && /</.test(this.theme_simple.style)) {
        this.$message.error('附加样式中包含特殊字符')
        return
      }
      const hideloading = this.$message.loading('webUI 相关设置保存中...', 0)
      this.$axios.put("/config", {
        type: "webUIFront",
        data: {
          nav: this.menunav,
          theme: this.theme,
        }
      }).then(response=>{
        if (response.data.rescode === 0) {
          this.$message.success('webUI 相关设置修改成功')
          this.$emit('menunav', this.menunav, true)
          this.$emit('theme', this.theme_simple)
        } else {
          this.$message.error('webUI 相关设置修改失败', response.data.message)
        }
      }).catch(e=>{
        this.$message.error('webUI 相关设修改失败', e.message)
        console.error('webUI 相关设修改失败', e)
      }).finally(hideloading)
    },
    themeSave(){
      let name = prompt('命名将要保存的主题', this.theme_simple.name || '主题名称')
      if (!name) {
        return
      }
      this.theme.list.push({
        name, mainbk: this.theme_simple.mainbk,
        maincl: this.theme_simple.maincl,
        appbk: this.theme_simple.appbk,
        style: this.theme_simple.style,
      })
      this.$message.success(name, '已保存')
      this.$forceUpdate()
    },
    themePreview(idx = -1){
      if (idx === -1) {
        this.$emit('theme', this.theme_simple)
        return
      }
      this.theme_simple.enable = true
      this.theme_simple.name = this.theme_list[idx].name
      this.theme_simple.mainbk = this.theme_list[idx].mainbk
      this.theme_simple.maincl = this.theme_list[idx].maincl
      this.theme_simple.appbk = this.theme_list[idx].appbk
      this.theme_simple.style = this.theme_list[idx].style
      this.$emit('theme', this.theme_simple)
    },
    themeExport(){
      this.$uApi.saveAsFile(this.theme_list, 'elecV2P_theme.json')
    },
    themeImport(){
      this.$uApi.getFile({ accept: '.json' }).then(data=>{
        try {
          this.theme_list.push(...JSON.parse(data.content))
          this.$forceUpdate()
          this.$message.success('常用主题列表导入成功')
        } catch(e) {
          this.$message.error('常用主题列表导入失败', e.message || e)
        }
      }).catch(e=>{
        this.$message.error('常用主题列表导入失败', e.message || e)
      })
    },
    logoSave(){
      const hideloading = this.$message.loading('LOGO 相关设置保存中...', 0)
      this.$axios.put("/config", {
        type: "webUILogo",
        data: this.logo
      }).then(response=>{
        if (response.data.rescode === 0) {
          this.$message.success('LOGO 相关设置修改成功')
          this.$emit('theme', { type: 'logo', ...this.logo })
        } else {
          this.$message.error('LOGO 相关设置修改失败', response.data.message)
        }
      }).catch(e=>{
        this.$message.error('LOGO 相关设修改失败', e.message)
        console.error('LOGO 相关设修改失败', e)
      }).finally(hideloading)
    },
    copyColor(color = ''){
      if (!color) {
        this.$message.error('该项暂无对应值可供复制')
        return
      }
      this.$uApi.copyToClipboard(color).then(res=>{
        this.$message.success('成功复制', color)
      }).catch(error=>{
        this.$message.error('复制失败', error.message)
      })
    },
  }
}
</script>

<style scoped>
.logo_src {
  width: 520px;
}
.menunav_item {
  display: inline-flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  width: 520px;
  margin-bottom: 3px;
}
.theme_style {
  display: inline-flex;
  align-items: center;
  width: 78%;
  padding: 0 .3em;
  margin: 3px 0;
  word-break: keep-all;
}
.theme_item {
  display: inline-flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: space-around;
  flex-wrap: wrap;
  width: 100%;
  padding: 3px 0;
  border-top: 1px solid;
}
.theme_view {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: .5em;
  box-shadow: 0 0 3px;
}
.theme_viewitem {
  width: 5em;
  height: 32px;
  background: var(--main-fc);
  cursor: pointer;
}
.theme_viewitem:first-child {
  border-radius: .5em 0 0 .5em;
}
.theme_viewitem:last-child {
  border-radius: 0 .5em .5em 0;
}
.theme_imexport {
  display: inline-flex;
  justify-content: space-around;
  width: 100%;
  padding: 3px 0;
  border-top: 1px solid;
}
</style>