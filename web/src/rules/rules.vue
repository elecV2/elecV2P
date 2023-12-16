<template>
  <section @keydown.ctrl.83.prevent.stop="rulesSave()">
    <header class="header">{{ header }}</header>
    <main class="content">
      <div class="etable"><table class="elecTable" :class="{ 'elecTable--disabled': !ruleble.enable }">
        <caption class="elecTable_caption" :class="{ 'elecTable--disabled': !ruleble.enable }">
          <div class="eflex elecTable_caption--left">
            <span title="启用该列表中的规则（建议在不需要使用时关闭">{{ $t('enable') }}：</span>
            <checkbox :oCheck="ruleble" />
          </div>
          <span>RULE {{ $t('list') }} - {{ rulestatus }}</span>
          <span @click="rulesInit()" class="icon icon_caption--sync" title="刷新当前列表" v-html="icon.sync"></span>
        </caption>
        <thead>
          <tr>
            <th class="elecTable_th minw160">{{ $t('match') }}</th>
            <th class="elecTable_th minw480">{{ $t('content') }}（{{ $t('regexp')}}）</th>
            <th class="elecTable_th minw160">{{ $t('modifyto') }}</th>
            <th class="elecTable_th minw480">{{ $t('target') }}</th>
            <th class="elecTable_th minw160">{{ $t('timing') }}</th>
            <th class="elecTable_th elecTable_th--enable">{{ $t('enable_short') }}</th>
            <th class="elecTable_th minw62">{{ $t('operate_short') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(el, index) in eplists" :key="index" :class="{ 'elecTable_tr--disabled': !el.enable }">
            <td class="elecTable_td">
              <select v-model="el.mtype" class="elecTable_select">
                <option>url</option>
                <option>host</option>
                <option>useragent</option>
                <option>reqmethod</option>
                <option>reqbody</option>
                <option>resstatus</option>
                <option>restype</option>
                <option>resbody</option>
              </select>
            </td>
            <td class="elecTable_td">
              <select v-if="el.mtype=='reqmethod'" v-model="el.match" class="elecTable_select">
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>
              <select v-else-if="el.mtype=='resstatus'" v-model="el.match" class="elecTable_select">
                <option>200</option><option>404</option><option>30x</option><option>50x</option>
              </select>
              <input v-else type="text" v-model.lazy.trim="el.match" class="elecTable_input">
            </td>
            <td class="elecTable_td">
              <select v-model="el.ctype" class="elecTable_select">
                <option value="js">{{ script }}</option>
                <option value="block">{{ reject }}</option>
                <option value="307">{{ redirect }}</option>
                <option value="hold">$HOLD</option>
                <option value="ua">User-Agent</option>
              </select>
            </td>
            <td class="elecTable_td">
              <select v-if="el.ctype=='block'" v-model="el.target" class="elecTable_select">
                <option value="json">reject-json</option>
                <option value="reject" selected="selected">reject-200</option>
                <option>tinyimg</option>
              </select>
              <select v-else-if="el.ctype=='ua'" v-model="el.target" class="elecTable_select">
                <option v-for="(name, u) in uagentlists" :key="u" :value="u">{{ name }}</option>
              </select>
              <input v-else type="text" v-model.lazy.trim="el.target" class="elecTable_input">
            </td>
            <td class="elecTable_td" :class="[ el.stage === 'req' ? 'elecTable_td--req' : 'elecTable_td--res' ]">
              <select v-model="el.stage" class="elecTable_select">
                <option value="req">{{ bfreq }}</option>
                <option value="res" selected="selected">{{ bfres }}</option>
              </select>
            </td>
            <td class="elecTable_td"><checkbox :oCheck="el" /></td>
            <td class="elecTable_td"><span class="icon--op" @click="ruleDel(index)" v-html="icon.delete"></span></td>
          </tr>
        </tbody>
        <tfoot>
          <tr><td colspan="7" class="elecTable_add">
            <span class="elecTable_addbtn" @click="eplists.push({mtype: 'host', match: 'host.com', ctype: 'js', target: '0body.js', stage: 'res', enable: true})">{{ $ta('new', 'rule') }}</span>
          </td></tr>
        </tfoot>
      </table></div>
      <p class="center"><button class="elecBtn elecBtn--long" @click="rulesSave()">{{ $t('save') }}</button></p>
    </main>
    <footer class="footer">
      <ul>
        <li>所有更改在保存后正式生效</li>
        <li>仅首条命中规则有效，优先级低于 REWRITE</li>
        <li>$HOLD 后面修改内容表示时间(秒) 0: 一直等待</li>
        <li>更详细说明，参考 <a href="https://github.com/elecV2/elecV2P-dei/tree/master/docs/03-rules.md" target="elecV2PDoc">说明文档: 03-rules</a></li>
      </ul>
    </footer>
  </section>
</template>

<script>
import checkbox from '../utils/checkbox.vue'
import icon from '../utils/icon.js'

export default {
  name: "rules",
  data(){
    return {
      header: 'RULES',
      bfreq: this.$t('bfreq'),
      bfres: this.$t('bfres'),
      reject: this.$t('reject'),
      redirect: this.$t('redirect'),
      script: this.$t('script'),
      uagentlists: {},
      eplists: [],
      ruleble: {
        enable: true
      },
      icon,
    }
  },
  computed: {
    rulestatus(){
      return this.eplists.filter(ep=>ep.enable).length + '/' + this.eplists.length
    }
  },
  components: {
    checkbox
  },
  created(){
    this.rulesInit()
  },
  methods: {
    rulesInit(){
      const hideloading = this.$message.loading('正在获取规则列表...', 0)
      this.$axios.get('/data?type=rules').then(res=>{
        this.eplists = res.data.eplists.list
        for (let ua in res.data.uagent) {
          if (res.data.uagent[ua].name) {
            this.uagentlists[ua] = res.data.uagent[ua].name
          }
        }
        this.ruleble.enable = res.data.eplists.enable !== false
        this.$message.success(`成功获取规则列表 ${this.rulestatus}`)
        console.log('成功获取规则列表', this.rulestatus)
      }).catch(e=>{
        this.$message.error('获取规则列表失败', e.message)
        console.error('获取列表失败', e)
      }).finally(hideloading)
    },
    rulesSave(){
      if (confirm('共 ' + this.rulestatus + ' 条规则将被保存，' + (this.ruleble.enable ? '' : '但不启用该规则列表，') + '确定？')) {
        const hideloading = this.$message.loading('规则保存中...', 0)
        this.$axios.put('/data', { type: 'rules', eplists: this.eplists, ruleenable: this.ruleble.enable }).then((res) => {
          if (res.data.rescode === 0) {
            this.$message.success('保存成功', res.data.message)
          } else {
            this.$message.error('RULES 规则保存失败', res.data.message)
          }
        }).catch(e=>{
          this.$message.error('保存失败', e.message)
          console.error(e)
        }).finally(hideloading)
      }
    },
    ruleDel(index){
      switch(this.$sType(index)){
      case 'number':
        this.$delete(this.eplists, index)
        break
      case 'array':
        if (index.length && confirm(`确定删除这 ${index.length} 条规则吗？\n（手动保存后正式生效）`)) {
          let rlists = this.eplists.slice()
          for (let idx of index) {
            if (rlists[idx]) {
              rlists[idx] = -1
            }
          }
          this.eplists = rlists.filter(r=>r!==-1)
        }
        break
      default:
        this.$message.error('规则删除失败，未知删除参数')
      }
    }
  }
}
</script>