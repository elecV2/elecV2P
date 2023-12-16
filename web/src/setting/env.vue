<template>
  <div class="setting setting--vflex" :class="{ 'setting--collapsed': collapse }" @keydown.ctrl.83.prevent.stop="envSave()">
    <h4 class="setting_title">
      <sapn class="title_main">环境变量相关设置</sapn>
      <span @click="collapse=!collapse" class="title_collapse" :class="{ 'title_collapse--collapsed': collapse }"></span>
    </h4>
    <div v-show="!collapse" class="w100">
      <div class="eflex w100 emargin">
        <label class="minw160">PATH</label>
        <textarea class="editor_textarea editor_textarea--mini emargin--left" v-model="config.path" placeholder="路径/PATH 分隔符 WIN系统-分号(;) 其他系统-冒号(:)"></textarea>
      </div>
      <div class="eflex w100 emargin" v-for="(envk, idx) in config.other" :key="idx">
        <input class="elecTable_input minw160" type="text" v-model.trim="envk[0]" placeholder="变量名称">
        <textarea class="editor_textarea editor_textarea--oneline emargin--left" v-model.trim="envk[1]" placeholder="变量对应值"></textarea>
        <span class="icon--op" @click="$delete(config.other, idx)" v-html="icon.delete"></span>
      </div>
    </div>
    <div class="eflex w100" v-show="!collapse">
      <button class="elecBtn elecBtn--stlong wp46" @click.prevent.stop="envNew()">{{ $t('new') }}</button>
      <button class="elecBtn elecBtn--stlong wp46" @click.prevent.stop="envSave()">{{ $t('save') }}</button>
    </div>
  </div>
</template>

<script>
import icon from '../utils/icon.js'
export default {
  name: "env",
  props: ['config'],
  data(){
    return {
      icon,
      collapse: this.$uStr.iRandom(0, 10) > 5,
    }
  },
  methods: {
    envNew(){
      this.config.other.push(['', ''])
    },
    envSave(){
      if (!this.config.path) {
        this.$message.error('请先输入 PATH 变量对应值再进行保存')
        return
      }
      if (/[\*\?"<>\|]/.test(this.config.path) && !confirm('PATH 中包含特殊字符，确认继续保存？')) {
        return
      }
      let env_delkey = [], save_key = []
      if (this.config.other.length) {
        for (const s of this.config.other) {
          if (!(s[0] && s[1])) {
            this.$message.error('部分环境变量或对应值为空，请填写后再进行保存')
            return
          }
          save_key.push(s[0])
        }
      }
      this.config.dable.forEach(key=>{
        if (save_key.indexOf(key) === -1) {
          env_delkey.push(key)
        }
      })
      const hideloading = this.$message.loading('环境变量相关设置保存中...', 0)
      this.$axios.put("/config", {
        type: "env",
        data: {
          path: this.config.path,
          other: this.config.other,
          todel: env_delkey,
        }
      }).then(response=>{
        if (response.data.rescode === 0) {
          this.$message.success('环境变量相关设置修改成功')
          this.config.dable = this.config.other.map(s=>s[0])
        } else {
          this.$message.error('环境变量相关设置修改失败', response.data.message)
        }
      }).catch(e=>{
        this.$message.error('环境变量相关设修改失败', e.message)
        console.error('环境变量相关设修改失败', e)
      }).finally(hideloading)
    },
  }
}
</script>
