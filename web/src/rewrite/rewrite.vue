<template>
  <section @keydown.ctrl.83.prevent.stop="reSave()" @keyup.esc.prevent.stop.exact="rewriteChecked='none'">
    <header class="header">{{ $ta('rewrite', 'request') }}</header>
    <main class="content">
      <div class="etable" @click.stop="rewriteDelegate($event)"><table class="elecTable" :class="{ 'elecTable--disabled': !rewriteble.enable }">
        <caption class="elecTable_caption" :class="{ 'elecTable--disabled': !rewriteble.enable }">
          <div class="eflex elecTable_caption--left">
            <span title="启用/禁用该列表下的所有规则（包含订阅">{{ $t('enable') }}：</span>
            <checkbox :oCheck="rewriteble" />
          </div>
          <span title="重写/修改某个网络请求的部分数据">REWRITE {{ $t('list') }} - {{ rewritestatus }}</span>
          <span @click="reInit()" class="icon icon_caption--sync" :title="$ta('refresh', 'current', 'list')" v-html="icon.sync"></span>
        </caption>
        <thead>
          <tr>
            <th class="elecTable_th elecTable_th--check" :title="$t('checkall')+'/'+$t('checknone')+'(ESC)'">
              <input type="checkbox" class="echeckbox" @change="rewriteCkall($event)">
            </th>
            <th class="elecTable_th minw320">{{ $t('murl') }}（{{ $t('regexp') }}）</th>
            <th class="elecTable_th minw160">{{ $t('timing') }}</th>
            <th class="elecTable_th minw320" :title="$t('script')+' or reject '+$t('param')">{{ $t('script') }}</th>
            <th class="elecTable_th elecTable_th--name">{{ $t('note') }}</th>
            <th class="elecTable_th elecTable_th--enable" :title="$t('enable')">{{ $t('enable_short') }}</th>
            <th class="elecTable_th minw62" :title="$t('operate')">{{ $t('operate_short') }}</th>
          </tr>
        </thead>
        <tbody tabindex="0">
          <tr v-for="(rewrite, index) in rewritelists" :key="index" :class="{ 'elecTable_tr--disabled': !rewrite.enable, 'elecTable_tr--selected': rewriteChecked[index] }">
            <td class="elecTable_td"><input type="checkbox" :value="index" v-model="rewriteCheck" class="echeckbox"></td>
            <td class="elecTable_td"><input type="text" v-model.trim="rewrite.match" class="elecTable_input"></td>
            <td class="elecTable_td" :class="[ rewrite.stage === 'req' ? 'elecTable_td--req' : 'elecTable_td--res' ]">
              <select v-model="rewrite.stage" class="elecTable_select">
                <option value="res" selected="selected">{{ bfres }}</option>
                <option value="req">{{ bfreq }}</option>
              </select>
            </td>
            <td class="elecTable_td"><input type="text" v-model.trim="rewrite.target" class="elecTable_input"></td>
            <td class="elecTable_td"><input type="text" v-model.trim="rewrite.note" class="elecTable_input" placeholder="备注信息（可省略"></td>
            <td class="elecTable_td"><checkbox :oCheck="rewrite" /></td>
            <td class="elecTable_td"><span class="icon--op" @click="rewriteDel(index)" v-html="icon.delete"></span></td>
          </tr>
          <tr>
            <td colspan="7" class="center border_top1">
              <span v-show="rewriteCheck.length" class="elecTable_addbtn elecTable_addbtn--clear" @click="rewriteDel(rewriteCheck)">{{ $ta('delete', 'checked', 'rule') }} {{ rewriteCheck.length }}</span>
              <span class="elecTable_addbtn" data-method="newRewrite">{{ $ta('add', 'rewrite', 'rule') }}</span>
              <span class="elecTable_addbtn folderbk" @click="rewriteImport()" title="导入备份文件将会覆盖当前所有规则（包括订阅）">{{ $ta('import', 'backup', 'file') }}</span>
              <span class="elecTable_addbtn" data-method="exportRewrite" title="备份包含订阅在内的当前所有规则">{{ $ta('backup', 'current', 'list') }}</span>
              <span v-show="rewriteCheck.length" class="elecTable_addbtn elecTable_addbtn--uncheck" @click="rewriteCheck=[]">{{ $ta('cancel', 'checked', 'rule') }} {{ rewriteCheck.length }}</span>
            </td>
          </tr>
        </tbody>
        <tbody class="elecTable_group" v-for="(subr, subuid) in rewritesub" :key="subuid" :style="{ background: subr.bkcolor }">
          <tr :class="{ 'elecTable_tr--disabled': !subr.enable, 'elecTable_tr--selected': rewritesubChecked.indexOf(subuid)!==-1 }">
            <td class="elecTable_td">
              <input type="checkbox" @change="rewritesubCheck(subuid, $event)" :value="subuid" v-model="rewritesubChecked" class="echeckbox">
            </td>
            <td class="elecTable_td" colspan="4">
              <div class="eflex w100">
                <input type="text" v-model.trim="subr.name" class="elecTable_input elecTable_th--name" placeholder="订阅名称">
                <input type="text" v-model.trim="subr.resource" class="elecTable_input elecBtn--mleft" placeholder="订阅地址" @keydown.alt.enter.prevent.exact="$uApi.open(subr.resource)" title="alt+enter 在新标签页中打开此订阅链接">
                <button class="elecBtn elecBtn--mleft" @click="rewritesubUpdate(subr.resource, subuid)">{{ $t('fetch') }}</button>
                <button v-if="rewritesubChecked.indexOf(subuid)!==-1" class="elecBtn elecBtn--mleft" data-method="exportRewrite" :data-parm="subuid" title="导出当前订阅下的所有规则">{{ $t('exportsub') }}</button>
                <span v-else-if="subr.collapse" class="elecBtn elecBtn--mleft elecBtn--uncheck">{{ subr.enable ? subr.list.filter(r=>r.enable).length : '0' }}/{{ subr.list.length }}</span>
                <input v-else class="elecTable_input elecTable_cell100 elecBtn--mleft" v-model.trim.lazy="subr.bkcolor" placeholder="背景色" title="当前分组背景颜色/图片">
              </div>
            </td>
            <td class="elecTable_td" title="启用/禁用该订阅下的所有规则"><checkbox :oCheck="subr" /></td>
            <td class="elecTable_td">
              <span class="icon--op" v-if="!subr.resource || rewritesubChecked.indexOf(subuid)!==-1" @click="rewritesubOp(subuid, 'delete')" v-html="icon.delete"></span>
              <span class="icon--op" v-else-if="subr.collapse" @click="rewritesubOp(subuid, 'collapse')" v-html="icon.downcircle"></span>
              <span class="icon--op" v-else @click="rewritesubOp(subuid, 'collapse')" v-html="icon.upcircle"></span>
            </td>
          </tr>
          <tr v-for="(rewrite, index) in rewritesublist[subuid]" :class="{ 'elecTable_tr--disabled': !rewrite.enable, 'elecTable_tr--selected': rewriteChecked[subuid + '|' + index] }">
            <td class="elecTable_td"><input type="checkbox" :value="subuid + '|' + index" v-model="rewriteCheck" class="echeckbox"></td>
            <td class="elecTable_td"><input type="text" v-model.trim="rewrite.match" class="elecTable_input"></td>
            <td class="elecTable_td" :class="[ rewrite.stage === 'req' ? 'elecTable_td--req' : 'elecTable_td--res' ]">
              <select v-model="rewrite.stage" class="elecTable_select">
                <option value="res" selected="selected">{{ bfres }}</option>
                <option value="req">{{ bfreq }}</option>
              </select>
            </td>
            <td class="elecTable_td"><input type="text" v-model.trim="rewrite.target" class="elecTable_input"></td>
            <td class="elecTable_td"><input type="text" v-model.trim="rewrite.note" class="elecTable_input" placeholder="备注信息（可省略"></td>
            <td class="elecTable_td"><checkbox :oCheck="rewrite" /></td>
            <td class="elecTable_td"><span class="icon--op" @click="rewriteDel(subuid + '|' + index)" v-html="icon.delete"></span></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="7" class="center border_top1">
              <span v-show="rewriteCheck.length" class="elecTable_addbtn trasbk" data-method="disOrEn" data-parm="enable">{{ $ta('enable_short', '/', 'disable_short', 'checked', 'rule') }}</span>
              <span class="elecTable_addbtn" data-method="newSub">{{ $ta('add', 'rewrite', 'sub') }}</span>
              <span v-show="rewriteCheck.length" class="elecTable_addbtn greenbk" data-method="exportRewrite" data-parm="checked">{{ $ta('export', 'as', 'sub') }}</span>
            </td>
          </tr>
        </tfoot>
      </table></div>
      <p class="center">
        <button class="elecBtn elecBtn--long" @click="reSave()">{{ $t('save') }}</button>
      </p>
    </main>
    <footer class="footer">
      <ul>
        <li><b>本页所有规则的更改在点击保存后才正式生效</b></li>
        <li>订阅规则并不会自动加载更新，需手动获取及保存</li>
        <li>规则匹配公式: `(new RegExp('正则表达式')).test(request.url)`</li>
        <li>更多说明请查看 <a href="https://github.com/elecV2/elecV2P-dei/tree/master/docs/05-rewrite.md" target="elecV2PDoc">文档: 05-rewrite</a></li>
      </ul>
    </footer>
  </section>
</template>

<script>
import checkbox from '../utils/checkbox.vue'
import icon from '../utils/icon.js'

export default {
  name: "rewrite",
  props: [],
  data(){
    return {
      bfreq: this.$t('bfreq'),
      bfres: this.$t('bfres'),
      rewritelists: [],
      rewritesub: [],
      rewritesubChecked: [],
      rewriteCheck: [],
      rewriteble: {
        enable: true
      },
      icon,
    }
  },
  components: {
    checkbox
  },
  computed: {
    rewritestatus(){
      let subkeys = Object.keys(this.rewritesub)
      let total = this.rewritelists.length, enbnum = this.rewritelists.filter(r=>r.enable).length
      subkeys.forEach(skey=>{
        if (this.rewritesub[skey].list === undefined) {
          this.rewritesub[skey].list = []
        }
        if (this.rewritesub[skey].enable) {
          enbnum += this.rewritesub[skey].list.filter(r=>r.enable).length
          total += this.rewritesub[skey].list.length
        }
        if (this.rewritesub[skey].collapse === undefined) {
          this.rewritesub[skey].collapse = false
        }
      })
      return enbnum + '/' + total + '/' + subkeys.length
    },
    rewriteChecked: {
      get(){
        let clist = []
        this.rewriteCheck.forEach(rc=>{
          clist[rc] = true
        })
        return clist
      },
      set(val){
        if (val === 'all') {
          this.rewriteCheck = Object.keys(this.rewritelists)
        } else if (val === 'none') {
          this.rewriteCheck = []
        }
      }
    },
    rewritesublist(){
      let flist = {}
      Object.keys(this.rewritesub).forEach(subkey=>{
        if (this.rewritesub[subkey].collapse) {
          flist[subkey] = []
          return
        }
        flist[subkey] = this.rewritesub[subkey].list || []
      })
      return flist
    }
  },
  created(){
    this.reInit()
  },
  methods: {
    reInit(){
      const hideloading = this.$message.loading('正在获取 rewrite 列表...', 0)
      this.$axios.get('/data?type=rewritelists').then(res=>{
        if (res.data) {
          this.rewritesub = res.data.rewritesub || {}
          this.rewritelists = res.data.rewrite.list
          this.rewriteCheck = []
          this.rewriteble.enable = res.data.rewrite.enable !== false
          this.dealOldList()
          this.$message.success('成功获取 REWRITE 规则列表', this.rewritestatus)
        } else {
          this.$message.error('REWRITE 规则列表获取失败')
        }
      }).catch(e=>{
        this.$message.error('获取 REWRITE 规则列表失败', e.message)
        console.error('获取 REWRITE 规则列表失败', e)
      }).finally(hideloading)
    },
    dealOldList(){
      let todelidx = []
      for (let idx in this.rewritelists) {
        let r = this.rewritelists[idx]
        if (r.stage !== 'req' && r.stage !== 'res') {
          r.stage = /^reject(-200|-dict|-json|-array|-img)?$/.test(r.target) ? 'req' : 'res'
        }

        if (r.belong) {
          let rbelong = r.belong
          delete r.belong
          if (this.rewritesub[rbelong]) {
            if (this.rewritesub[rbelong].list) {
              this.rewritesub[rbelong].list.push(r)
            } else {
              this.rewritesub[rbelong].list = [r]
            }
            if (!this.rewritesub[rbelong].bkcolor) {
              this.rewritesub[rbelong].bkcolor = this.$uStr.randomColor({ max: 200 })
            }
            todelidx.push(idx)
          } else {
            console.log('规则', r.match, '对应订阅已不存在，删除 belong 属性', rbelong)
          }
        }
      }
      todelidx.reverse().forEach(idx=>this.$delete(this.rewritelists, idx))
    },
    reSave(){
      let emptydata = []
      this.rewritelists.forEach((r, idx)=>{
        if (!r.match || !r.target) {
          emptydata.push(idx + 1)
        }
      })
      if (emptydata.length > 0) {
        this.$message.error('当前列表第', emptydata.join(', '), '/', this.rewritelists.length, '项包含空字符，请填写完整或删除后再进行保存')
        return
      }
      if (confirm(`保存重写规则列表 ${this.rewritestatus}${this.rewriteble.enable ? '' : '，但不启用'}`)) {
        const hideloading = this.$message.loading('重写规则上传保存中...', 0)
        this.$axios.put('/data', {
          type: 'rewrite',
          rewritelists: this.rewritelists,
          rewritesub: this.rewritesub,
          rewriteenable: this.rewriteble.enable
        }).then(res=>{
          if (res.data.rescode === 0) {
            this.$message.success('保存成功', res.data.message)
          } else {
            this.$message.error('REWRITE 规则保存失败', res.data.message)
          }
        }).catch(e=>{
          this.$message.error(e.message)
          console.error('重写规则保存失败', e)
        }).finally(hideloading)
      }
    },
    rewriteDelegate(event){
      switch (event.target.dataset.method) {
      case 'disOrEn':
        let toStatus = event.target.dataset.parm === 'disable'
        this.rewriteCheck.forEach(r=>{
          if (this.$sType(r) === 'number') {
            this.rewritelists[r].enable = toStatus
          } else {
            let [subuid, idx] = r.split('|')
            if (subuid && idx && this.rewritesublist[subuid]) {
              this.rewritesub[subuid].list[idx].enable = toStatus
            }
          }
        })
        event.target.dataset.parm = toStatus ? 'enable' : 'disable'
        this.$message.success('已批量', toStatus ? '启用' : '禁用', this.rewriteCheck.length, '条规则')
        break
      case 'newRewrite':
        this.rewritelists.push({ match: '^https?://httpbin\\.org/get\\?rewrite=elecV2P', stage: 'req', target: '0body.js', enable: true })
        break
      case 'newSub':
        this.rewritesubAdd()
        break
      case 'exportRewrite':
        this.rewriteExport(event.target.dataset.parm)
        break
      default:
        // console.debug('rewriteDelegate unknow method', event.target.dataset.method)
      }
    },
    async rewritesubUpdate(suburl, subuid){
      if (!suburl || !/^https?:\/\/\S{4}|^\/?efss\//i.test(suburl)) {
        this.$message.error('请输入正确的订阅地址')
        return
      }
      let hideloading = this.$message.loading('正在获取订阅内容中...', 0)
      let res = ''
      try {
        res = await this.$axios.get(suburl)
      } catch(e) {
        if (e.response) {
          hideloading()
          this.$message.error(`获取订阅内容失败，服务器返回状态码 ${e.response.status}`)
          console.debug(`获取订阅内容失败，服务器返回状态码 ${e.response.status}`, e.response.data)
          return
        }
        if (!/^https?:\/\/\S{4}/.test(suburl)) {
          hideloading()
          this.$message.error('获取订阅内容失败', e.message)
          return
        }
        try {
          this.$message.error('获取订阅内容失败', e.message, '即将尝试从服务器端获取该订阅内容')
          res = await this.$axios.get('/data?type=stream&url=' + suburl)
        } catch(e) {
          hideloading()
          this.$message.error('获取订阅信息失败', e.message, '请检测网络后重试')
          return
        }
      }
      if (res.status !== 200 || res.data.rescode === -1) {
        hideloading()
        this.$message.error('该订阅返回状态有误，请确认当前网络环境或输入链接是否正常')
        console.error(res.data)
        return
      }
      hideloading()
      let data = this.$sJson(res.data)
      if (!(data && (data.list || data.rewrite))) {
        if (!res.data) {
          this.$message.error('没有检测到任何订阅内容')
          return
        }
        res.data = this.$sString(res.data)
        this.$message.success('检测到该订阅内容为非 elecV2P 订阅格式，尝试以兼容模式解析该内容')
        data = { name: this.rewritesub[subuid].name, mitmhost: [], list: [] }
        let mhost = res.data.match(/hostname ?= ?(.+)/)
        if (mhost && mhost[1]) {
          data.mitmhost = mhost[1].split(/ ?, ?/)
        }
        if (data.mitmhost.length) {
          data.mitmhost[0] = data.mitmhost[0].replace('%APPEND% ', '')
        }
        res.data.split(/\r|\n/).forEach(l=>{
          if (/^(#|\[|\/\/)/.test(l) || l.length<3) {
            return
          }
          let item = l.split(' '), spath = l.match(/script-path=([^,]*)/), match = '', stage = 'res', target = ''
          if (spath && spath[1]) {
            target = spath[1]
            stage = /http-request/.test(l) ? 'req' : 'res'
            if (/^http-res/.test(item[0])) {
              match = item[1]
            } else {
              let tm = l.match(/pattern=([^,]*)/)
              if (tm && tm[1]) {
                match = tm[1]
              }
            }
          } else if (item.length >= 2) {
            target = item.pop()
            if (/^http|^reject|\.js$/.test(target)) {
              match = item[0]
              stage = (/^reject/.test(target) || /request/.test(item[2])) ? 'req' : 'res'
            }
          }
          if (match && stage && target) {
            data.list.push({
              match, stage,
              target, enable: true
            })
          }
        })
      }
      if (data && data.rewrite && data.rewrite.length) {
        data.list = data.rewrite   // 旧订阅格式转换
      }
      if (data && data.list && data.list.length) {
        let cftext = `<div class="emargin title_inline">${ data.note || "没有任何备注说明" }</div><div class="eflex eflex--center emargin w100"><label class="w220 cursor" data-method="nav" data-panel="rewrite">重写规则 ${data.list.length} 条</label><button class="elecBtn elecBtn--h32 greenbk" title="所有旧有规则将被替换" data-method="rewriteAdd">更新</button></div>`
        if (data.mitmhost && data.mitmhost.length) {
          cftext += `<div class="eflex eflex--center emargin w100"><label class="w220 cursor" data-method="nav" data-panel="mitm">MITM 域名 ${data.mitmhost.length} 个</label><button class="elecBtn elecBtn--h32 greenbk" data-method="hostAdd">添加</button></div>`
        }
        if (data.task && data.task.list) {
          cftext += `<div class="eflex eflex--center emargin w100"><label class="w220 cursor" data-method="nav" data-panel="task">定时任务 ${data.task.list.length} 个</label><button class="elecBtn elecBtn--h32 greenbk" data-method="taskAdd">添加</button></div>`
        }
        cftext += `<div class="emargin border_top1">作者: ${ data.author || '无' }  更新: ${ data.resource || '无' }</div>`
        let rAxios = this.$axios, rMessage = this.$message, rewritesub = this.rewritesub
        this.$evui({
          title: `${ data.name || this.rewritesub[subuid].name || '检测到如下规则' }`,
          width: 600,
          height: null,
          style: {
            title: `background: ${data.bkcolor || this.rewritesub[subuid].bkcolor};`,
            content: 'text-align: center;margin: .2em;'
          },
          content: cftext,
          methods: {
            rewriteAdd(){
              let el = document.querySelector('.elecBtn[data-method=rewriteAdd]')
              if (el) {
                if (el.dataset.done) {
                  rMessage.success('重写规则已添加')
                  return
                }
                el.dataset.done = '1'
                el.classList.remove('greenbk')
                el.classList.add('elecBtn--stop')
              }
              let datarlist = data.list.filter(r=>{
                if (r.match && /^http|^reject|\.js$/.test(r.target)) {
                  if (r.stage !== 'req' && r.stage !== 'res') {
                    r.stage = /^reject/.test(r.target) ? 'req' : 'res'
                  }
                  r.enable = r.enable !== false
                  return true
                }
              })
              if (data.name) {
                rewritesub[subuid].name = data.name
              }
              if (data.enable !== undefined) {
                rewritesub[subuid].enable = data.enable
              }
              if (data.bkcolor) {
                rewritesub[subuid].bkcolor = data.bkcolor
              }
              if (data.resource) {
                rewritesub[subuid].resource = data.resource
              }
              // 触发视图层更新
              rewritesub[subuid] = {
                ...rewritesub[subuid],
                list: datarlist
              }
              rMessage.success('订阅', data.name, '内容更新完成（保存后正式生效）')
            },
            taskAdd(){
              let el = document.querySelector('.elecBtn[data-method=taskAdd]')
              if (el) {
                if (el.dataset.done) {
                  rMessage.success('定时任务已添加')
                  return
                }
                el.dataset.done = '1'
                el.classList.remove('greenbk')
                el.classList.add('elecBtn--stop')
              }
              for (let task of data.task.list) {
                rAxios.put('/task', {
                  op: 'add',
                  data: {
                    type: data.task.type,
                    task
                  }
                }).then(res=>{
                  if (res.data.rescode === 0) {
                    rMessage.success('添加定时任务', task.name, res.data.message)
                  } else {
                    rMessage.error('添加定时任务失败', res.data.message)
                  }
                }).catch(e=>{
                  rMessage.error('添加定时任务失败', e.message)
                  console.error('添加定时任务失败', e)
                })
              }
            },
            hostAdd(){
              let el = document.querySelector('.elecBtn[data-method=hostAdd]')
              if (el) {
                if (el.dataset.done) {
                  rMessage.success('解析域名已添加')
                  return
                }
                el.dataset.done = '1'
                el.classList.remove('greenbk')
                el.classList.add('elecBtn--stop')
              }
              rAxios.put('/data', {
                type: 'mitmhostadd',
                data: data.mitmhost,
                note: data.name
              }).then(res=>{
                if (res.data.rescode === 0) {
                  rMessage.success('成功更新 MITMHOST', data.mitmhost.join(', '))
                } else {
                  rMessage.error('MITMHOST 更新失败', res.data.message)
                }
              }).catch(e=>{
                rMessage.error('更新 mitmhost 失败', e.message)
                console.error('更新 mitmhost 失败', e)
              })
            },
          },
        })
      } else {
        this.$message.error('elecV2P 暂时无法解析该订阅内容')
        console.debug(this.rewritesub[subuid].name, '内容为', res.data)
      }
    },
    rewritesubCheck(subuid, e){
      if (subuid && e) {
        if (e.target.checked) {
          for (let ind in this.rewritesub[subuid].list || []) {
            let cid = subuid + '|' + ind
            if (this.rewriteCheck.indexOf(cid) === -1) {
              this.rewriteCheck.push(cid)
            }
          }
        } else {
          this.rewriteCheck = this.rewriteCheck.filter(idx=>!(typeof(idx) === 'string' && idx.startsWith(subuid)))
        }
      }
    },
    rewriteDel(index){
      switch(this.$sType(index)){
      case 'number':
        this.$delete(this.rewritelists, index)
        break
      case 'array':
        if (index.length && confirm(`确定删除这 ${index.length} 条规则吗？\n（手动保存后正式生效）`)) {
          for (let idx of index) {
            this.rewriteDel(idx)
          }
          this.rewriteCheck = []
        }
        break
      case 'string':
        let [subuid, idx] = index.split('|')
        if (subuid && idx && this.rewritesublist[subuid]) {
          this.rewritesublist[subuid].splice(Number(idx), 1)
          this.$forceUpdate()
        }
        break
      default:
        this.$message.error('规则删除失败，未知删除参数')
      }
    },
    rewritesubAdd(rid = this.$uStr.euid()){
      this.$set(this.rewritesub, rid, {
        name: this.$ta('rewrite', 'sub') + (Object.keys(this.rewritesub).length + 1),
        resource: '',
        type: 'rewrite',
        note: '',
        date: this.$sTime(),
        total: 0,
        active: 0,
        enable: true,
        bkcolor: this.$uStr.randomColor({ max: 200 }),
        collapse: false,
        list: []
      })
    },
    rewritesubOp(subuid, op = 'delete'){
      if (op === 'collapse') {
        this.rewritesub[subuid].collapse = !this.rewritesub[subuid].collapse
        if (this.rewritesub[subuid].collapse) {
          this.rewritesublist[subuid] = []
        } else {
          this.rewritesublist[subuid] = this.rewritesub[subuid].list
        }
        this.$forceUpdate()
      } else {
        if (this.rewritesub[subuid] && (this.rewritesub[subuid].list.length === 0 || confirm('确定删除重写订阅：' + this.rewritesub[subuid].name + ' 及其相关规则\n（并不会删除已添加的 MITMHOST/TASK 等）'))) {
          this.$delete(this.rewritesub, subuid)
          this.rewriteCheck = this.rewriteCheck.filter(idx=>!(typeof(idx) === 'string' && idx.startsWith(subuid)))
        }
      }
    },
    rewriteCkall(e){
      this.rewriteChecked = e.target.checked ? 'all' : 'none'
    },
    rewriteExport(type = 'all' /* subuid|checked */){
      let exsub = Object.create(null), filename = 'rewritesub-elecV2P.json'
      switch(type) {
      case 'all':
        exsub = {
          rewrite: {
            note: 'elecV2P 重写规则',
            date: this.$sTime(),
            total: this.rewritelists.length,
            active: this.rewritelists.filter(r=>r.enable).length,
            enable: this.rewriteble.enable,
            list: this.rewritelists,
          },
          rewritesub: this.rewritesub
        }
        filename = 'rewrite.list'
        this.$message.success('成功使用当前规则列表（包含订阅）生成备份文件，请选择目录进行保存')
        break
      case 'checked':
        exsub = {
          name: 'elecV2P 重写订阅',
          author: '留个名字 elecV2',
          note: 'xx 导出的重写规则。该订阅目前仅适用于 elecV2P。更多说明请查看: https://github.com/elecV2/elecV2P-dei/tree/master/docs/05-rewrite.md',
          date: this.$sTime(),
          type: 'rewrite',
          resource: '订阅更新远程链接（待填写',
          mitmhost: [],
          list: []
        }
        this.rewriteCheck.forEach(r=>{
          if (this.$sType(r) === 'number') {
            r = this.rewritelists[r]
          } else {
            let [subuid, idx] = r.split('|')
            if (subuid && idx && this.rewritesublist[subuid]) {
              r = this.rewritesublist[subuid][idx]
            }
          }
          if (r.match && r.stage && r.target) {
            exsub.list.push(r)
          }
        })
        break
      default:
        if (this.rewritesub[type]) {
          exsub = {
            ...this.rewritesub[type],
            type: 'rewrite',
            note: '关于该订阅的一些说明（可省略）。该订阅目前仅适用于 elecV2P，与其他软件并不兼容。更详细说明请查看: https://github.com/elecV2/elecV2P-dei/tree/master/docs/05-rewrite.md',
            date: this.$sTime(),
          }
          delete exsub.total
          delete exsub.active
          delete exsub.collapse
          filename = this.rewritesub[type].name
        } else {
          this.$message.error('未知导出类型', type)
        }
      }
      if (exsub.type === 'rewrite' || exsub.rewrite) {
        this.$uApi.saveAsFile(exsub, filename || 'rewritesub-elecV2P.json')
      } else {
        this.$message.error('当前并没有检测到任何规则')
      }
    },
    rewriteImport(){
      this.$uApi.getFile({ accept: '.list,.json', type: 'text' }).then(file=>{
        let imdata = file.content
        let data = this.$sJson(imdata)
        if (data && ((data.rewrite && data.rewrite.list) || data.rewritesub)) {
          if (confirm(`检测到重写规则 ${data.rewrite.list.length} 条，订阅 ${Object.keys(data.rewritesub || {}).length} 个\n确定使用该备份替换当前所有规则及订阅吗？`)) {
            this.rewritelists = data.rewrite.list || []
            this.rewritesub = data.rewritesub || {}
            this.rewriteCheck = []
            this.rewriteble.enable = data.rewrite.enable !== false
            this.dealOldList()
            this.$message.success('成功导入重写规则备份文件，保存后正式生效')
          }
        } else {
          console.error('elecV2P 无法解析导入文件', imdata)
          this.$message.error('无法解析导入文件，仅支持 elecV2P 的备份文件')
        }
      }).catch(error=>{
        console.debug('rewrite import', error)
      })
    }
  }
}
</script>