<template>
  <div class="setting setting--vflex" :class="{ 'setting--collapsed': collapse }" @keydown.ctrl.83.prevent.stop="securitySave()">
    <h4 class="setting_title">
      <div class="title_main">
        <span title="仅对 webUI 端口有效">{{ $ta('security', 'access', 'setting_of') }}</span>
        <input v-model="config.enable" type="checkbox" name="status" class="echeckbox emargin" title="是否开启安全访问">
      </div>
      <span @click="collapse=!collapse" class="title_collapse" :class="{ 'title_collapse--collapsed': collapse }"></span>
    </h4>
    <div v-show="!collapse && config.enable" class="w100">
      <div class="radius_bs border emargin"><div class="setting setting--inline">
        <div class="wp50">
          <label class="setting_label">{{ $ta('allowed', 'access') }} IP（{{ $t('whitelist') }}）：</label>
          <textarea v-model.trim="whitelist" name="whitelist" class="editor_textarea" placeholder="127.0.0.1
192.168.1.101
182.xxx.x.125
(仅可设置为 IP 地址)
(白名单优先级高于黑名单)"></textarea>
        </div>
        <div class="wp50">
          <label class="setting_label">{{ $ta('forbid', 'access') }} IP（{{ $t('blacklist') }}）：</label>
          <textarea v-model.trim="blacklist" name="blacklist" class="editor_textarea" placeholder="172.20.10.2
*
单独星号字符 * 表示屏蔽所有（只允许白名单中的 IP 通过）
如果设置为 *，请务必先记下 WEBHOOK TOKEN"></textarea>
        </div>
      </div>
      <div class="eflex eflex--wrap w100">
        <div class="eflex" title="启用后，仅 webhook 接口可访问">
          <label class="setting_label">WEBHOOK ONLY</label>
          <checkbox :oCheck="config" oKey="webhook_only" oInit="false" />
        </div>
        <div class="eflex" title="不启用时，webUI 将不可使用授权 cookie 进行访问">
          <label class="setting_label">{{ $t('allow') }} cookie</label>
          <checkbox :oCheck="config.cookie" />
        </div>
        <div title="0: 表示不通知">
          <label>{{ $t('every') }} </label>
          <input v-model.number="config.numtofeed" type="number" name="numtofeed" class="setting_input setting_input--number" placeholder="0: 不通知">
          <label> {{ $ta('times', 'illegal', 'access') }}, {{ $ta('send', 'a', 'notify') }}</label>
        </div>
      </div></div>
      <div class="setting setting--inline border">
        <h4 class="title_inline">
          <sapn class="title_main">{{ $ta('temp', 'access') }} TOKEN</sapn>
          <button class="efloat--right elecBtn elecBtn--h32 radius_zero radius-bs--tr greenbk" @click="tokensNew()">{{ $t('new') }}</button>
        </h4>
        <div class="eflex eflex--wrap w100 margin0">
          <div class="settoken" v-for="(token, hash) in config.tokens" v-key="hash" :class="{ 'settoken--disabled': !token.enable }">
            <div class="eflex w460 minw320 emargin">
              <input class="elecTable_input h36" v-model="token.token" placeholder="临时访问 token">
              <span class="icon--op h36" @click="token.token=$uStr.UUID()" v-html="icon.sync"></span>
            </div>
            <input class="elecTable_input w360 minw320 emargin h36" v-model="token.path" placeholder="允许路径，比如 ^/efss（留空：不限制">
            <input class="elecTable_input w360 minw320 emargin h36" v-model="token.method" placeholder="允许方法，比如 GET（留空：不限制">
            <input class="elecTable_input minw160 emargin h36" v-model="token.note" placeholder="备注（可省略">
            <span class="minw100" title="已授权访问次数">{{ token.times }}</span>
            <div class="eflex emargin">
              <checkbox :oCheck="token" />
              <span class="icon--op h36" @click="$delete(config.tokens, hash)" v-html="icon.delete" :title="hash"></span>
            </div>
          </div>
        </div>
      </div>
      <i class="tip emargin">
        <span>更多说明请参考: </span>
        <a href="https://github.com/elecV2/elecV2P-dei/tree/master/docs/Advanced.md" target="elecV2PDoc">Advanced.md</a>
      </i>
    </div>
    <button v-show="!collapse" @click="securitySave()" class="elecBtn elecBtn--stlong">{{ $t('save') }}</button>
  </div>
</template>

<script>
import checkbox from '../utils/checkbox.vue'
import icon from '../utils/icon.js'

export default {
  name: "security",
  props: ['config'],
  data(){
    return {
      icon,
      collapse: false,
    }
  },
  components: { checkbox },
  computed: {
    whitelist: {
      get(){
        return this.config.whitelist ? this.config.whitelist.join('\n') : ''
      },
      set(val){
        if (val) {
          this.$set(this.config, 'whitelist', val.split(/\r|\n|,/).filter(v=>v.trim()))
        } else {
          this.config.whitelist = []
        }
      }
    },
    blacklist: {
      get(){
        return this.config.blacklist ? this.config.blacklist.join('\n') : ''
      },
      set(val){
        if (val) {
          this.$set(this.config, 'blacklist', val.split(/\r|\n|,/).filter(v=>v.trim()))
        } else {
          this.config.blacklist = []
        }
      }
    }
  },
  methods: {
    tokensNew(){
      this.$set(this.config.tokens, this.$uStr.euid(), {
        enable: true,
        token: this.$uStr.UUID(),
        path: '',
        method: '',
        note: '',
        times: 0
      })
    },
    securitySave(){
      if (this.config.webhook_only && !confirm('启用 仅开放 webhook 接口 后，webUI 等其他所有接口都不可用\n确定继续？')) {
        return
      }
      const hideloading = this.$message.loading('安全访问相关设置保存中...', 0)
      this.$axios.put('/config', {
        type: 'security', data: this.config
      }).then(response => {
        if (response.data.rescode === 0) {
          this.$message.success('安全访问相关设置保存成功')
          if (response.data.resdata) {
            this.config.tokens = response.data.resdata
          }
        } else {
          this.$message.error('安全访问相关设置保存失败', response.data.message)
          console.error(response.data)
        }
      }).catch(e=>{
        this.$message.error('安全访问相关设置保存失败', e.message)
        console.log(e)
      }).finally(hideloading)
    }
  }
}
</script>

<style scoped>
.setting.setting--inline {
  margin: 0;
}
.setting_input.setting_input--number {
  height: 30px;
  margin-top: 2px;
  margin-bottom: 0;
  padding: 0;
}
.editor_textarea {
  width: 98%;
  height: 260px;
  margin-top: 3px;
}
.settoken {
  display: inline-flex;
  align-content: center;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 100%;
  padding: 0px 4px;
  border-bottom: 1px solid;
}
.settoken:last-child {
  border-bottom: none;
}
.settoken--disabled {
  background-color: var(--tras-bk);
}
</style>