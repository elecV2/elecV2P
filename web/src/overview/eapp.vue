<template>
  <div class="eapp" v-if="eapp.enable">
    <div class="eapp_container">
      <div v-for="(app, idx) in apps" class="eapp_item" :class="{ 'eapp_item--run': bRun[idx] }"
        :key="app.hash"
        :draggable="bEdit"
        @dragstart="dragStart($event, idx)"
        @dragenter="dragEnter($event, idx)"
        @dragend="dragEnd($event, idx)">
        <img class="eapp_logo" :src="applogo[idx]" :alt="app.target"
          @click.prevent="epOpera(idx)" :data-param="idx" :title="app.note || app.target"
          @error="epLogoErr(idx, $event)"
          :class="{ shake: bEdit, 'shake--alt': idx % 2 }" />
        <span class="eapp_name" :title="app.name">{{ app.name }}</span>
        <span class="eapp_delete" :class="{ hide: !bEdit }" @click.prevent="epMove(idx)">X</span>
      </div>
      <div class="eapp_item eapp_item--edit">
        <button v-if="!bEdit" class="elecBtn elecBtn--h36 bk_main_bk" @click.prevent="epEdit()">{{ $t('neweapp') }}</button>
        <select v-else class="elecBtn elecBtn--h36 minw100" v-model.number="eapp.logo_type" :title="$t('choose')+' LOGO '+$t('style')">
          <option value="1" selected>{{ $t('style') }} 1</option>
          <option value="2">{{ $t('style') }} 2</option>
          <option value="3">{{ $t('style') }} 3</option>
        </select>
        <button class="elecBtn elecBtn--h36" :class="{ 'bk_main_bk': !bEdit }" @click.prevent="epSave()">{{ bEdit ? $t('editexit') : $t('editmode') }}</button>
      </div>
    </div>
    <log :logs="logs" :title="'EAPP ' + $t('logs')" />
  </div>
</template>

<script>
import log from '../utils/log.vue'

export default {
  name: "eapp",
  props: ['fresh'],
  data(){
    return {
      eapp: {
        enable: true,
        logo_type: 1,
        apps: [],
      },
      apps: [],
      logs: [],
      bEdit: false,
      dragSce: null,
      dragIdx: -1,
      toSave: false,
      logo_type_org: 1,
    }
  },
  computed: {
    applogo(){
      return this.apps.map(app=>app.logo || this.$uApi.hashToLogo(app.hash, app.name, Number(this.eapp.logo_type)))
    },
    bRun(){
      return this.apps.map(()=>false)
    }
  },
  watch: {
    fresh() {
      this.epInit(false);
    },
  },
  components: {
    log,
  },
  created(){
    this.$wsrecv.add('eapp', data=>{
      if (this.logs.length >= 100 || /\x1b\[H/.test(data)) {
        this.logs = [data]
      } else if (/\r|(\x1b\[F)/.test(data)) {
        this.logs.splice(0, 1, data)
      } else {
        this.logs.unshift(data)
      }
    })

    this.epInit()
  },
  methods: {
    epInit(initOpen = true){
      this.$axios.get('/eapp').then(res=>{
        if (res.data.rescode === 0) {
          this.eapp = res.data.resdata
          this.apps = this.eapp.apps.filter(app=>app && app.name && app.type && app.target)
          if (initOpen) {
            this.apps.forEach((app, idx)=>{
              if (app.run === 'auto') {
                this.logs.unshift(`[${this.$logHead('eapp notify')}][${this.$sTime(null, 1)}] AUTO RUN EAPP: ${app.name}`)
                this.epOpen(idx)
              }
            })
          }
        }
      }).catch(e=>{
        this.logs.unshift(`[${this.$logHead('eapp error')}][${this.$sTime(null, 1)}] \x1b[31m首页 eapp 列表获取失败 ${e.message}\x1b[0m`)
        console.error('获取失败', e)
      })
    },
    epOpera(idx){
      if (this.bEdit) {
        this.epEdit(idx)
      } else {
        this.epOpen(idx)
      }
    },
    epLogoErr(idx, event){
      const app = this.apps[idx]
      this.logs.unshift(`[${this.$logHead('eapp error')}][${this.$sTime(null, 1)}] \x1b[31mEAPP ${app.name} logo 加载失败，生成默认图标\x1b[0m`)
      event.target.src = this.$uApi.hashToLogo(app.hash, app.name, this.eapp.logo_type)
    },
    epOpen(idx = 0){
      const app = { ...this.apps[idx] }
      if (!(app.name && app.type && app.target)) {
        this.$message.error('eapp 内容不完整')
        return
      }
      if (this.bRun[idx]) {
        this.$message.success(app.name, '运行中')
        return
      }
      if (!/%ei%/.test(app.target)) {
        this.epRun(app, idx)
        return
      }
      let tararg = app.target.split('%ei%'),
          tarcont = this.$uStr.escapeHtml(app.target).replace(/%ei%/g, '<input name="eapp_arg" class="elecTable_input" style="width: 120px;" placeholder="%ei%">');
      let rAxios = this.$axios, rMessage = this.$message, rRun = this.epRun, eid = 'eapp_' + this.$uStr.euid(4);
      this.$evui({
        id: eid,
        title: app.name + ' - ' + app.type.toUpperCase(),
        width: 600,
        height: null,
        style: {
          content: 'margin: .3em; font-family: var(--font-fm);'
        },
        content: `<div class="w100 center ${eid}">${tarcont}</div><div class="center" style="margin-top: .5em;"><button class="elecBtn greenbk" data-method="epRun" data-close="true">执行</button></div>`,
        methods: {
          epRun(){
            let eargs = document.querySelectorAll(`.${eid} .elecTable_input[name=eapp_arg]`)
            let ftarg = ''
            eargs.forEach((arg, idx)=>{
              ftarg += tararg[idx] + arg.value
            })
            app.target = ftarg + tararg.pop()
            rRun(app, idx)
          }
        }
      })
    },
    epRun(app, idx){
      switch(app.type) {
      case 'efh':
        this.$uApi.open('run/?target=' + encodeURI(app.target))
        this.logs.unshift(`[${this.$logHead('eapp notify')}][${this.$sTime(null, 1)}] 执行 EFH: ${ app.target }`)
        break
      case 'url':
        this.$uApi.open(app.target)
        this.logs.unshift(`[${this.$logHead('eapp notify')}][${this.$sTime(null, 1)}] 打开网址: ${ app.target }`)
        break
      case 'eval':
        this.logs.unshift(`[${this.$logHead('eapp notify')}][${this.$sTime(null, 1)}] EVALRUN: ${ app.name }`)
        this.logs.unshift(`[${this.$logHead('eapp notify')}][${this.$sTime(null, 1)}] EVALRUN RESULT: ${ this.$sString(this.$uApi.evalRun(app.target)) || '没有返回数据' }`)
        break
      case 'shell':
      case 'js':
        if (!this.$wsrecv.connected) {
          this.logs.unshift(`[${this.$logHead('eapp error')}][${this.$sTime(null, 1)}] \x1b[31mwebsocket 尚未连接，运行日志无法传输`)
        }
        this.bRun[idx] = true
        this.$axios.post('/eapp/run', {
          app, id: this.$wsrecv.id,
        }).then(response=>{
          this.bRun[idx] = false
          if (response.data.rescode === 0) {
            this.logs.unshift(`[${this.$logHead('eapp info')}][${this.$sTime(null, 1)}] ${ response.data.message }`)
          } else {
            this.logs.unshift(`[${this.$logHead('eapp error')}][${this.$sTime(null, 1)}] \x1b[31m执行 ${ app.target } 失败 ${ response.data.message }`)
          }
        }).catch(e=>{
          this.bRun[idx] = false
          this.logs.unshift(`[${this.$logHead('eapp error')}][${this.$sTime(null, 1)}] \x1b[31m执行 ${ app.target } 失败 ${ e.message }`)
          console.error(app.target, '执行失败', e)
        })
        break
      default:
        this.$message.error(`未知 EAPP 类型: ${app.type}`)
        this.logs.unshift(`[${this.$logHead('eapp error')}][${this.$sTime(null, 1)}] \x1b[31m未知 EAPP 类型: ${app.type}`)
      }
    },
    epEdit(idx = -1){
      const apps = this.apps
      const app = apps[idx] || {
        name: this.$t('name'),
        logo: '',
        type: 'js',
        target: 'test.js',
      }
      let rAxios = this.$axios, rMessage = this.$message;
      this.$evui({
        id: 'eapp_new',
        title: app.hash ? this.$t('edit') + ' EAPP - ' + app.name : this.$t('new') + ' EAPP',
        width: 600,
        height: null,
        style: {
          content: 'margin: .3em; font-family: var(--font-fm);'
        },
        content: `<div class="eflex w100"><input name="eapp_name" class="elecTable_input" style="width: 120px;margin-right: 5px;" placeholder="应用名称" value="${ this.$uStr.escapeHtml(app.name) }"><input name="eapp_logo" class="elecTable_input" placeholder="显示图标 logo https://xxx/x.png，可省略" value="${ this.$uStr.escapeHtml(app.logo) }"></div><div class="eflex w100 emargin--top"><select name="eapp_type" class="elecTable_select" style="width: 120px;margin-right: 5px;" title="应用类型"><option value="js" ${ app.type === 'js' ? 'selected' : '' }>JS</option><option value="efh" ${ app.type === 'efh' ? 'selected' : '' }>EFH</option><option value="shell" ${ app.type === 'shell' ? 'selected' : '' }>SHELL</option><option value="url" ${ app.type === 'url' ? 'selected' : '' }>打开网址</option><option value="eval" ${ app.type === 'eval' ? 'selected' : '' }>EVALRUN</option></select><textarea name="eapp_target" class="editor_textarea editor_textarea--oneline" placeholder="执行目标 比如 test.js 或 node -v 等">${ this.$uStr.escapeHtml(app.target) }</textarea></div><div class="eflex w100 emargin--top eapp_more hide" style="border-top: 1px solid;padding-top: 3px;"><select name="eapp_run" class="elecTable_select" style="width: 120px;margin-right: 5px;" title="运行方式（在打开首页时）"><option value="auto" ${ app.run === 'auto' ? 'selected' : '' }>${ this.$t('autorun') }</option><option value="click" ${ (!app.run || app.run === 'click') ? 'selected' : '' }>${ this.$t('clickrun') }</option></select><input name="eapp_note" class="elecTable_input" placeholder="备注信息，可省略" value="${ this.$uStr.escapeHtml(app.note) }"></div><div class="center" style="margin-top: .5em;"><button class="elecBtn elecBtn--more efloat--left" data-method="moreToggle">≫</button><button class="elecBtn greenbk" data-method="save" data-close="true">保存</button></div>`,
        methods: {
          moreToggle(event){
            const classes = event.target.classList,
                  eappmore = document.querySelector('.eapp_more').classList;
            if (classes.contains('elecBtn--moreup')) {
              classes.remove('elecBtn--moreup');
              eappmore.add('hide');
            } else {
              classes.add('elecBtn--moreup');
              eappmore.remove('hide');
            }
          },
          save(){
            app.name = document.querySelector('.elecTable_input[name=eapp_name]').value;
            app.logo = document.querySelector('.elecTable_input[name=eapp_logo]').value;
            app.type = document.querySelector('.elecTable_select[name=eapp_type]').value;
            app.target = document.querySelector('.editor_textarea[name=eapp_target]').value;
            app.run = document.querySelector('.elecTable_select[name=eapp_run]').value;
            app.note = document.querySelector('.elecTable_input[name=eapp_note]').value;
            if (!(app.name && app.type && app.target)) {
              rMessage.error('EAPP 内容填写不完整，请修改后再保存');
              return;
            }
            rAxios.put('/eapp', {
              idx, ...app,
            }).then(res=>{
              if (res.data.rescode === 0) {
                rMessage.success('成功添加应用', app.name);
                app.hash = res.data.resdata;
                if (idx === -1) {
                  apps.push(app);
                }
              } else {
                rMessage.error('添加应用失败', res.data.message);
              }
            }).catch(e=>{
              rMessage.error('添加应用失败', e.message);
              console.error('添加应用失败', e);
            })
          }
        }
      })
    },
    epMove(idx){
      idx = Number(idx)
      if (this.apps[idx] && confirm(`确定移除应用 ${this.apps[idx].name}？`)) {
        const name = this.apps[idx].name
        const hideloading = this.$message.loading(`正在删除应用 ${name}...`, 0)
        this.$axios.delete(`/eapp/${idx}`).then(res=>{
          if (res.data.rescode === 0) {
            this.apps.splice(idx, 1)
          }
        }).catch(e=>{
          this.$message.error(`${name} 删除失败`, e.message)
          console.error(`${name} 删除失败`, e)
        }).finally(hideloading)
      }
    },
    epSave(){
      if (!this.bEdit) {
        this.bEdit = true
        this.logo_type_org = this.eapp.logo_type || 1
        return
      }
      if (this.toSave && confirm(`确定保存当前应用列表 ${ this.apps.length }？`)) {
        const hideloading = this.$message.loading(`应用列表保存中...`, 0)
        this.$axios.post(`/eapp`, {
          enable: this.eapp.enable,
          logo_type: this.eapp.logo_type,
          apps: this.apps,
        }).then(res=>{
          if (res.data.rescode === 0) {
            this.$message.success('保存成功')
          } else {
            this.$message.error('保存失败', res.data.message)
            console.error('保存失败', res.data)
          }
        }).catch(e=>{
          this.$message.error(`保存失败`, e.message)
          console.error(`保存失败`, e)
        }).finally(hideloading)
      } else if (this.eapp.logo_type !== this.logo_type_org) {
        const hideloading = this.$message.loading(`应用 LOGO 风格 ${this.eapp.logo_type}...`, 0)
        this.$axios.put(`/eapp/logo_type`, {
          logo_type: this.eapp.logo_type,
        }).then(res=>{
          if (res.data.rescode === 0) {
            this.$message.success('新的 LOGO 风格应用成功')
            this.logs.unshift(`[${this.$logHead('eapp notify')}][${this.$sTime(null, 1)}] 成功应用新的 LOGO 风格 ${ this.eapp.logo_type }`)
          } else {
            this.$message.error('新的 LOGO 风格应用失败', res.data.message)
            console.error('新的 LOGO 风格应用失败', res.data)
          }
        }).catch(e=>{
          this.$message.error(`新的 LOGO 风格保存失败`, e.message)
          console.error(`新的 LOGO 风格应用失败`, e)
        }).finally(hideloading)
      }
      this.bEdit = false
      this.toSave = false
    },
    dragStart(event, idx){
      event.dataTransfer.effectAllowed = "move"
      this.dragIdx = idx
      this.dragSce = this.apps[idx]
    },
    dragEnter(event, idx){
      event.preventDefault()
      if (this.dragIdx === -1) {
        return
      }
      if (this.dragIdx !== idx) {
        this.apps.splice(this.dragIdx, 1)
        this.apps.splice(idx, 0, this.dragSce)
        this.dragIdx = idx
      }
    },
    dragEnd(event, idx){
      this.dragIdx = -1
      this.toSave = true
    },
  }
}
</script>

<style scoped>
.eapp {
  margin-bottom: 6em;
  border-radius: var(--radius-bs);
}
.eapp_container {
  display: grid;
  grid-template-columns: repeat(auto-fill, 108px);
  row-gap: .5em;
  justify-content: space-around;
  padding: .5em;
  border: .5em solid var(--main-bk);
  border-bottom: 0;
  border-radius: var(--radius-bs) var(--radius-bs) 0 0;
}
.eapp_item {
  position: relative;
  width: 108px;
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  vertical-align: top;
  border-radius: var(--radius-bs);
}
.eapp_item--run {
  background: var(--secd-bk);
}
.eapp_item--edit {
  height: 82px;
  justify-content: space-between;
}
.eapp_logo {
  width: 60px;
  height: 60px;
  border-radius: var(--radius-bs);
  word-break: break-all;
  overflow: hidden;
  cursor: pointer;
}
.eapp_name {
  width: 100px;
  height: 22px;
  display: inline-block;
  overflow: hidden;
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: var(--main-bk);
}
.eapp_delete {
  position: absolute;
  top: -3px;
  right: 20px;
  color: var(--note-bk);
  background: var(--main-fc);
  padding: 0 8px;
  border-radius: var(--radius-bs);
  font-size: 18px;
  opacity: .8;
  cursor: pointer;
}
.eapp_delete:hover {
  opacity: 1;
}
.loginfo {
  margin-top: 0;
  padding-top: 3px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
</style>