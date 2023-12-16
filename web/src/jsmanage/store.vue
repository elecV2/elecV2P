<template>
  <div class="storemanage" :class="{ 'storemanage--collapsed': collapse }">
    <h2 class="title">
      <span @click="storeGet" class="icon cursor title_sync" title="更新列表" v-html="icon.sync"></span>
      <span class="title_main" title="ctrl+f 搜索">store/cookie {{ $t('persistence') }} - {{ Object.keys(store).length }}</span>
      <span @click="collapse=!collapse" class="title_collapse" :class="{ 'title_collapse--collapsed': collapse }"></span>
    </h2>
    <ul class="storelists" @click.prevent="storeOp($event)">
      <li v-for="key in storeshow" :key="key" class="storelists_item">
        <span :data-edit="key">{{ key }}</span>
        <span class="item_delete" :data-delete="key">X</span>
      </li>
      <li class="storelists_item storelists_item--showrest" v-show="!!restnum">
        <span @click="shownum=-1">{{ $ta('show', 'rest') }} {{ restnum }}</span>
      </li>
    </ul>
    <div class="editor editor--inner">
      <div class="editor_title">
        <div class="eflex epos_rel">
          <label class="store_label" title="请注意大小写">KEY：</label>
          <input class="editor_input storekey_input" type="text" name="name" placeholder="NEWKEY" v-model.trim='edkey' @keyup.enter.exact="storeEdit(edkey)" @keydown.ctrl.delete.exact="storeDelete(edkey)">
          <button class="elecBtn elecBtn--del" v-show="edkey"
            @click.prevent.stop="storeDelete(edkey)">X</button>
        </div>
        <div class="eflex emargin" title="如不清楚就保持默认">
          <label class="store_label">TYPE：</label>
          <select class="elecTable_select w120" v-model="edvalue.type">
            <option selected="selected">string</option>
            <option>number</option>
            <option value="object">json</option>
            <option>array</option>
            <option>boolean</option>
          </select>
        </div>
        <div class="eflex">
          <label class="minw100">{{ $t('belong') }}:</label>
          <input class="editor_input storebelong_input" v-model.trim.lazy="edvalue.belong" type="text" name="name" placeholder="写入或调用该 store 常量的脚本（可省略）">
        </div>
        <div class="storebelong eflex--wrap">
          <div class="eflex">
            <label class="store_label">{{ $t('note') }}：</label>
            <input class="editor_input storenote_input" v-model.trim.lazy="edvalue.note" type="text" name="name" placeholder="关于该 store 常量的一些说明（可省略）">
          </div>
          <span class="efont" v-show="edvalue.update" title="该 cookie 的最近更新时间">{{ $ta('last', 'update') }}: {{ edvalue.update }}</span>
          <button class="elecBtn elecBtn--h36" @click="viewBelong()">{{ $ta('check', 'belong', 'script') }}</button>
        </div>
      </div>
      <textarea v-model='edvalue.value' @keydown.tab.exact.prevent.stop="$uApi.insertText('  ')" @keydown.ctrl.83.prevent.stop="storeSave()" class="editor_textarea" placeholder="the value of key"></textarea>
      <div class="eflex eflex--wrap w100">
        <button class="elecBtn elecBtn--store" @click="storeSave()" title="快捷键: ctrl+s">{{ $t('save') }}</button>
        <button class="elecBtn elecBtn--store folderbk" @click="storeImport()" title=".json 表示单个 Cookie, .zip 表示所有 Cookie">{{ $t('import') }}</button>
        <button class="elecBtn elecBtn--store" @click="storeExport()">{{ $t('export') }}</button>
        <button class="elecBtn elecBtn--store greenbk" @click="storeBackup()">{{ $ta('backup', 'all') }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import icon from '../utils/icon.js'
export default {
  name: 'storemanage',
  props: ['logs'],
  data(){
    return {
      store: [],
      edkey: '',
      edvalue: {
        type: 'string'
      },
      collapse: true,
      icon,
      shownum: 50,
      restnum: 0,
    }
  },
  computed:{
    storeshow(){
      let snum = this.shownum
      if (snum === -1 || snum >= this.store.length) {
        this.restnum = 0
        return this.store
      }
      let i = 0, fshow = []
      while (i++ < snum) {
        fshow.push(this.store[i])
      }
      this.restnum = this.store.length - i + 1
      return fshow
    }
  },
  created(){
    this.storeGet()
  },
  methods: {
    storeGet(){
      const hideloading = this.$message.loading('正在获取 store 常量...', 0)
      this.$axios.get('/store').then(res=>{
        this.store = res.data
        this.$message.success('成功获取 store 常量 ' + this.store.length)
        this.logs.unshift(`[${this.$logHead('storemanage info')}][${this.$sTime(null, 1)}] 成功获取 store 常量 ${this.store.length}`)
      }).catch(e=>{
        this.$message.error('获取 store 常量失败', e.message)
        this.logs.unshift(`[${this.$logHead('storemanage error')}][${this.$sTime(null, 1)}] 获取 store/cookie 常量失败 ${e.message}`)
        console.error('获取 store 常量失败', e)
      }).finally(hideloading)
    },
    storeEdit(key){
      if (!key) {
        this.$message.error('请先确定要获取的 key 值')
        return
      }
      if (this.store.indexOf(key) === -1) {
        this.$message.error(key, '暂不存在')
        this.logs.unshift(`[${this.$logHead('storemanage error')}][${this.$sTime(null, 1)}] ${key} 暂不存在`)
        return
      }
      const hideloading = this.$message.loading('正在获取', key, '的值...', 0)
      this.$axios.get('/store/' + key).then(res=>{
        this.edkey = key
        if (typeof res.data === 'object' && res.data.type !== undefined && res.data.value !== undefined) {
          this.edvalue = res.data
          if (/^(array|object|json)$/.test(res.data.type)) {
            this.edvalue.value = JSON.stringify(res.data.value, null, 2)
          }
        } else {
          this.edvalue = {
            type: 'string',
            value: typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : res.data
          }
        }
        this.$message.success('成功获取', key, '的值')
        this.logs.unshift(`[${this.$logHead('storemanage info')}][${this.$sTime(null, 1)}] 成功获取 ${key} 的值`)
      }).catch(e=>{
        this.$message.error('获取', key, '数据失败', e.message)
        this.logs.unshift(`[${this.$logHead('storemanage error')}][${this.$sTime(null, 1)}] 获取 ${key} 数据失败 ${e.message}`)
        console.error('获取', key, '数据失败', e)
      }).finally(hideloading)
    },
    storeSave(){
      if (!this.edkey || !this.edvalue.value) {
        this.$message.error('请先输入 KEY 及对应内容')
        return
      }
      if (/array|object|json/.test(this.edvalue.type)) {
        let temval = this.$sJson(this.edvalue.value)
        if (temval) {
          this.edvalue.value = JSON.stringify(temval, null, 2)
        } else {
          this.$message.error('当前输入内容无法转化为 array/object/json 格式')
          return
        }
      }
      if (this.store.indexOf(this.edkey) === -1 || confirm(this.edkey + ' 已存在，是否覆盖？')) {
        const hideloading = this.$message.loading('数据上传保存中...', 0)
        this.$axios.put('/store', { type: 'save', data: { key: this.edkey, value: this.edvalue } }).then(res=>{
          if (res.data.rescode === -1) {
            this.$message.error(this.edkey, '保存失败')
            this.logs.unshift(`[${this.$logHead('storemanage error')}][${this.$sTime(null, 1)}] ${this.edkey} 保存失败 ${res.data.message}`)
          } else {
            this.$message.success(this.edkey, '已保存')
            this.logs.unshift(`[${this.$logHead('storemanage info')}][${this.$sTime(null, 1)}] ${this.edkey} 已保存 ${res.data.message || res.data}`)
            if (this.store.indexOf(this.edkey) === -1) {
              this.store.push(this.edkey)
            }
            if (this.edvalue.type === 'number') {
              this.edvalue.value = Number(this.edvalue.value)
            } else if (this.edvalue.type === 'boolean') {
              this.edvalue.value = this.$uStr.sBool(this.edvalue.value)
            }
            this.$set(this.edvalue, 'update', this.$sTime(null, 0, 0))
          }
        }).catch(e=>{
          this.$message.error('保存失败:', e.message)
          this.logs.unshift(`[${this.$logHead('storemanage error')}][${this.$sTime(null, 1)}] ${this.edkey} 保存失败 ${e.message}`)
          console.error('提交 store 常量失败', e)
        }).finally(hideloading)
      }
    },
    storeDelete(key){
      if (!key) {
        this.$message.error('请先输入要删除的 KEY')
        return
      }
      if (confirm('确定删除：' + key + '，及对应的值？')) {
        const hideloading = this.$message.loading('数据删除中...', 0)
        this.$axios.put('/store', { type: 'delete', data: key }).then(res=>{
          if (res.data.rescode === 0) {
            this.$message.success(key, '已删除')
            this.logs.unshift(`[${this.$logHead('storemanage info')}][${this.$sTime(null, 1)}] ${key} 已删除 ${res.data.message}`)
            const indkey = this.store.indexOf(key)
            if (indkey > -1) {
              this.store.splice(indkey, 1)
            }
            if (this.edkey === key) {
              this.edkey = ''
              this.edvalue = {
                type: 'string'
              }
            }
          } else {
            this.$message.error(key, '删除失败', res.data.message)
            this.logs.unshift(`[${this.$logHead('storemanage error')}][${this.$sTime(null, 1)}] ${key} 删除失败 ${res.data.message}`)
          }
        }).catch(e=>{
          this.$message.error('删除失败：' + e.message)
          this.logs.unshift(`[${this.$logHead('storemanage error')}][${this.$sTime(null, 1)}] ${key} 删除失败 ${e.message}`)
          console.error('删除数据失败', e)
        }).finally(hideloading)
      }
    },
    storeOp(event){
      if (event.target.dataset.edit) {
        this.storeEdit(event.target.dataset.edit)
      } else if (event.target.dataset.delete) {
        this.storeDelete(event.target.dataset.delete)
      } else {
        // event delegate nothing
      }
    },
    viewBelong(){
      if (!this.edvalue.belong) {
        this.$message.error('该 cookie 暂无关联脚本')
        return
      }
      this.$emit('belongview', this.edvalue.belong.replaceAll(/ ?, ?|，| /g, '|'))
    },
    storeExport(){
      if (this.edkey && this.edvalue.value) {
        this.$uApi.saveAsFile({
          key: this.edkey,
          value: this.edvalue,
          update: this.$sTime()
        }, this.edkey + '_elecV2Pstore.json')
      } else {
        this.$message.error('当前 Cookie 值为空')
      }
    },
    async storeImport(){
      let file = await this.$uApi.getFile({ accept: '.json,.zip', type: 'file' })
      if (file.type === 'application/x-zip-compressed') {
        if (!/elecV2P/.test(file.name) && !confirm('当前导入 zip 文件可能并不是 elecV2P store 备份\n确定要继续导入吗？')) {
          return
        }
        const hideloading = this.$message.loading('正在对上传的备份文件进行解析...');
        let formData = new FormData();
        formData.append('backup', file);
        this.$axios.post('/store/backup', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }).then(res=>{
          if (res.data.rescode === 0) {
            console.debug(res.data);
            this.store = res.data.resdata;
            this.$message.success('store 备份成功上传');
            this.logs.unshift(`[${this.$logHead('storeImport info')}][${this.$sTime(null, 1)}] 备份上传成功 ${res.data.message}`);
          } else {
            this.$message.error('备份上传失败', res.data.message);
            this.logs.unshift(`[${this.$logHead('storeImport error')}][${this.$sTime(null, 1)}] store 备份上传失败 ${res.data.message}`);
          }
        }).catch(e=>{
          this.$message.error('上传备份失败', e.message);
          this.logs.unshift(`[${this.$logHead('storeImport error')}][${this.$sTime(null, 1)}] 上传备份失败 ${e.message}`);
          console.error(e);
        }).finally(hideloading);
        return
      }
      if (file.type !== 'application/json') {
        this.$message.error('仅支持 json 格式文件导入')
        return
      }
      let reader = new FileReader()
      reader.onload = event=>{
        let storejson = event.target.result
        // console.debug(storejson)
        let data = this.$sJson(storejson)
        if (data.key && data.value && data.value.type && data.value.value) {
          this.edkey = data.key
          this.edvalue = data.value
          this.logs.unshift(`[${this.$logHead('storeImport info')}][${this.$sTime(null, 1)}] 成功导入 Cookie ${this.edkey}`)
          this.$message.success(`成功导入 Cookie ${this.edkey}`)
        } else {
          console.error('elecV2P 无法解析该文件内容', storejson)
          this.$message.error('导入的 Cookie 文件内容格式不正确', 8)
          this.logs.unshift(`[${this.$logHead('storeImport error')}][${this.$sTime(null, 1)}] 导入的 Cookie 文件内容并非 elecV2P 可解析的格式\n${ storejson.length > 300 ? storejson.slice(-300) + '...' : storejson }`)
        }
      }
      reader.readAsText(file)
    },
    storeBackup(){
      this.$uApi.downloadFile('/backup/store', 'elecV2P_store.zip')
    }
  }
}
</script>

<style scoped>
.storemanage {
  overflow: hidden;
  border-radius: var(--radius-bs);
  margin-bottom: .8em;
}

.storemanage--collapsed {
  height: 48px;
}

.storetitle_key, .storetitle_value {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
}

.store_label {
  width: 72px;
  min-width: 72px;
}

.storenote_input, .storebelong_input {
  font-size: 20px;
}

.storenote_input {
  width: 720px;
}

.storebelong_input {
  width: 480px;
}

.storebelong {
  display: inline-flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 3px;
  margin-bottom: 0;
  width: 100%;
}

.storekey_input {
  width: 360px;
  max-width: 100%;
}

.storelists {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  border-left: 1em solid var(--main-bk);
  border-right: 1em solid var(--main-bk);
  max-height: 266px;
  overflow-y: auto;
}

.item_delete {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: 1em;
  height: 100%;
  cursor: pointer;
  right: 0;
  opacity: 0;
  padding: 2px 0;
  border-radius: 0 6px 6px 0;
  background-color: var(--delt-bk);
}

.item_delete:hover{
  opacity: 1;
}

.storelists_item{
  height: 34px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--main-fc);
  background: var(--main-cl);
  padding-left: 1em;
  margin: .1em .3em;
  border-radius: 6px;
  font-size: 20px;
  cursor: pointer;
  word-break: break-word;
}

.storelists_item--showrest {
  padding-right: 1em;
  background: var(--secd-fc);
}

.editor_textarea {
  height: 200px;
  min-height: 200px;
}

.elecBtn--store {
  width: 180px;
  min-width: fit-content;
  font-size: 22px;
  margin-top: 3px;
}
</style>