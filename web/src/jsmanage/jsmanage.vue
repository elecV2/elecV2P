<template>
  <section>
    <header class="header">{{ $ta('script', 'manage') }}</header>
    <main class="content" @click="menu={}">
      <contextmenu :menus="menu.list" :pos="menu.pos" />
      <store @belongview="($event && $event.includes('|')) ? jsname = $event : jsView($event)" :logs="logs"/>
      <div class="title--radius" @keyup.esc.prevent.stop.exact="menu={}">
        <h4 class="title title--radius">
          <span class="icon cursor title_sync" @click="getJSlist()" title="更新列表" v-html="icon.sync"></span>
          <span class="title_main" title="当前服务器上存在的本地脚本文件数量">{{ $ta('script', 'files') }} - {{ jslists.length }}</span>
          <span class="title_arrow" :class="{ 'title_arrow--up': collapse.titlearrow }" @click.prevent.self="collapse.titlearrow=!collapse.titlearrow"></span>
        </h4>
        <div class="uploadjs" v-show="collapse.titlearrow">
          <div class="eflex w100 eflex--between">
            <input class="elecTable_input wp80" type="text" placeholder="远程脚本链接 script url" v-model.trim="jsdownloadurl" @keyup.enter="jsDownload()">
            <button class="elecBtn wp19" @click="jsDownload()">{{ $ta('start', 'push') }}</button>
          </div>
          <div class="eflex eflex--between w100 emargin">
            <div class="eupload wp80">
              <input type="file" ref="jsfiles" accept=".js, .efh" multiple @change="jstoupload" class="eupload_file" title="choose script files" />
              <span v-show="jsfiles.length" class="eupload_span">{{ jsfilename }}</span>
            </div>
            <button @click="jsUpload()" class="elecBtn wp19">{{ $ta('start', 'upload') }}</button>
          </div>
        </div>
        <div class="jslists_cont" tabindex="0">
          <ul class="jslists_alljs" @click.prevent="jsOp($event)" @contextmenu.prevent.stop="jsOp($event)">
            <li class="jslists_item" v-for="jsfn in jslistsshow" :key="jsfn">
              <span class="jsitem_view" data-method="view" :data-param="jsfn">👁️</span>
              <span data-method="menu" :data-param="jsfn">{{ jsfn }}</span>
              <span class="jsitem_delete" data-method="delete" :data-param="jsfn">X</span>
            </li>
            <li class="jslists_item jslists_item--showrest" v-show="!!restnum">
              <span @click="shownum=-1">{{ $ta('show', 'rest') }} {{ restnum }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="editor editor--jsmanage" :class="{ 'editor--full': !collapse.editor }">
        <h3 class="editor_title">
          <div class="eflex wp46 minw320 epos_rel">
            <label class="minw100">{{ $t('name') }}： </label>
            <input class="elecTable_input" v-model.trim="jsname"
            @keyup.enter="jsView(jsname)"
            @keydown.ctrl.delete.exact="jsDelete(jsname)"
            @keydown.ctrl.83.prevent.stop.exact="jsSave()"
            @keydown="jsshowall=false"
            placeholder="脚本文件名 enter: 查看，ctrl+del: 删除" />
            <button class="elecBtn elecBtn--del" v-show="jsname"
            @click.prevent.stop="jsDelete(jsname)">X</button>
          </div>
          <div class="script_info" :class="{ hide: !jsupdate }">
            <span class="eflex script_size" title="脚本大小">{{ jssize }}</span>
            <span class="emargin--d5em" title="最近更新">{{ jsupdate }}</span>
          </div>
          <div class="eflex bk_main_cl radius_bs">
            <button class="elecBtn greenbk elecBtn--new" @click.prevent.stop="jsView()">{{ $ta('new', 'script') }}</button>
            <button class="elecBtn bk_secd_fc radius_zero" @click.prevent.stop="scriptTask()">{{ $ta('add', 'task') }}</button>
            <span class="title_collapse emargin--d5em" :class="{ 'title_collapse--collapsed': collapse.editor }" @click.prevent.self="collapse.editor=!collapse.editor" title="全屏"></span>
          </div>
        </h3>
        <textarea class="editor_textarea" :class="{ 'editor_textarea--nowrap': textarea_nowrap }" v-model="jscontent"
          :placeholder="orgjs"
          @keydown.tab.exact.prevent.stop="$uApi.insertText('  ')"
          @keydown.ctrl.83.prevent.stop="jsSave()"
          @keydown.ctrl.enter.prevent.exact="jsTest()"
          @keydown.alt.enter.prevent.exact="textarea_nowrap=!textarea_nowrap"
          @keydown.ctrl.66.prevent.stop.exact="jsTest()">
        </textarea>
        <div class="eflex eflex--wrap w100" title="tab: 两个空格 ctrl+s: 保存 ctrl+enter/ctrl+b: 测试运行 alt+enter: 不换行">
          <button class="elecBtn elecBtn--jseditor" @click="jsSave()">{{ $ta('save', 'script') }}(ctrl+s)</button>
          <button class="elecBtn elecBtn--jseditor" @click="jsTest()">{{ $ta('test', 'run') }}(ctrl+b)</button>
        </div>
      </div>
      <mock :jslists="jslists" />
      <log :logs="logs" :title="runlogs" :collapse="collapse" />
    </main>
    <footer class="footer">
      <ul class="footer_tip">
        <li>当远程脚本无法推送时，尝试在 SETTING 界面添加代理</li>
        <li>远程推送脚本时可附加 -rename=xxx.js 重命名文件</li>
        <li>mock 网络请求可用于检查网络及代理是否正常</li>
        <li>{{ $ta('more', 'detail') }} <a href="https://github.com/elecV2/elecV2P-dei/tree/master/docs/04-JS.md" target="elecV2PDoc">{{ $t('document') }}：04-JS.md</a></li>
      </ul>
    </footer>
  </section>
</template>

<script>
import store from './store.vue'
import mock from './mock.vue'
import log from '../utils/log.vue'
import icon from '../utils/icon.js'
import contextmenu from '../utils/contextmenu.vue'

export default {
  name: "jsmanage",
  data(){
    return {
      jslists: [],
      jsdownloadurl: '',
      jsname: '',
      jscontent: '',
      jsupdate: '',
      jssize: '',
      jsshowall: false,
      jsfiles: [],
      orgjs: `// 每个脚本理论上都有权限对服务器上的任一文件进行随意修改，请勿运行不信任的脚本
console.log('当前 elecV2P 版本', __version)
// 获取 store/cookie 值
let val = $store.get('cookieKEY')
console.log('cookieKEY 对应值:', val)

// 发送通知
$feed.push('elecV2P 通知', '该通知来自脚本' + __name + '\\n\\n更多说明请查看: https://github.com/elecV2/elecV2P-dei/tree/master/docs/07-feed&notify.md', 'https://github.com/elecV2/elecV2P')

// 网络请求
$axios({
  url: 'https://httpbin.org/post',
  headers: {
    'User-Agent': 'elecV2P Super Max Plus++',
  },
  method: 'post'
}).then(res=>{
  console.log(res.data)
}).catch(e=>console.error(e.message)).finally(()=>{
  $done('网络请求执行完毕')
})

console.log('更多脚本相关说明请查看说明文档: https://github.com/elecV2/elecV2P-dei/tree/master/docs/04-JS.md')
`,
      logs: [],
      icon,
      collapse: {
        titlearrow: this.$uStr.iRandom(0, 10) > 2,
        loginfo: true,
        editor: true,
      },
      shownum: 100,
      restnum: 0,
      menu: {
        pos: [0, 0],
        list: []
      },
      textarea_nowrap: false,
      runlogs: this.$ta('script', 'run', 'logs'),
    }
  },
  components: {
    store, log, mock, contextmenu
  },
  activated(){
    const viewfn = this.$uApi.store.getCache('scriptview')
    if (!viewfn) {
      return
    }
    if (this.jslists.length) {
      this.jsView(viewfn)
    } else {
      this.getJSlist().then(()=>{
        this.jsView(viewfn)
      })
    }
    this.$uApi.store.deleteCache('scriptview')
  },
  computed: {
    jsfilename(){
      let upfs = []
      for(let i=0; i<this.jsfiles.length; i++){
        upfs.push(this.jsfiles[i].name)
      }
      return upfs.join(', ')
    },
    jsshow(){
      let snum = this.shownum
      if (snum === -1 || snum >= this.jslists.length) {
        this.restnum = 0
        return this.jslists
      }
      let i = 0, fshow = []
      while (i++ < snum) {
        fshow.push(this.jslists[i])
      }
      this.restnum = this.jslists.length - i + 1
      return fshow
    },
    jslistsshow(){
      if (this.jsshowall || !this.jsname || this.jsname === 'new.js') {
        return this.jsshow
      }
      let nregx = new RegExp(this.jsname, 'i')
      let fshow = this.jsshow.filter(fn=>{
        try {
          return nregx.test(fn)
        } catch(e) {
          return true
        }
      })
      if (fshow.length === 0 && this.shownum !== -1) {
        this.shownum = -1
      }
      return fshow
    }
  },
  created(){
    if (!this.$uApi.store.getCache('scriptview')) {
    this.getJSlist().then(()=>{
      const fn = new URL(location).searchParams.get('fn')
      if (fn) {
        this.jsView(fn)
      }
    })
    }

    const wserr = this.$wsrecv.add('jsmanage', data=>{
      if (this.logs.length >= 200 || /\x1b\[H/.test(data)) {
        this.logs = [data]
      } else if (/\r|(\x1b\[F)/.test(data)) {
        this.logs.splice(0, 1, data)
      } else {
        this.logs.unshift(data)
      }
    })

    if (wserr) {
      this.logs.unshift(`[${this.$logHead('websocket error')}][${this.$sTime(null, 1)}] \x1b[31m${wserr}, 日志无法传输`)
    }
  },
  methods: {
    async getJSlist() {
      const hideloading = this.$message.loading('获取脚本列表中...', 0)
      let res = await this.$axios.get('/jsfile').catch(e=>{
        this.$message.error('获取脚本列表失败', e.message)
        this.logs.unshift(`[${this.$logHead('jsmanage error')}][${this.$sTime(null, 1)}] \x1b[31m脚本列表获取失败 ${e.message}`)
        console.error('获取失败', e)
      })
      if (res && res.data) {
        this.jslists = res.data
        this.$message.success(`成功获取脚本列表 ${this.jslists.length}`)
        this.logs.unshift(`[${this.$logHead('jsmanage info')}][${this.$sTime(null, 1)}] 成功获取脚本 ${this.jslists.length}`)
      }
      hideloading()
    },
    jsDownload() {
      if (!this.jsdownloadurl || /^https?:\/\/\S{4}/.test(this.jsdownloadurl) === false) {
        this.$message.error('该远程脚本链接有误', this.jsdownloadurl)
        return
      }
      let ren = this.jsdownloadurl.match(/ -rename(=| )([^\- ]+)/), jsname = '', downloadurl = ''
      if (ren && ren[2]) {
        jsname = ren[2].replace(/^(\\|\/)+/, '')
        downloadurl = this.jsdownloadurl.replace(/ -rename(=| )([^\- ]+)/, '').trim()
      } else {
        jsname = this.$uStr.surlName(this.jsdownloadurl)
        downloadurl = this.jsdownloadurl
      }
      if (!/\.(js|efh)$/.test(downloadurl) && !confirm('当前远程链接对应文件可能并非脚本文件，是否继续？')) {
        return
      }
      if (this.jslists.indexOf(jsname) === -1 || confirm(jsname + " 已存在，是否覆盖？")) {
        const hideloading = this.$message.loading(`${jsname} 下载中...`, 0)
        this.$axios.put('/jsfile', { op: 'jsdownload', name: jsname, url: downloadurl }).then(res=>{
          if (res.data.rescode === 0) {
            this.$message.success(jsname, '下载成功')
            if(this.jslists.indexOf(jsname) === -1) {
              this.jslists.push(jsname)
            }
            this.logs.unshift(`[${this.$logHead('jsDownload info')}][${this.$sTime(null, 1)}] ${jsname} 下载成功 ${res.data.message}`)
          } else {
            this.$message.error(jsname, '下载失败')
            this.logs.unshift(`[${this.$logHead('jsDownload error')}][${this.$sTime(null, 1)}] \x1b[31m${downloadurl} 下载失败 ${res.data.message}`)
          }
        }).catch(e=>{
          this.$message.error('下载失败', e.message)
          this.logs.unshift(`[${this.$logHead('jsDownload error')}][${this.$sTime(null, 1)}] \x1b[31m${downloadurl} 下载失败，${e.message}`)
          console.error(downloadurl, '下载失败', e)
        }).finally(hideloading)
      }
    },
    jsSave(){
      if (!/\.(js|efh)$/i.test(this.jsname)) {
        this.$message.error('脚本文件名错误')
        this.logs.unshift(`[${this.$logHead('jsSave error')}][${this.$sTime(null, 1)}] \x1b[31m${this.jsname} 并非合法的脚本名称。编辑上传其他类型的文件请前往 EFSS 界面`)
        return
      }
      if (!this.jscontent) {
        this.$message.error('请先输入脚本内容')
        this.logs.unshift(`[${this.$logHead('jsSave error')}][${this.$sTime(null, 1)}] \x1b[31m保存脚本失败，请先输入脚本内容`)
        return
      }
      const hideloading = this.$message.loading(this.jsname, '保存中...', 0)
      this.$axios.post("/jsfile", {
        jsname: this.jsname,
        jscontent: this.jscontent
      }).then(res=>{
        if (res.data.rescode === 0) {
          this.$message.success(this.jsname, '保存成功')
          if (this.jslists.indexOf(this.jsname) === -1) {
            this.jslists.push(this.jsname)
          }
          this.logs.unshift(`[${this.$logHead('jsSave info')}][${this.$sTime(null, 1)}] ${this.jsname} 保存成功`)
          this.jsupdate = this.$sTime();
          this.jssize = this.$uStr.kSize((new TextEncoder().encode(this.jscontent)).length)
        } else {
          this.$message.error(this.jsname, '保存失败', res.data.message)
          this.logs.unshift(`[${this.$logHead('jsSave error')}][${this.$sTime(null, 1)}] \x1b[31m${this.jsname} 保存失败`)
        }
      }).catch(e=>{
        console.error(e)
        this.$message.error('保存失败', e.message)
        this.logs.unshift(`[${this.$logHead('jsSave error')}][${this.$sTime(null, 1)}] \x1b[31m保存失败 ${e.message}`)
      }).finally(hideloading)
    },
    jsTest(){
      if (this.jsname && this.jscontent) {
        if (/\$request|\$response/.test(this.jscontent) && !confirm('$request/$response 等参数仅在网络请求中有效，是否继续执行？')) {
          return
        }
        let testres = ''
        const hideloading = this.$message.loading(this.jsname, '正在上传运行中...', 0)
        this.collapse.loginfo = false
        this.logs.unshift(`[${this.$logHead('jsTestRun info')}][${this.$sTime(null, 1)}] 正在测试运行 ${this.jsname}...`)
        this.$axios.post("/jsfile", {
          id: this.$wsrecv.id,
          type: 'totest',
          jsname: this.jsname,
          jscontent: this.jscontent,
        }).then(res=>{
          testres = this.$sString(res.data)
          this.$message.success(testres)
        }).catch(e=>{
          testres = '测试运行失败 ' + e.message
          this.$message.error(testres)
          console.error(e)
        }).finally(()=>{
          hideloading()
          this.logs.unshift(`[${this.$logHead(this.jsname + ' result')}][${this.$sTime(null, 1)}] ${testres || this.jsname + ' 返回值为空'}`)
        })
      } else {
        this.$message.error('脚本名称或内容不完整')
      }
    },
    jstoupload(){
      this.jsfiles = this.$refs.jsfiles.files
    },
    jsUpload(){
      let formData = new FormData()
      let upflists = []
      for(let i=0; i<this.jsfiles.length; i++){
        if (/javascript/i.test(this.jsfiles[i].type) || /\.efh$/.test(this.jsfiles[i].name)) {
          formData.append(this.jsfiles[i].name, this.jsfiles[i])
          upflists.push(this.jsfiles[i].name)
        } else {
          let errmsg = this.jsfiles[i].name + ' 并非脚本文件，跳过上传。' + this.jsfiles[i].type
          this.$message.error(errmsg)
          this.logs.unshift(`[${this.$logHead('jsUpload error')}][${this.$sTime(null, 1)}] \x1b[31m${errmsg}`)
        }
      }

      if (upflists.length === 0) {
        this.$message.error('请选择脚本文件后，再进行上传')
        return
      }
      const hideloading = this.$message.loading('上传中...', 0)
      this.$axios.post('/uploadjs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((res)=>{
        if (res.data.rescode === 0) {
          this.$message.success(upflists.join(', '), "上传成功")
          upflists.forEach(fname=>{
            if (this.jslists.indexOf(fname) === -1) this.jslists.push(fname)
          })
          this.jsfiles = ''
          this.$refs.jsfiles.value = ''
          this.logs.unshift(`[${this.$logHead('jsUpload info')}][${this.$sTime(null, 1)}] ${upflists.join(', ')} 上传成功`)
        } else {
          this.$message.error('上传失败', res.data.message)
          this.logs.unshift(`[${this.$logHead('jsUpload error')}][${this.$sTime(null, 1)}] \x1b[31m上传失败 ${res.data.message}`)
        }
      }).catch(e=>{
        this.$message.error('上传失败', e.message)
        this.logs.unshift(`[${this.$logHead('jsUpload error')}][${this.$sTime(null, 1)}] \x1b[31m上传失败 ${e.message}`)
        console.error('文件上传失败', e)
      }).finally(hideloading)
    },
    jsView(jsfn){
      if (jsfn && this.jslistsshow.length === 1) {
        jsfn = this.jslistsshow[0]
      }
      if (jsfn && this.jslists.indexOf(jsfn) !== -1) {
        this.jsname = jsfn
        const hideloading = this.$message.loading('正在获取', jsfn, '文件内容...', 0)
        this.$axios.get('/jsfile?jsfn=' + jsfn, {
          transformResponse: [data=>data],
        }).then(res=>{
          this.jscontent = res.data
          this.$message.success(jsfn, '文件内容获取成功')
          this.logs.unshift(`[${this.$logHead('jsmanage info')}][${this.$sTime(null, 1)}] ${jsfn} 文件内容获取成功`)
          if (res.headers['last-modified']) {
            this.jsupdate = this.$sTime(res.headers['last-modified']);
            this.jssize = this.$uStr.kSize((new TextEncoder().encode(res.data)).length)
          } else {
            this.jsupdate = '';
          }
        }).catch(e=>{
          this.$message.error(jsfn, '获取失败', e.message)
          this.logs.unshift(`[${this.$logHead('jsmanage error')}][${this.$sTime(null, 1)}] \x1b[31m${jsfn} 获取失败 ${e.message}`)
          console.error(jsfn, '获取失败', e)
        }).finally(hideloading)
      } else if (/^https?:\/\//.test(jsfn)) {
        let hideloading = this.$message.loading('检测到该脚本文件名为远程地址，正在尝试获取其文件内容...', 0)
        this.$axios.get(jsfn, {
          transformResponse: [data=>data],
          crossdomain: true
        }).then(res=>{
          this.jsname = this.$uStr.surlName(jsfn)
          this.jscontent = res.data
          this.$message.success('远程脚本文件', this.jsname, '获取成功')
          this.logs.unshift(`[${this.$logHead('jsmanage info')}][${this.$sTime(null, 1)}] ${jsfn} 文件内容获取成功`)
          this.jsupdate = '';
        }).catch(e=>{
          this.$message.error('远程脚本内容获取失败', e.message)
          this.logs.unshift(`[${this.$logHead('jsmanage error')}][${this.$sTime(null, 1)}] \x1b[31m获取远程脚本: ${jsfn} 失败，请检测网络后重试 ${e.message}`)
          console.error(e)
        }).finally(hideloading)
      } else {
        this.jsname = jsfn || 'new.js'
        if (this.jsname !== 'new.js') {
          this.$message.error(jsfn, '暂不存在')
          this.logs.unshift(`[${this.$logHead('jsmanage error')}][${this.$sTime(null, 1)}] \x1b[31m${jsfn} 暂不存在`)
        }
        if (this.jscontent === '' || this.jsname === 'new.js') {
          this.jscontent = this.orgjs
        }
        this.jsupdate = '';
      }
      this.jsshowall = true
      this.$uApi.scrollView('.editor--jsmanage')
    },
    jsDelete(jsfn){
      if (!jsfn) {
        this.$message.error('请先输入要删除的文件名')
        return
      }
      if (confirm("确认删除服务器端脚本文件： " + jsfn)){
        const hideloading = this.$message.loading(`正在删除文件 ${jsfn}...`, 0)
        this.$axios.delete("/jsfile", { data: { jsfn } }).then(res=>{
          if (res.data.rescode === 0) {
            const index = this.jslists.indexOf(jsfn)
            if (index > -1) {
              this.jslists.splice(index, 1)
              this.$message.success(jsfn, '已删除')
              this.logs.unshift(`[${this.$logHead('jsDelete info')}][${this.$sTime(null, 1)}] ${jsfn} 已删除 ${res.data.message}`)
              if (this.jsname === jsfn) {
                this.jsname = ''
                this.jscontent = ''
              }
            } else {
              this.$message.error(jsfn, "文件不存在")
            }
          } else {
            this.$message.error(jsfn, '删除失败')
            this.logs.unshift(`[${this.$logHead('jsDelete error')}][${this.$sTime(null, 1)}] \x1b[31m${jsfn} 删除失败 ${res.data.message}`)
          }
        }).catch(e=>{
          this.$message.error('未知错误', e.message)
          this.logs.unshift(`[${this.$logHead('jsDelete error')}][${this.$sTime(null, 1)}] \x1b[31m${jsfn} 删除失败 ${e.message}`)
          console.error('未知错误', e)
        }).finally(hideloading)
      }
    },
    jsOp(event){
      switch(event.target.dataset.method) {
      case 'view':
        this.jsView(event.target.dataset.param)
        break
      case 'delete':
        this.jsDelete(event.target.dataset.param)
        break
      case 'menu':
        this.jsMenu(event.target.dataset.param)
        break
      }
    },
    jsRun(jsfn){
      if (!jsfn) {
        this.$message.error('请先输入脚本名称')
        return
      }
      const hideloading = this.$message.loading(jsfn, '准备运行中...', 0)
      this.collapse.loginfo = false
      this.logs.unshift(`[${this.$logHead('jsRun info')}][${this.$sTime(null, 1)}] 正在运行 ${jsfn}...`)
      this.$axios.post("/jsfile", {
        id: this.$wsrecv.id,
        type: 'torun',
        jsname: jsfn,
      }).then(res=>{
        this.$message.success(res.data)
      }).catch(e=>{
        this.$message.error(e.message)
        console.error(e)
      }).finally(hideloading)
    },
    jsMenu(jsfn){
      let menuitems = [], jsDelete = this.jsDelete,
          jsView = this.jsView, jsRun = this.jsRun,
          urlopen = this.$uApi.open, copy = this.$uApi.copy,
          eMsg = this.$message.success;
      let bEfh = /\.efh$/.test(jsfn);
      menuitems.push({
        label: '运行',
        bkcolor: 'var(--icon-bk)',
        click(){
          jsRun(jsfn)
        }
      }, {
        label: '查看',
        click(){
          jsView(jsfn)
        }
      }, {
        label: '删除',
        bkcolor: 'var(--note-bk)',
        click(){
          jsDelete(jsfn)
        }
      }, {
        label: '复制脚本名称',
        click(){
          copy(jsfn)
          eMsg('复制成功')
        }
      }, {
        label: `${ bEfh ? '新标签页' : '附带参数' }运行`,
        bkcolor: 'var(--icon-bk)',
        click(){
          if (bEfh) {
            urlopen('run/?target=' + encodeURI(jsfn))
            return
          }
          let param = prompt('请输入附带参数（比如：-env name=elecV2P 或 -grant nodejs）', '-env ')
          if (param === null) {
            return
          }
          jsRun(jsfn + (param ? ' ' + param.trim() : ''))
        }
      }, {
        label: '打开日志文件',
        click(){
          urlopen('./logs/' + jsfn.replace(/\/|\\/g, '-') + '.log')
        }
      })
      this.menu = {
        pos: this.$uApi.getCursorPos(event, 120, 32 * menuitems.length),
        list: menuitems
      }
    },
    scriptTask(){
      let content = this.jscontent, jsname = this.jsname;
      if (!content) {
        this.$message.error('请先获取脚本内容');
        return;
      }
      let mastr = content.match(/([0-9\-\*\/,]+ [0-9\-\*\/,]+ [0-9\-\*\/,]+ [0-9\-\*\/,]+ [0-9\-\*\/,]+( [0-9\-\*\/,]+)?) ([^ ,]+), ?tag=([^, \n\r]+)/);
      if (!mastr) {
        mastr = content.match(/([0-9\-\*\/,]+ [0-9\-\*\/,]+ [0-9\-\*\/,]+ [0-9\-\*\/,]+ [0-9\-\*\/,]+( [0-9\-\*\/,]+)?)"?( (script\-path=)?([^, \n\r]+\.js))?(, ?tag=([^, \n\r]+))?/) || [];
        if (mastr[5]) {
          mastr[3] = mastr[5];
        }
        mastr[4] = mastr[7] || '';
      }
      let rAxios = this.$axios, rMessage = this.$message;
      this.$evui({
        title: '添加新的定时任务',
        width: 800,
        height: 148,
        style: {
          title: 'background: var(--secd-fc);',
          content: 'margin-top: .5em; font-family: var(--font-fm);'
        },
        content: `<div class="eflex eflex--wrap w100"><input name="task_name" class="elecTable_input" style="width: 120px;margin-right: 5px;" placeholder="任务名称" value="${ mastr[4] || '' }"><select name="task_type" class="elecTable_select" style="width: 120px;margin-right: 5px;"><option value="cron">cron定时</option><option value="schedule">倒计时</option></select><input name="task_time" class="elecTable_input" style="width: 160px;margin-right: 5px;" placeholder="任务运行时间" value="${ mastr[1] || '8 10 0 * * *' }"><span style="background: var(--main-fc);height: 40px;line-height: 40px;width: 86px;color: var(--main-cl);text-align: center;font-size: 20px;border-radius: 8px;margin-right: 5px;padding: 0 .5em;">运行脚本</span><input name="task_target" class="elecTable_input" style="width: 220px;" placeholder="脚本名称" value="${ mastr[3] || jsname }"></div><div class="center" style="margin-top: .6em;"><button class="elecBtn greenbk emargin--d5em" data-method="addTask">确认添加</button><button class="elecBtn bk_main_bk emargin--d5em" data-method="nav" data-param="task">任务列表</button></div>`,
        methods: {
          addTask(){
            let el = document.querySelector('.elecBtn[data-method=addTask]')
            if (el) {
              if (el.dataset.done) {
                rMessage.success('该任务已添加')
                return
              }
              el.dataset.done = '1'
              el.classList.remove('greenbk')
              el.classList.add('elecBtn--stop')
            }
            let name = document.querySelector('.elecTable_input[name=task_name]').value;
            let time = document.querySelector('.elecTable_input[name=task_time]').value;
            let target = document.querySelector('.elecTable_input[name=task_target]').value;
            if (!(name && time && target)) {
              rMessage.error('请填写完整的任务内容');
              delete el.dataset.done;
              return;
            }
            rAxios.put('/task', {
              op: 'add',
              data: {
                type: 'addition',
                task: {
                  name,
                  type: document.querySelector('.elecTable_select[name=task_type]').value,
                  time,
                  job: {
                    type: 'runjs',
                    target,
                  },
                  running: true,
                },
              }
            }).then(res=>{
              if (res.data.rescode === 0) {
                rMessage.success('添加定时任务', name, res.data.message);
              } else {
                delete el.dataset.done;
                rMessage.error('添加定时任务失败', res.data.message);
              }
            }).catch(e=>{
              rMessage.error('添加定时任务失败', e.message);
              console.error('添加定时任务失败', e);
              delete el.dataset.done;
            })
          }
        }
      })
    },
  }
}
</script>

<style scoped>
.elecBtn--jseditor {
  width: 40%;
  max-width: 100%;
  min-width: 240px;
  margin: .3em .5em 0;
  font-size: 22px;
}
.elecBtn--new {
  border-radius: var(--radius-bs) 0 0 var(--radius-bs);
}
.eupload_file::before {
  content: '本地脚本选择';
}
.uploadjs {
  padding: 0 var(--padding-lr);
  background-color: var(--main-bk);
}

.jslists_cont {
  outline: none;
  border-left: 1em solid var(--main-bk);
  border-right: 1em solid var(--main-bk);
}

.jslists_alljs {
  display: flex;
  overflow-y: auto;
  flex-wrap: wrap;
  justify-content: space-between;
  max-height: 240px;
}

.jslists_item {
  height: 42px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: .1em .3em;
  border-radius: .5em;
  word-break: break-word;
  font-size: 20px;
  color: var(--main-fc);
  background: var(--main-cl);
  cursor: text;
}

.jslists_item--showrest {
  padding: 0 1em;
  background: var(--secd-fc);
  cursor: pointer;
}

.jsitem_delete, .jsitem_view {
  padding: 6px 8px;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
}
.jsitem_delete {
  opacity: 0;
}
.jsitem_delete:hover{
  background: var(--delt-bk);
  opacity: 1;
}
.editor--jsmanage {
  border-radius: 0 0 var(--radius-bs) var(--radius-bs);
}
.script_info {
  height: 40px;
  box-sizing: border-box;
  border: 1px solid;
  border-radius: .5em;
  font-size: 16px;
}
.script_size {
  height: 38px;
  padding: 0 .5em;
  border-right: 1px solid;
}
</style>