<template>
  <div class="setting setting--vflex" :class="{ 'setting--collapsed': collapse }" @keydown.ctrl.83.prevent.stop="eAxiosSave()">
    <h4 class="setting_title">
      <sapn class="title_main">{{ $ta('web', 'request', 'setting_of') }}</sapn>
      <span @click="collapse=!collapse" class="title_collapse" :class="{ 'title_collapse--collapsed': collapse }"></span>
    </h4>
    <div class="w100" v-show="!collapse"><div class="setting setting--inline">
      <div>
        <label>TIMEOUT(ms): </label>
        <input type="number" v-model.number="config.timeout" class="setting_input setting_input--number" placeholder="0:不限制">
      </div>
      <div class="minw320">
        <label title="当 header 中没有 User-Agent 时，使用此 UA">User-Agent: </label>
        <select v-model="config.uagent" class="elecTable_select w220">
          <option v-for="(name, u) in ualists" :value="u">{{ name }}</option>
        </select>
        <button @click="bUAManage=!bUAManage" class="elecBtn" :class="{ 'elecBtn--check': bUAManage }">{{ $t('manage') }}</button>
      </div>
      <div>
        <label title="process.env.NODE_TLS_REJECT_UNAUTHORIZED，建议始终勾选">REJECT_UNAUTHORIZED: </label>
        <input class="echeckbox emargin" type="checkbox" v-model="config.reject_unauthorized">
      </div>
      <div class="eflex">
        <label>HTTP {{ $t('proxy') }}:</label>
        <checkbox :oCheck="config.proxy" />
      </div>
    </div>
    <div v-show="bUAManage" class="setting setting--inline setting--ua" @keydown.ctrl.83.prevent.stop="uaSave()">
      <table class="elecTable elecTable--ua">
        <thead>
          <tr>
            <th class="elecTable_th elecTable_th--name">{{ $t('name') }}</th>
            <th class="elecTable_th minw600">{{ $t('content') }}</th>
            <th class="elecTable_th minw62">{{ $t('operate_short') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(ua, key) in uagent" :key="key">
            <td class="elecTable_td">
              <input v-model.trim="ua.name" placeholder="chrome 浏览器" class="elecTable_input">
            </td>
            <td class="elecTable_td">
              <input v-model.trim="ua.header" placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36" class="elecTable_input">
            </td>
            <td class="elecTable_td">
              <span class='icon--op' @click='uaDelete(key)' v-html="icon.delete" />
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="elecTable_td padding0">
              <span class="elecTable_addbtn" @click="uaAdd()">{{ $t('add') }} UA</span>
              <span class="elecTable_addbtn" @click="uaSave()">{{ $ta('save', 'current', 'list') }}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div v-show="config.proxy.enable" class="setting_proxy">
      <div class="setting setting--inline">
        <label>
          <span>PORT:</span>
          <input v-model.number="config.proxy.port" class="setting_input setting_input--number" type="number" placeholder="8001">
        </label>
        <label class="wp46">
          <span>HOST:</span>
          <input v-model.lazy="config.proxy.host" class="setting_input" placeholder="可选。如省略表示使用本地代理">
        </label>
        <label>
          <span>AUTH:</span>
          <input v-model="isAuth" type="checkbox" class="echeckbox">
        </label>
      </div>
      <div v-if="isAuth" class="setting setting--inline">
        <label class="eflex mp46">
          <span>USERNAME:</span>
          <input v-model.lazy="config.proxy.auth.username" class="setting_input">
        </label>
        <label class="eflex mp46">
          <span>PASSWORD:</span>
          <input v-model.lazy="config.proxy.auth.password" class="setting_input">
        </label>
      </div>
    </div>
    <div class="setting_proxy" title="谨慎选择是否开启，不合理的设置可能会导致正常的网络请求被屏蔽">
      <div class="setting setting--inline">
        <div class="eflex">
          <label class="minw160" title="可使用 request.token: '你的webhook token' 绕过屏蔽检测">{{ $t('forbid') }} URL</label>
          <checkbox :oCheck="config.block" />
        </div>
        <input v-model.lazy="config.block.regexp" class="setting_input setting_input--middle" placeholder="匹配内容 比如: abc|123 匹配方式: new RegExp('该内容').test(url)">
        <span class="tip">当网络请求 url 符合此正则表达式时，屏蔽该请求</span>
      </div>
      <div class="setting setting--inline">
        <div class="eflex">
          <label class="minw160">{{ $t('allowed') }} URL</label>
          <checkbox :oCheck="config.only" />
        </div>
        <input v-model.lazy="config.only.regexp" class="setting_input setting_input--middle" placeholder="匹配内容 其他所有不符合该正则表达式的网络请求将被直接屏蔽掉">
        <span class="tip">开启时，仅允许符合此正则表达式的网络请求通过</span>
      </div>
    </div>
    <i class="tip tip--small">该部分设置适用于服务器端 文件下载/JS/mock 等模块发起的网络请求。URL 匹配方式: new RegExp('匹配内容').test(url)</i>
    <div><button @click="eAxiosSave()" class="elecBtn elecBtn--stlong">{{ $t('save') }}</button></div>
  </div></div>
</template>

<script>
import icon from '../utils/icon.js'
import checkbox from '../utils/checkbox.vue'

export default {
  name: "eAxios",
  props: ['config', 'uagent'],
  data(){
    return {
      icon,
      collapse: this.$uStr.iRandom(0, 10) > 5,
      bUAManage: false
    }
  },
  computed: {
    ualists(){
      let uals = {}
      for (let ua in this.uagent) {
        uals[ua] = this.uagent[ua].name
      }
      return uals
    },
    isAuth: {
      get(){
        return Boolean(this.config.proxy && this.config.proxy.auth)
      },
      set(val){
        if (val) {
          this.$set(this.config.proxy, 'auth', {})
        } else {
          this.$delete(this.config.proxy, 'auth')
        }
      }
    }
  },
  components: {
    checkbox
  },
  methods: {
    uaDelete(key){
      this.$message.success('User-Agent:', this.uagent[key].name, '已删除，保存后生效')
      this.$delete(this.uagent, key)
    },
    uaAdd(){
      this.$set(this.uagent, this.$uStr.euid(), {
        name: '我的 UA',
        header: this.$uApi.getUA()
      })
    },
    uaSave(){
      const hideloading = this.$message.loading('User-Agent 列表上传更新中...', 0)
      this.$axios.put("/config", { type: "uagent", data: this.uagent }).then(response => {
        this.$message.success('设置成功', response.data.message)
      }).catch(e=>{
        this.$message.error('设置失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    eAxiosSave(){
      const hideloading = this.$message.loading('网络请求相关设置保存中...', 0)
      this.$axios.put("/config", { type: "eAxios", data: this.config }).then(response => {
        if (response.data.rescode === 0) {
          this.$message.success('网络请求相关设置更改成功', response.data.message)
        } else {
          this.$message.error('设置失败', response.data.message)
        }
      }).catch(e=>{
        this.$message.error('设置失败', e.message)
        console.log(e)
      }).finally(hideloading)
    }
  }
}
</script>

<style scoped>
.elecTable--ua {
  border: 2px solid transparent;
}

.setting.setting--ua {
  display: block;
  margin-top: 0;
  overflow-x: auto;
  border: 2px solid var(--main-cl);
}

.setting_proxy {
  display: flex;
  justify-content: space-around;
  flex-direction: column;
  flex-wrap: wrap;
  width: 100%;
  margin-bottom: 3px;
  border: 1px solid;
  border-radius: var(--radius-bs);
}
</style>