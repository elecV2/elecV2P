<template>
  <div class="mock" :class="{ 'mock--collapsed': collapse }">
    <h4 class="title title--mock">
      <span class="title_main">{{ $ta('mock', 'HTTP', 'request') }}</span>
      <span @click="collapse=!collapse" class="title_collapse" :class="{ 'title_collapse--collapsed': collapse }"></span>
    </h4>
    <div class="eflex eflex--wrap">
      <select class="elecTable_select w120 emargin--top" v-model="method">
        <option>GET</option>
        <option>PUT</option>
        <option>POST</option>
        <option>DELETE</option>
      </select>
      <input class="elecTable_input eflex_grow1 wp50 emargin--d5em" v-model.lazy.trim="apiurl">
      <select class="elecTable_select w220 emargin--top" v-model="mocktype">
        <option value="fetch">from {{ $t('browser') }}</option>
        <option value="axios">from elecV2P</option>
      </select>
    </div>
    <div class="eflex eflex--wrap">
      <label class="mock_label" title="网络请求头">HEADERS：</label>
      <select class="elecTable_select w220 emargin--top" v-model="headertype" title="Content-Type">
        <option>text/plain</option>
        <option>application/json</option>
        <option>application/x-www-form-urlencoded</option>
      </select>
      <label class="mock_label emargin--left" title="headers more">{{ $t('more').toUpperCase() }}：</label>
      <input class="elecTable_input eflex_grow1 wp50 emargin--top" v-model.lazy.trim="headermore" placeholder="{ Cookie: '123' }">
    </div>
    <textarea class="editor_textarea editor_textarea--mini" v-model.lazy.trim="body" placeholder="request body. 网络请求体"></textarea>
    <div class="eflex">
      <button class="elecBtn elecBtn--stlong" @click="mockreq()">{{ $ta('send', 'request') }}</button>
      <button class="elecBtn elecBtn--stlong emargin--left" @click="jsnameshow=true">{{ $ta('make', 'script') }}</button>
    </div>
    <div class="mockjsname" v-if="jsnameshow">
      <label class="mock_label">{{ $ta('script', 'name') }}：</label>
      <input class="elecTable_input w220" v-model.lazy.trim="jsname" @keyup.enter="mockjs()">
      <button class="elecBtn emargin--d5em greenbk" @click="mockjs()">{{ $t('confirm') }}</button>
      <button class="elecBtn elecBtn--stop minw62" @click="jsnameshow=false">X</button>
    </div>
  </div>
</template>

<script>
export default {
  name: "mock",
  props: ['jslists'],
  data(){
    return {
      method: 'GET',
      apiurl: 'https://httpbin.org/get',
      mocktype: 'fetch',
      headertype: 'text/plain',
      headermore: '{}',
      body: null,
      jsname: 'elecV2Pmock.js',
      jsnameshow: false,
      collapse: true
    }
  },
  computed: {
    headers(){
      let newheader = {
        "Content-Type": this.headertype + ';charset=utf-8',
      }
      let hm = this.$sJson(this.headermore)
      if (hm) {
        Object.assign(newheader, hm)
      } else {
        this.$message.error('headers 附加内容并不是正确的 JSON 格式')
        this.$wsrecv.dispatch('jsmanage', `[${this.$logHead('mockreq error')}][${this.$sTime(null, 1)}] headers 附加内容 ${this.headermore} 并不是正确的 JSON 格式`)
      }
      return newheader
    }
  },
  methods: {
    mockreq(){
      const request = {
        url: this.apiurl,
        method: this.method,
        headers: this.headers,
        body: this.body
      }
      if (/json/.test(request.headers["Content-Type"])) {
        let body = this.$sJson(this.body)
        if (body) {
          request.body = body
        } else {
          console.error('body 内容并不是正确的 JSON 格式')
          this.$message.error('body 内容并不是正确的 JSON 格式')
          return
        }
      }
      if (request.body) {
        request.body = this.$sString(request.body)
      } else {
        request.body = null
      }
      const hideloading = this.$message.loading('网络请求已执行，等待数据返回...', 0)
      if (this.mocktype === 'fetch') {
        fetch(request.url, request).then(res=>res.text()).then(res=>{
          this.$message.success('网络请求成功')
          res = `[${this.$logHead('mockFetch result')}][${this.$sTime(null, 1)}] ${res}`
          this.$wsrecv.dispatch('jsmanage', res)
        }).catch(e=>{
          this.$message.error('fetch 请求失败', e.message)
          let emsg = `[${this.$logHead('mockFetch error')}][${this.$sTime(null, 1)}] fetch 请求失败 ${e.message}`
          this.$wsrecv.dispatch('jsmanage', emsg)
          console.error('fetch 请求失败', e)
        }).finally(hideloading)
      } else {
        this.$axios.put("/mock", {
          type: 'req',
          request
        }).then(res=>{
          this.$message.success('网络请求', res.data.message);
          // 后台会 dispatch jsmanage log 模块，无需手动添加
          console.debug(res.data);
        }).catch(e=>{
          this.$message.error('请求失败', e.message);
          console.error(e);
        }).finally(hideloading)
      }
    },
    mockjs(){
      this.jsnameshow = false
      const request = {
        url: this.apiurl,
        method: this.method,
        headers: this.headers
      }
      if (/json/.test(request.headers["Content-Type"])) {
        let body = this.$sJson(this.body)
        if (body) {
          request.body = body
        } else {
          console.error('body 内容并不是正确的 JSON 格式')
          this.$message.error('body 内容并不是正确的 JSON 格式')
          return
        }
      } else {
        request.body = this.body
      }
      if (this.jslists.indexOf(this.jsname) > -1 && !confirm(this.jsname + ' 已存在，是否覆盖？')) {
        return
      }
      const hideloading = this.$message.loading('JS 脚本生成中...', 0)
      this.$axios.put("/mock", {
        type: 'js',
        jsname: this.jsname,
        request
      }).then(res=>{
        this.$message.success('脚本已保存', res.data.message)
        this.jslists.push(this.jsname)
      }).catch(e=>{
        this.$message.error('请求失败', e.message)
        console.error(e)
      }).finally(hideloading)
    }
  }
}
</script>

<style scoped>
.mock {
  display: flex;
  flex-direction: column;
  background: var(--main-bk);
  border-radius: var(--radius-bs);
  padding: 0 10px;
  margin: var(--base-sz) 0;
  overflow: hidden;
}

.mock--collapsed {
  height: 41px;
}

.title--mock {
  padding: 3px 0;
  border-bottom: 1px solid;
}

.mock_label {
  color: var(--main-fc);
  font-size: 22px;
  line-height: 40px;
}

.mockjsname {
  position: fixed;
  top: 40%;
  margin: auto;
  text-align: center;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  width: fit-content;
  max-width: 100%;
  padding: 10px var(--padding-lr);
  border-radius: var(--radius-bs);
  background: var(--main-cl);
  font-size: 20px;
}
</style>