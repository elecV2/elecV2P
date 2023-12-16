<template>
  <section @keydown.ctrl.83.prevent.stop="hostSave()">
    <header class="header">{{ header }}</header>
    <main class="content">
      <div class="mitmset" :class="{ 'mitmset--close': !eproxy.enable }">
        <div class="mitmset_status emargin" :class="{ 'mitmset--close': !eproxy.enable }">{{ $t('status') }}：{{ $t(eproxy.enable ? 'enabled' : 'disabled') }}</div>
        <div class="mitmset_item emargin">
          <label>ANYPROXY {{ $t('port') }}: <input class="elecTable_input elecTable_input--number mitmset_bl1" type="number" v-model="eproxy.port"></label>
        </div>
        <div class="mitmset_item emargin">
          <label>ANYPROXY {{ $t('logs') }}: <input class="elecTable_input elecTable_input--number mitmset_bl1" type="number" v-model="eproxy.webPort"></label>
        </div>
        <button v-show="!eproxy.enable" class="elecBtn w220 greenbk emargin" @click="eproxyToggle('open')">{{ $t('enable') }} MITM</button>
        <button v-show="eproxy.enable" class="elecBtn w220 elecBtn--stop emargin" @click="eproxyToggle('close')">{{ $t('disable') }} MITM</button>
      </div>
      <div class="etable"><table class="elecTable" :class="{ 'elecTable--disabled': !mitmhosteble.enable }">
        <caption class="elecTable_caption" :class="{ 'elecTable--disabled': !mitmhosteble.enable }">
          <div class="eflex elecTable_caption--left">
            <span title="按照下表进行解析(解析全部可使用单星号 *">{{ $t('enable') }}：</span>
            <checkbox :oCheck="mitmhosteble" />
          </div>
          <span>MITM HOST {{ $t('list') }} - {{ mitmhost.length }}</span>
          <span @click="mitmInit()" class="icon icon_caption--sync" title="刷新当前列表" v-html="icon.sync"></span>
        </caption>
        <thead>
          <tr>
            <th class="elecTable_th elecTable_th--check" title="全选/全不选">
              <input type="checkbox" class="echeckbox" @change="mitmCkall($event)">
            </th>
            <th class="elecTable_th minw320">{{ $t('host') }}</th>
            <th class="elecTable_th elecTable_th--name">{{ $t('note') }}</th>
            <th class="elecTable_th elecTable_th--enable">{{ $t('enable_short') }}</th>
            <th class="elecTable_th minw62">{{ $t('operate_short') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(host, index) in mitmhost" :key="index"
            :class="{ 'elecTable_tr--disabled': !host.enable, 'elecTable_tr--selected': mitmChecked[index] }"
          >
            <td class="elecTable_td">
              <input class="echeckbox" type="checkbox" :value="String(index)" v-model="mitmCheck" />
            </td>
            <td class="elecTable_td">
              <input type="text" v-model.trim="host.host" class="elecTable_input" placeholder="e.test.com">
            </td>
            <td class="elecTable_td"><input type="text" v-model.trim="host.note" class="elecTable_input" placeholder="备注信息（可省略"></td>
            <td class="elecTable_td"><checkbox :oCheck="host" /></td>
            <td class="elecTable_td"><span class="icon--op cursor" @click="mhostDel(index)" v-html="icon.delete"></span></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="center border_top1">
              <span class="elecTable_addbtn elecTable_addbtn--clear" @click="mhostDelCks()" v-show="mitmCheck.length">{{ $ta('delete', 'checked') }}</span>
              <span class="elecTable_addbtn" @click="mitmhost.push({ host: '', enable: true })">{{ $ta('add', 'host') }}</span>
            </td>
          </tr>
        </tfoot>
      </table></div>
      <p class="center">
        <button class="elecBtn elecBtn--long" @click="hostSave()">{{ $t('save') }}</button>
      </p>
      <pac :config="config_pac" />

      <div class="mitmcrt">
        <h4 class="mitmcrt_title">{{ $ta('self-signed', 'root', 'certificate', 'manage') }}</h4>
        <div class="eflex mitm_border">
          <div><label class="sfcrt_label">{{ $t('certificate') }}: </label><span class="sfcrt_info">{{ crtinfo.commonName }}</span></div>
          <div><label class="sfcrt_label">{{ $ta('valid', 'date') }}: </label><span class="sfcrt_info">{{ crtinfo.notBefore }} {{ $t('to') }} {{ crtinfo.notAfter }}</span></div>
          <select v-show="crtinfo.rescode === 0" class="elecTable_select minw160" v-model="crt_type">
            <option value="crt">CRT {{ $t('certificate') }}</option>
            <option value="p12">P12 {{ $t('certificate') }}</option>
            <option value="dot">.0 {{ $t('certificate') }}</option>
          </select>
          <button class="elecBtn" @click.prevent.stop="crtInstall()" title="下载当前使用的根证书文件">{{ $ta('download', 'current', 'certificate') }}</button>
          <button class="elecBtn" @click.prevent.stop="crthostshow=!crthostshow">{{ $ta('sign', 'host', 'certificate') }}</button>
          <div v-show="crthostshow" class="sfcrt_self">
            <label class="sfcrt_label">{{ $t('host') }}</label>
            <input class="elecTable_input sfcrt_host" placeholder="域名 比如 test.com" v-model="crt_host">
            <button class="elecBtn" @click.prevent.stop="crtHost()">{{ $ta('generate', 'and', 'download') }}</button>
          </div>
        </div>
        <div class="eflex mitm_border">
          <label class="sfcrt_label">{{ $ta('new', 'root', 'certificate') }}:</label>
          <div>
            <label class="sfcrt_label">{{ $t('name') }} </label>
            <input class="elecTable_input w220" type="text" name="commonName" v-model="newcrt.commonName" placeholder="elecV2P (全英文字符)">
          </div>
          <div class="eflex">
            <label class="sfcrt_label">{{ $ta('force', 'replace') }} </label>
            <input class="echeckbox" type="checkbox" name="overwrite" v-model="newcrt.overwrite">
          </div>
          <button class="elecBtn" @click="crtNew()">{{ $t('generate') }}</button>
        </div>
        <div class="eflex mitm_border">
          <div class="eupload eupload--crt" title="根证书包含 rootCA.crt/rootCA.key 两部分">
            <input type="file" ref="crtfiles" multiple @change="crtstoupload()" class="eupload_file eupload_file--crt">
            <span class="eupload_span" v-show="crtfiles.length">{{ crtfilename }}</span>
          </div>
          <button class="elecBtn w220 emargin" @click="crtUpload()">{{ $ta('start', 'upload') }}</button>
        </div>
        <div class="eflex mitm_border">
          <button class="elecBtn minw320 emargin" @click="cacheClear()" title="清空 ANYPROXY temp cache 文件夹">{{ $ta('clear', 'cache', 'file') }}</button>
          <button class="elecBtn minw320 emargin" @click="crtClear()" title="删除由根证书签发的其他域名证书">{{ $ta('clear', 'host', 'certificate')}}</button>
          <button class="elecBtn minw320 greenbk" @click="eproxyToggle('restart')">{{ $t('restart') }} ANYPROXY</button>
        </div>
      </div>
    </main>
    <footer class="footer">
      <ul class="footer_tip">
        <li>关于 PAC 文件的说明参考文档：<a href='https://github.com/elecV2/elecV2P-dei/blob/master/docs/Advanced.md' target="_blank" class="tip">Advanced.md</a> 相关部分</li>
        <li>各个系统的证书安装与信任 参考: <a href='https://github.com/alibaba/anyproxy/tree/master/docs-src/cn' target="_blank" class="tip">此页面</a> 的证书配置相关部分</li>
        <li>生成或上传新的根证书在重启后生效，需要重新下载安装和信任</li>
        <li>解析 https 请求的条件：安装信任根证书且相关域名在解析列表中</li>
        <li>经常使用 ANYPROXY 代理会产生大量缓存文件，请定期进行清理</li>
      </ul>
    </footer>
  </section>
</template>

<script>
import { CONFIG } from '../utils/config'
import checkbox from '../utils/checkbox.vue'
import icon from '../utils/icon.js'

import pac from './pac.vue'

export default {
  name: "mitm",
  props: [],
  data(){
    return {
      header: 'MITM',
      crtfiles: [],
      mitmhost: [],
      newcrt: {
        commonName: 'elecV2P',
        overwrite: false
      },
      crtinfo: {},
      mitmhosteble: {
        enable: true
      },
      icon,
      crt_type: 'crt',
      crt_host: '',
      mitmCheck: [],
      eproxy: {
        enable: false,
        port: 8001,
        webPort: 8002,
      },
      crthostshow: false,
      config_pac: {
        addr: CONFIG.base_url + '/pac',
        proxy: '127.0.0.1:8001',
        final: 'DIRECT',
      },
    }
  },
  components: {
    pac,
    checkbox
  },
  created(){
    this.mitmInit()
  },
  computed: {
    mitmChecked: {
      get(){
        let clist = {}
        this.mitmCheck.forEach(rc=>{
          clist[rc] = true
        })
        return clist
      },
      set(val){
        if (val === 'all') {
          this.mitmCheck = Object.keys(this.mitmhost)
        } else if (val === 'none') {
          this.mitmCheck = []
        }
      }
    },
    crtfilename(){
      let upfs = []
      for(let i=0; i<this.crtfiles.length; i++){
        upfs.push(this.crtfiles[i].name)
      }
      return upfs.join(', ')
    }
  },
  methods: {
    mitmInit(){
      const hideloading = this.$message.loading('正在获取 mitmhost 列表...', 0)
      this.$axios.get('/data?type=mitmhost').then(res=>{
        if (res.data.host) {
          this.mitmhost = []
          res.data.host.forEach(host=>{
            switch(this.$sType(host)) {
              case 'string':
                this.mitmhost.push({ host, enable: true })
                break
              case 'object':
                if (host.enable !== false) {
                  host.enable = true
                }
                this.mitmhost.push(host)
                break
              default:{}
            }
          })
        }
        if (res.data.eproxy) {
          Object.assign(this.eproxy, res.data.eproxy)
        }
        this.mitmhosteble.enable = res.data.enable !== false
        if (res.data.crtinfo && res.data.crtinfo.rescode === 0) {
          this.crtinfo = res.data.crtinfo
        } else {
          this.crtinfo = {
            commonName: '没有检测到相关证书(可能是 ANYPROXY 尚未开启)',
            notBefore: '无',
            notAfter: '无'
          }
        }
        if (res.data.pacproxy) {
          this.config_pac.proxy = res.data.pacproxy
        }
        if (res.data.pacfinal) {
          this.config_pac.final = res.data.pacfinal
        }
        this.$message.success('成功获取 mitmhost 列表 ' + this.mitmhost.length)
      }).catch(e=>{
        this.$message.error('获取 mitmhost 数据失败 ' + e.message)
        console.error('获取 mitmhost 数据失败', e)
      }).finally(hideloading)
    },
    crtstoupload(){
      this.crtfiles = this.$refs.crtfiles.files
    },
    crtUpload(){
      if (this.crtfilename.indexOf('rootCA.crt') === -1 || this.crtfilename.indexOf('rootCA.key') === -1) {
        this.$message.error('根证书应该包含 rootCA.crt/rootCA.key 两部分')
        return
      }
      let formData = new FormData()
      for(let upfs of this.crtfiles){
        formData.append(upfs.name, upfs)
      }

      this.$axios.post('/crt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((res)=>{
        console.log(res.data, res.status)
        if (res.data.rescode === 0) {
          this.$message.success('上传成功 ' + res.data.message + '\n将在 ANYPROXY 重启后自动应用')
          this.crtfiles = ''
          this.$refs.crtfiles.value = ''
        } else {
          this.$message.success('上传失败 ' + res.data.message)
        }
      }).catch(()=>{
        this.$message.error('上传失败 FAILURE!!')
      })
    },
    crtClear(){
      if (confirm("清空由之前根证书已签发的所有证书？")) {
        const hideloading = this.$message.loading('证书清除中...', 0)
        this.$axios.put('/crt', { op: 'clearcrt' }).then(res=>{
          this.$message.success('清除完成', res.data.message)
        }).catch(e=>{
          this.$message.error('操作失败', e.message)
          console.error(e)
        }).finally(hideloading)
      }
    },
    crtInstall(){
      if (this.crtinfo.rescode === 0) {
        window.open('/crt' + (this.crt_type !== 'crt' ? '?type=' + this.crt_type : ''))
      } else {
        this.$message.error('当前并没有证书可供下载，可能是 ANYPROXY 尚未开启')
      }
    },
    crtNew(){
      if (!this.newcrt.commonName) {
        this.$message.error('请先输入证书名称')
        return
      }
      const hideloading = this.$message.loading('证书生成中...', 0)
      this.$axios.put('/crt', { op: 'new', data: this.newcrt }).then(res=>{
        if (res.data.rescode === 0) {
          this.$message.success('成功生成新的根证书\n' + res.data.message + '\n将在 ANYPROXY 重启后自动应用')
        } else {
          this.$message.success('自签根证书生成失败\n' + res.data.message)
        }
      }).catch(e=>{
        this.$message.error('操作失败 ' + e.message)
        console.error(e)
      }).finally(hideloading)
    },
    hostSave(){
      let enablect = 0, mitmall = false
      let templist = this.mitmhost.filter(host=>{
        if (host.host) {
          if (host.enable) {
            enablect++
            if (host.host === '*') {
              mitmall = true
            }
          }
          return true
        }
      })
      if (confirm(`共 ${ enablect }/${ templist.length } 个 mitmhost 将被保存，${ this.mitmhosteble.enable ? (mitmall ? '包含单独 * 项，将解析所有域名，' : '') : '但不启用，' }确定保存？`)) {
        this.mitmhost = templist
        const hideloading = this.$message.loading('mitmhost 上传保存中...', 0)
        this.$axios.put('/data', { type: 'mitmhost', data: this.mitmhost, mitmhostenable: this.mitmhosteble.enable }).then((res)=>{
          if (res.data.rescode === 0) {
            this.$message.success('保存成功', res.data.message)
          } else {
            this.$message.error('mitmhost 保存失败', res.data.message)
          }
        }).catch((e)=>{
          this.$message.error('mitmhost 保存失败', e.message)
          console.error('mitmhost 保存失败', e)
        }).finally(hideloading)
      }
    },
    cacheClear(){
      const hideloading = this.$message.loading('清空 ANYPROXY temp cache 文件夹中...', 0)
      this.$axios.delete('/tempcaches').then((res)=>{
        console.debug('清空 ANYPROXY temp cache 返回结果', res.data)
        if (res.data.rescode === 0) {
          this.$message.success('清空完成', res.data.message)
        } else {
          this.$message.error('清空失败', res.data.message)
        }
      }).catch((e)=>{
        this.$message.error('清空失败', e.message)
        console.error(e)
      }).finally(hideloading)
    },
    mhostDel(index){
      this.$delete(this.mitmhost, index)
    },
    mhostDelCks(){
      this.mitmhost = this.mitmhost.filter((host, idx)=>!this.mitmChecked[idx])
      this.$message.success(`成功删除 ${this.mitmCheck.length} 条规则，保存后正式生效`)
      this.mitmCheck = []
    },
    crtHost(){
      if (!this.crt_host) {
        this.$message.error('请先输入要签发证书的域名')
        return
      }
      window.open('./crt/new/' + this.crt_host)
    },
    mitmCkall(e){
      this.mitmChecked = e.target.checked ? 'all' : 'none'
    },
    eproxyToggle(op = ''){
      if(!this.$wsrecv.connected) {
        this.$message.error('websocket 尚未连接，指令无法发送')
        return
      }
      switch (op) {
      case 'open':
        if (this.eproxy.enable) {
          this.$message.success('当前 MITM 功能已处于启用状态')
          return
        }
        if (confirm(`确定打开 ANYPROXY，启用 MITM 功能？`)) {
          this.eproxy.enable = true
          this.$wsrecv.send('eproxy', { ...this.eproxy })
        }
        break
      case 'close':
        if (!this.eproxy.enable) {
          this.$message.success('当前 MITM 功能已处于关闭状态')
          return
        }
        if (confirm('确定关闭 ANYPROXY，暂停 MITM 功能？')) {
          this.eproxy.enable = false
          this.$wsrecv.send('eproxy', 'close')
        }
        break
      case 'restart':
        if (confirm('确定重启 ANYPROXY？')) {
          this.eproxy.enable = true
          this.$wsrecv.send('eproxy', { op: 'restart', ...this.eproxy })
        }
        break
      default:
        this.$message.error('未知操作', op)
      }
    },
  }
}
</script>

<style scoped>
.mitmset {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  padding: 0.5em;
  margin-bottom: var(--base-sz);
  border-radius: var(--radius-bs);
  background: var(--icon-bk);
  color: var(--main-fc);
}
.mitmset_item {
  width: 340px;
  box-sizing: border-box;
  padding-left: 1em;
  border-radius: var(--radius-hf);
  text-align: center;
  font-size: 20px;
  background: var(--main-fc);
  color: var(--main-cl);
}
.mitmset_bl1 {
  border-left: 1px solid var(--tras-bk);
}
.mitmset_status {
  height: 40px;
  display: flex;
  align-items: center;
  background: var(--icon-bk);
  padding: 0 1em;
  border-radius: var(--radius-hf);
  font-size: 20px;
}
.mitmset--close {
  background: var(--tras-bk);
}

.mitmcrt {
  display: flex;
  justify-content: center;
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: stretch;
  align-content: center;
  border-radius: var(--radius-bs);
  padding: 8px;
  margin-top: var(--base-sz);
  margin-bottom: 0;
  text-align: center;
  background: var(--main-bk);
}

.mitm_border {
  border: 1px solid var(--main-cl);
  border-radius: 8px;
  padding: 6px;
  margin: 6px 0;
  flex-wrap: wrap;
}

.mitmcrt_title {
  font-size: 24px;
  color: var(--main-fc);
  text-align: center;
  border-bottom: 1px solid;
  padding-bottom: 4px;
}

.sfcrt_self {
  width: 100%;
  display: inline-flex;
  justify-content: space-evenly;
  align-items: center;
  margin-top: 3px;
  padding-top: 3px;
  border-top: 1px solid white;
}
.sfcrt_label {
  font-size: 20px;
  color: var(--main-cl);
}
.sfcrt_host {
  width: 320px;
}
.sfcrt_info {
  font-size: 20px;
  color: var(--main-fc);
}
.eupload--crt {
  width: 60%;
}

.eupload_file--crt::before {
  content: '上传自签根证书';
}
</style>