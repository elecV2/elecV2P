<template>
  <div id="app" @click="menu={}" @keyup.esc.prevent.stop.exact="menu={}" tabindex="0">
    <editor :file="fileedit" /><message />
    <preview :preview="preview" @eRemove="eRemove" />
    <contextmenu :menus='menu.list' :pos='menu.pos' />
    <div class="efssset_container">
    <div class='efssset' :class="{ 'efssset--collapsed': collapse.efssset }" @keydown.ctrl.83.prevent.stop="efssSave()">
      <h4 class="efssset_title">
        <a class="efssset_titlea" href="/" title="回到 webUI 管理界面" v-html="icon.home"></a>
        <a class="efssset_titlea efssset_titlea--main" href="https://github.com/elecV2/elecV2P-dei/tree/master/docs/08-logger&efss.md" target="_blank" title="点击查看相关说明">EFSS 相关设置</a>
        <span class="title_collapse" :class="{ 'title_collapse--collapsed': collapse.efssset }" @click="collapse.efssset=!collapse.efssset"></span>
      </h4>
      <div class="efssset_item">
        <label class="efssset_label">是否开启 EFSS 功能</label>
        <checkbox :oCheck="esconfig" />
      </div>
      <div class="efssset_item">
        <label class="efssset_label">目录</label>
        <input class="efssset_input" @keyup.enter.prevent="efssSave()" v-model.trim="esconfig.directory" name="esconfig" placeholder="例如: script/Shell, ./logs, D:/video, $home 等">
      </div>
      <div class="efssset_item">
        <label class="efssset_label">是否显示 dot(.) 开头文件</label>
        <checkbox :oCheck="esconfig.dotshow" />
      </div>
      <div class="efssset_item">
        <label class="efssset_label">最大读取文件数量</label>
        <input class="efssset_input efssset_input--number" type="number" name="esconfigmax" v-model.number="esconfig.max" placeholder="600">
      </div>
      <div class="efssset_item">
        <label class="efssset_label">跳过文件夹</label>
        <input class="efssset_input" v-model.lazy.trim="skipfolder" name="esconfigskfd" placeholder="完整的文件夹名称 例如: node_modules, logs">
      </div>
      <div class="efssset_item">
        <label class="efssset_label">跳过文件</label>
        <input class="efssset_input" v-model.lazy.trim="skipfile" name="esconfigskfl" placeholder="完整的文件名称 例如: Readme.md, Dockerfile">
      </div>
      <button class="efss_btn" @click.prevent="efssSave()">保存并刷新</button>
    </div>
    <favend :favendlist="esconfig.favend" :efssdir="esconfig.directory" @init="eInit" />
    </div>
    <div class='efsslist'>
      <div class="efsslist_header">
        <span class="efsslist_sync" @click="eInit('list')" title="刷新文件列表" v-html="icon.sync"></span>
        <ul class="efsslist_folder" @contextmenu.prevent="eMenuMkdir($event)" @click.prevent="subGo($event)" title="右键可在当前目录下新建文件/文件夹">
          <li class="efsslist_item">{{ filecheck.length || showlist.length }}</li>
          <li v-for="(sub, index) in subpath" :key="index" class="efsslist_item" :data-index="index">{{ sub[1] }}</li>
        </ul>
        <input class="elecTable_input elecTable_input--caption" :class="{ eopacity: filesearch }" v-model="filesearch" placeholder="搜索文件" title="输入关键字进行过滤显示" @keyup.esc.prevent.stop.exact="filesearch=''">
        <span class="efss_menu" @click.stop.prevent.self="eMenuMkdir($event)">☰</span>
        <span class="title_arrow" :class="{ 'title_arrow--up': collapse.titlearrow }" @click.prevent.self="collapse.titlearrow=!collapse.titlearrow"></span>
      </div>
      <div class="efsslist_op eflex" :class="{ 'efsslist_op--show': filecheck.length }">
        <button class="elecBtn elecBtn--uncheck elecBtn--h32" @click.prevent="editFile()" v-show="isSingleCheck && !isZipCheck">编辑</button>
        <button class="elecBtn elecBtn--uncheck elecBtn--h32" @click.prevent="unzipFile()" v-show="isSingleCheck && isZipCheck">解压</button>
        <button class="elecBtn greenbk elecBtn--h32 emargin" @click.prevent="fileMCheck('all')">全选</button>
        <button class="elecBtn elecBtn--file elecBtn--h32 emargin" @click.prevent="renameFile()" v-show="isSingleCheck">重命名</button>
        <button class="elecBtn elecBtn--file elecBtn--h32 emargin" @click.prevent="zipFiles()" v-show="filecheck.length>1">ZIP打包</button>
        <button class="elecBtn greenbk elecBtn--h32 emargin" @click.prevent="operateFiles()" v-show="fileop.name">粘贴</button>
        <button class="elecBtn greenbk elecBtn--h32 emargin" @click.prevent="copyFiles()">复制</button>
        <button class="elecBtn greenbk elecBtn--h32 emargin" @click.prevent="moveFiles()">剪切</button>
        <button class="elecBtn elecBtn--clear elecBtn--h32 emargin" @click.prevent="deltFiles()">删除</button>
      </div>
      <div class="efssupload" v-show="collapse.titlearrow">
        <div class="eflex w100 eflex--between" title="远程文件链接 -rename=文件名">
          <input class="elecTable_input wp80" type="text" placeholder="远程文件链接 -rename=xxx.xx" v-model.trim="filedownloadurl" @keyup.enter="fileDownload()">
          <button class="elecBtn wp19" @click="fileDownload()" title="远程文件下载到服务器">开始下载</button>
        </div>
        <div class="eflex w100 eflex--between emargin--top">
          <div class="eupload w80">
            <input type="file" ref="efssfiles" name="efss" multiple @change="nUpload" class="eupload_file"/>
            <span v-show="upflists.length" class="eupload_span">{{ efssfilesname }}</span>
          </div>
          <button @click="eUpload" class="elecBtn wp19">开始上传</button>
        </div>
      </div>
      <ul class="efsslist_content" @contextmenu.prevent="eMenu($event)" @click="fileOpdelegate($event)"
        @keydown.ctrl.65.prevent.stop="fileMCheck('all')"
        @keyup.esc.prevent.exact="fileMCheck('none')">
        <li v-for="(fpath, index) in showlist" :key="fpath.name" class="efssa" :class="{ 'efssa--directory': fpath.type === 'directory' }">
          <div v-if="fpath.type === 'file'" class="efssa_check">
            <input type="checkbox" :value="fpath.name" v-model="filecheck" class="echeckbox">
          </div>
          <span class="efssa_name" data-op="open" :data-type="fpath.type" :data-index="fpath.index" :data-name="fpath.name" :data-size="fpath.size">{{ fpath.name }}</span>
          <span class="efssa_mtime" data-op="mkdir">{{ $sTime(fpath.mtime) }}</span>
          <div class="efssa_last">
            <span class="efssa_delete" data-op="del" :data-type="fpath.type" :data-index="fpath.index" :data-name="fpath.name">❌</span>
            <span class="efssa_span">{{ fpath.size || (fpath.list ? fpath.list.length : '') }}</span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import editor from '../utils/editor.vue'
import message from '../utils/message.vue'
import checkbox from '../utils/checkbox.vue'
import icon from '../utils/icon.js'
import contextmenu from '../utils/contextmenu.vue'

import favend from './favend.vue'
import preview from './preview.vue'

import { sseWeb } from '../utils/sse.js'

export default {
  name: "efss",
  data(){
    return {
      icon,
      filelist: {},
      subpath:  [],
      curtdir: '',
      upflists: [],
      esconfig: {
        enable: true,
        directory: './efss',
        dotshow: {
          enable: false
        },
        max: 600,
        skip: {
          folder: [],
          file: []
        },
        favend: {}
      },
      menu: {
        pos: [0, 0],
        list: []
      },
      fileop: {
        name: '',
        folder: '',
        operate: ''
      },
      fileedit: {
        burl: '',
        name: '',
        path: '',
        start: false,
      },
      filecheck: [],
      collapse: {
        titlearrow: this.$uStr.iRandom(0, 10) > 5,
        efssset: this.$uStr.iRandom(0, 10) > 7,
      },
      filedownloadurl: '',
      preview: {
        enable: false,
        type: '',
        base: '',
        name: '',
        list: [],
      },
      imageext: ['png', 'jpg', 'ico', 'svg', 'bmp', 'gif', 'jpeg', 'webp', 'jfif'],
      mediaext: ['mp4', 'm4v', 'm4s', 'ogm', 'ogg', 'ogv', 'webm', 'mp3', 'wav', 'aac'],
      uopenext: ['exe', 'dll', 'msi', 'zip', 'gz', 'rar', '7z', 'iso', 'img', 'avi', 'mov', 'rmvb', 'flv', 'download', 'bin', 'wasm', 'psd', 'pdf', 'cbz', 'epub', 'mobi', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'apk', 'ipa', 'ttf', 'woff', 'dat'],
      filesearch: '',
      locsubpath: this.$sJson(localStorage.getItem('subpath')),
    }
  },
  computed: {
    efssfilesname(){
      let upfs = []
      for(let i=0; i<this.upflists.length; i++){
        upfs.push(this.upflists[i].name)
      }
      return upfs.join(', ')
    },
    postpath(){
      return this.subpath.reduce((ator, cval, cind)=>(cind === 0 || !cval) ? ator : (ator + '/' + cval[1]), '')
    },
    fullpath(){
      return this.curtdir.replace(/\/$/, '') + this.postpath
    },
    curtshow(){
      return this.subpath.reduce((ator, cval, cind)=>(cind === 0 || !cval || !ator.list || !ator.list[cval[0]]) ? ator : ator.list[cval[0]], this.filelist)
    },
    showlist(){
      if (this.curtshow && this.curtshow.list) {
        let dlist = [], flist = []
        this.curtshow.list.forEach((f, index)=>{
          if (this.filesearch && !f.name.includes(this.filesearch)) {
            return
          }
          if (f.type === 'directory') {
            dlist.push({...f, index})
          } else {
            flist.push({...f, index})
          }
        })
        return [...dlist, ...flist]
      }
      return []
    },
    isSingleCheck(){
      return this.filecheck.length === 1
    },
    isZipCheck(){
      return this.filecheck[0] && /\.zip$/.test(this.filecheck[0])
    },
    skipfolder: {
      get(){
        return this.esconfig.skip.folder.join(', ')
      },
      set(val){
        this.esconfig.skip.folder = val.split(/ ?, ?|，| /)
      }
    },
    skipfile: {
      get(){
        return this.esconfig.skip.file.join(', ')
      },
      set(val){
        this.esconfig.skip.file = val.split(/ ?, ?|，| /)
      }
    }
  },
  mounted(){
    this.eInit()
    window.onbeforeunload = ()=>localStorage.setItem('subpath', JSON.stringify(this.subpath))
  },
  components: {
    editor, message, checkbox, favend, contextmenu, preview,
  },
  methods: {
    eInit(type) {
      const hideloading = this.$message.loading('获取 EFSS 相关数据中...', 0)
      this.$axios.get(`/sefss${ type ? '?type=' + type : '' }`).then(res=>{
        let msg = ''
        if (res.data.config) {
          Object.assign(this.esconfig, res.data.config)
          msg += '成功获取 EFSS 相关设置'
        }
        if (res.data.list) {
          this.filelist = res.data.list
          msg += '\n成功获取 EFSS 文件列表'
        }
        if (this.esconfig.enable) {
          if (this.subpath.length === 0) {
            if (this.locsubpath && this.locsubpath[0] && this.locsubpath[0][1] === this.filelist.name) {
              this.subpath = this.locsubpath
            } else {
              this.subpath.push([0, this.filelist.name])
            }
          }
          this.curtdir = this.esconfig.directory
          this.$message.success(msg)
        } else {
          this.$message.success('EFSS 目前处于关闭状态')
        }
        let userid = res.data.userid
        if (userid && this.$uApi.store.getCache('sponsors').has(userid)) {
          let theme_cache = this.$sJson(this.$uApi.store.get('theme'))
          if (theme_cache) {
            this.theme(theme_cache)
          }
        }
        this.fileMCheck('none')
      }).catch(e=>{
        this.$message.error('获取失败', e.message)
        console.error('获取失败', e)
      }).finally(hideloading)
    },
    theme(theme = null){
      if (!theme) {
        return
      }
      if (theme.simple) {
        theme = theme.simple
      }
      if (theme.enable) {
        let theme_css = ''
        if (theme.mainbk) {
          theme_css = `--main-bk: ${ theme.mainbk };`
          if (theme.mainbk.startsWith('#')) {
            theme_css += `--secd-fc: ${ theme.mainbk.padEnd(7, 8).slice(0, 7) }b8;`
          }
        }
        if (theme.maincl) {
          theme_css += `--main-cl: ${ theme.maincl };`
          if (theme.maincl.startsWith('#')) {
            theme_css += `--secd-bk: ${ theme.maincl.padEnd(7, 8).slice(0, 7) }b8;`
          }
        }
        if (theme.appbk) {
          if (/^http/.test(theme.appbk)) {
            theme.appbk = `url(${theme.appbk})`
          }
          theme_css += `background: ${ theme.appbk };`
        }
        if (theme_css) {
          theme_css = `#app{${ theme_css }}`
        }
        if (theme.style) {
          theme_css += theme.style
        }
        this.$uApi.injectCss(theme_css)
        this.$uApi.injectMeta('theme-color', theme.mainbk)
      } else {
        this.$uApi.removeItem('.evtheme')
        this.$uApi.injectMeta('theme-color', '#003153')
      }
    },
    nUpload(){
      this.upflists = this.$refs.efssfiles.files
    },
    size(fsize){
      if (fsize > 1024*1024) {
        return (fsize/(1024*1024)).toFixed(2) + ' M'
      } else if (fsize > 1024) {
        return (fsize/1024).toFixed(2) + ' K'
      } else {
        return fsize + ' B'
      }
    },
    eUpload(){
      let formData = new FormData()
      let toUlist = []
      if (this.upflists.length === 0) {
        this.$message.error('请先选择要上传的文件')
        return
      }
      for(let upfs of this.upflists){
        formData.append(upfs.name, upfs)
        toUlist.push([upfs.name, this.size(upfs.size)])
      }
      const hideloading = this.$message.loading('文件上传中...', 0)
      this.$axios.post('/sefss?subpath=' + encodeURI(this.postpath), formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }).then((res)=>{
        if (res.data.rescode === 0) {
          let clist = this.curtshow.list.map(cf=>cf.name)
          let ulist = toUlist.map(uf=>{
            let cind = clist.indexOf(uf[0])
            this.$set(this.curtshow.list, cind === -1 ? this.curtshow.list.length : cind, {
              type: 'file',
              name: uf[0],
              size: uf[1],
              mtime: this.$sTime()
            })
            return uf[0]
          })
          this.$message.success(ulist.join(','), '上传成功')
          this.$refs.efssfiles.value = ''
          console.debug(res.data, ulist.join(','),  '上传成功')
        } else {
          this.$message.error('上传失败', res.data.message || res.data)
          console.error('上传失败', res.data)
        }
      }).catch(e=>{
        this.$message.error('上传失败', e.message)
        console.error(e)
      }).finally(hideloading)
    },
    fileOpdelegate(event){
      switch (event.target.dataset.op) {
      case 'open':
        this.eOpen({
          type: event.target.dataset.type,
          name: event.target.dataset.name,
          size: event.target.dataset.size,
          index: Number(event.target.dataset.index)
        })
        break
      case 'del':
        this.eDel([event.target.dataset.name])
        break
      }
    },
    getPreviewList(type = 'image') {
      return this.showlist.filter(f=>{
        if (f.type === 'directory') {
          return false
        }
        const fmatch = f.name.match(/.+\.(\w+)/)
        if (!fmatch) {
          return false
        }
        const ext = fmatch[1].toLowerCase()
        return (type === 'image' && this.imageext.includes(ext)) || (type === 'media' && this.mediaext.includes(ext))
      }).map(f=>f.name)
    },
    eOpen(obj) {
      if (obj.type === 'directory') {
        this.subpath.push([obj.index, obj.name])
        this.fileMCheck('none')
      } else {
        const ext = /\./.test(obj.name) ? obj.name.split('.').pop().toLowerCase() : ''
        if (!ext || this.uopenext.indexOf(ext) !== -1) {
          this.$uApi.open('/efss' + this.postpath + '/' + obj.name)
          return
        }
        if (this.imageext.indexOf(ext) !== -1) {
          this.preview = {
            enable: true,
            type: 'image',
            name: obj.name,
            base: this.postpath,
            list: this.getPreviewList('image'),
          }
        } else if (this.mediaext.indexOf(ext) !== -1) {
          this.preview = {
            enable: true,
            type: 'media',
            name: obj.name,
            base: this.postpath,
            list: this.getPreviewList('media'),
          }
        } else if (/(M|G)$/.test(obj.size)) {
          this.$uApi.open('/efss' + this.postpath + '/' + obj.name)
        } else {
          this.fileedit.burl = location.origin + '/efss' + this.postpath + '/'
          this.fileedit.name = obj.name
          this.fileedit.path = this.fullpath
          this.fileedit.start = 'url'
        }
      }
    },
    eZip(filelist, targetfolder, name) {
      let zfidx = this.curtshow.list.findIndex(f=>f.name===name)
      if (zfidx !== -1 && !confirm(name + ' 已存在，是否继续？（将会覆盖原文件')) {
        return
      }
      const hideloading = this.$message.loading(name, '压缩文件生成中...', 0)
      this.$axios.post('/rpc', {
        method: 'zip',
        params: [filelist, targetfolder + '/' + name]
      }).then((res)=>{
        if (res.data.rescode === 0) {
          this.$message.success('成功生成压缩文件', name, res.data.message)
          if (zfidx !== -1) {
            this.curtshow.list[zfidx].mtime = this.$sTime()
          } else {
            this.curtshow.list.push({
              type: 'file',
              name, mtime: this.$sTime()
            })
          }
          console.debug(res.data)
        } else {
          this.$message.error(name, '打包失败', res.data.message || res.data)
          console.error(res.data)
        }
      }).catch(e=>{
        this.$message.error(name, '打包失败', e.message)
        console.error(e)
      }).finally(hideloading)
    },
    eUnZip(targetfolder, zipfile) {
      let unzipfolder = this.$uStr.surlName(zipfile).replace(/\.zip$/i, '')
      let zfidx = this.curtshow.list.findIndex(f=>f.name===unzipfolder)
      if (zfidx !== -1 && !confirm(unzipfolder + ' 文件夹已存在，是否继续？（将会覆盖原文件')) {
        return
      }
      const hideloading = this.$message.loading(zipfile, '解压中...', 0)
      this.$axios.post('/rpc', {
        method: 'unzip',
        params: [targetfolder + '/' + zipfile, targetfolder + '/' + unzipfolder]
      }).then((res)=>{
        if (res.data.rescode === 0) {
          this.$message.success('成功解压文件', zipfile)
          if (zfidx !== -1) {
            this.curtshow.list[zfidx] = res.data.reslist
          } else {
            this.curtshow.list.push(res.data.reslist)
          }
          console.debug(res.data)
        } else {
          this.$message.error(zipfile, '解压失败', res.data.message || res.data)
          console.error(res.data)
        }
      }).catch(e=>{
        this.$message.error(zipfile, '解压失败', e.message)
        console.error(e)
      }).finally(hideloading)
    },
    eMenu(event) {
      let fobj = {}
      if (event.target.dataset.type && event.target.dataset.name) {
        fobj.type = event.target.dataset.type
        fobj.size = event.target.dataset.size
        fobj.name = event.target.dataset.name
        fobj.index = Number(event.target.dataset.index)
      } else if (event.target.dataset.op === 'mkdir') {
        return this.eMenuMkdir(event)
      } else {
        return
      }
      let path = this.fullpath
      let burl = location.origin + '/efss' + this.postpath + '/'
      let eOpe = this.eOpen, eDel = this.eDel, eZip = this.eZip, eUnZip = this.eUnZip
      let eMsg = this.$message, axios = this.$axios, copy = this.$uApi.copy
      let uOpen = this.$uApi.open
      let fileop = this.fileop, fileedit = this.fileedit
      let renameFile = this.renameFile
      let menuitems = []
      if (fobj.type === 'directory') {
        menuitems.push({
          label: '重命名',
          click(){
            renameFile(fobj.name, fobj.index)
          }
        }, {
          label: 'zip 压缩打包',
          click(){
            eZip([path + '/' + fobj.name], path, fobj.name + '.zip')
          }
        }, {
          label: '打开该文件夹',
          click(){
            eOpe(fobj)
          }
        }, {
          label: '删除该文件夹',
          bkcolor: 'var(--note-bk)',
          click(){
            eDel([fobj.name])
          }
        })
      } else {
        if (fileop.name && fileop.folder && fileop.operate) {
          let operateFiles = this.operateFiles
          menuitems.push({
            label: '粘贴',
            click(){
              operateFiles()
            }
          })
        }
        menuitems.push({
          label: '复制',
          click(){
            fileop.name = fobj.name
            fileop.folder = path
            fileop.operate = 'copy'
            copy(path + '/' + fobj.name)
            eMsg.success(fobj.name, '文件地址已复制\n请选择目标文件夹后进行粘贴')
          }
        }, {
          label: '剪切',
          click(){
            fileop.name = fobj.name
            fileop.folder = path
            fileop.operate = 'move'
            copy(path + '/' + fobj.name)
            eMsg.success(fobj.name, '文件地址已获取\n请选择目标文件夹后进行粘贴')
          }
        }, {
          label: '编辑',
          click(){
            if (/(M|G)$/.test(fobj.size)) {
              eMsg.error('当前文件过大，暂时无法处理')
              return
            }
            fileedit.burl = burl
            fileedit.name = fobj.name
            fileedit.path = path
            fileedit.start = 'url'
          }
        }, {
          label: '重命名',
          click(){
            renameFile(fobj.name, fobj.index)
          }
        })
        if (/\.zip$/.test(fobj.name)) {
          menuitems.push({
            label: '解压此文件',
            click(){
              eUnZip(path, fobj.name)
            }
          })
        } else if (fobj.name.indexOf('.') === -1 || /\.(js|json|py|sh)$/.test(fobj.name)) {
          menuitems.push({
            label: '使用 PM2 运行',
            click(){
              const hideloading = eMsg.loading('命令执行中...', 0)
              axios.post('/rpc', {
                method: 'pm2run',
                params: [fobj.name, {
                  cwd: path
                }]
              }).then((res)=>{
                if (res.data.rescode === 0) {
                  eMsg.success(fobj.name, '已运行', res.data.message, { align: 'left' })
                  console.debug(res.data)
                } else {
                  eMsg.error(fobj.name, '运行失败', res.data.message || res.data)
                  console.error(res.data)
                }
              }).catch(e=>{
                eMsg.error(fobj.name, '运行失败', e.message)
                console.error(e)
              }).finally(hideloading)
            }
          })
        }
        menuitems.push({
          label: '获取文件链接',
          click(){
            eMsg.success(burl + fobj.name)
            copy(burl + fobj.name)
          }
        }, {
          label: '新标签页打开',
          bkcolor: 'var(--icon-bk)',
          click(){
            uOpen(burl + fobj.name)
          }
        }, {
          label: '删除该文件',
          bkcolor: 'var(--note-bk)',
          click(){
            eDel([fobj.name])
          }
        })
      }
      this.menu = {
        pos: this.$uApi.getCursorPos(event, 160, 32 * menuitems.length),
        list: menuitems
      }
    },
    eMenuMkdir(event){
      let axios = this.$axios, eMsg = this.$message, fileedit = this.fileedit,
          path = this.fullpath,
          curtshowlist = this.curtshow.list, mtime = this.$sTime()
      let baseurl = location.origin + '/efss' + this.postpath + '/'
      let menuitems = []
      if (this.fileop.name && this.fileop.folder && this.fileop.operate) {
        let operateFiles = this.operateFiles
        menuitems.push({
          label: '粘贴到此文件夹',
          fontsize: '17px',
          click(){
            operateFiles()
          }
        })
      }
      menuitems.push({
        label: '新建文本文件',
        height: '38px',
        fontsize: '20px',
        click(){
          let name = prompt('新建文本文件名：', '新建文本文件.txt')
          if (name) {
            if (/\\|\/|\?|\||<|>|:|\*/.test(name)) {
              eMsg.error(name, '包含特殊字符，请修改后重试')
              return
            }
            let zfidx = curtshowlist.findIndex(f=>f.name===name)
            if (zfidx !== -1) {
              eMsg.error(name, '已存在，请使用其他文件名')
              return
            }
            fileedit.name = name
            fileedit.path = path
            fileedit.burl = baseurl
            fileedit.start = 'new'

            curtshowlist.push({
              type: 'file',
              size: '0 B',
              name, mtime
            })
          }
        }
      }, {
        label: '新建文件夹',
        height: '38px',
        fontsize: '20px',
        color: 'var(--main-bk)',
        bkcolor: 'var(--folder-bk)',
        click(){
          let folder = prompt('文件夹名称', '我的文件夹')
          if (folder) {
            if (/\\|\/|\?|\||<|>|:|\*/.test(folder)) {
              eMsg.error(folder, '包含特殊字符，请修改后重试')
              return
            }
            let zfidx = curtshowlist.findIndex(f=>f.name===folder)
            if (zfidx !== -1) {
              eMsg.error(folder, '已存在，请使用其他文件名')
              return
            }
            const hideloading = eMsg.loading('准备新建文件夹...', 0)
            axios.post('/rpc', {
              method: 'mkdir',
              params: [path + '/' + folder]
            }).then((res)=>{
              if (res.data.rescode === 0) {
                eMsg.success('成功创建文件夹', folder, res.data.message)
                curtshowlist.push({
                  type: 'directory',
                  name: folder,
                  list: [],
                  mtime
                })
                console.debug(res.data)
              } else {
                eMsg.error(res.data.message || res.data)
                console.error(res.data)
              }
            }).catch(e=>{
              eMsg.error(folder, '文件夹新建失败', e.message)
              console.error(e)
            }).finally(hideloading)
          }
        }
      })
      this.menu = {
        pos: this.$uApi.getCursorPos(event, 160, 32 * menuitems.length),
        list: menuitems
      }
    },
    eDel(files){
      if (this.$sType(files) === 'string') {
        files = [ files ]
      }
      if (confirm(`确定删除 ${ files.join(', ') }？(不可恢复)`)) {
        const hideloading = this.$message.loading('正在删除', files.join(', '), '...', 0)
        this.$axios.delete('/sefss', {
          data: {
            path: this.postpath,
            files
          }
        }).then((res)=>{
          if (res.data && res.data.rescode === 0) {
            this.$message.success('操作完成', res.data.message)
            files.forEach(fn=>this.eRemove(fn))
            this.fileMCheck('none')
          } else {
            this.$message.error(files, '删除失败:', res.data.message)
          }
        }).catch(e=>{
          this.$message.error(files, '删除失败', e.message)
          console.error(e)
        }).finally(hideloading)
      }
    },
    eRemove(fn = '') {
      this.curtshow.list.splice(this.curtshow.list.findIndex(cf=>cf.name===fn), 1)
    },
    subGo(event) {
      if (event.target.dataset.index) {
        this.subpath.splice(Number(event.target.dataset.index) + 1)
        this.fileMCheck('none')
      }
    },
    efssSave(){
      if (this.esconfig.enable) {
        if (this.esconfig.directory === '') {
          this.$message.error('请填写目录地址')
          return
        }
      } else if (!confirm('确定关闭 EFSS？')) {
        return
      }
      const hideloading = this.$message.loading('EFSS 目录更新中...', 0)
      this.$axios.put("/config", { type: 'efss', data: this.esconfig }).then((res) => {
        console.debug(res.data)
        if (res.data.rescode === 0) {
          this.subpath.splice(0)
          this.$message.success(res.data.message)
          this.eInit()
        } else if (res.data.rescode === 404) {
          this.$message.error('目录:', this.esconfig.directory, '并不存在，请设置其他目录')
        } else {
          this.$message.error('EFSS 设置失败，未知错误')
        }
      }).catch(e=>{
        this.$message.error('EFSS 设置失败', e.message)
        console.error(e)
      }).finally(hideloading)
    },
    editFile(){
      this.fileedit.name = this.filecheck[0]
      this.fileedit.burl = location.origin + '/efss' + this.postpath + '/'
      this.fileedit.path = this.fullpath
      this.fileedit.start = 'url'
    },
    renameFile(oldname = '', oldidx = -1) {
      if (!oldname) {
        oldname = this.filecheck[0]
      }
      let newname = prompt('请输入新的文件名', oldname)
      while (newname && /\\|\/|\?|\||<|>|:|\*/.test(newname)) {
        newname = prompt('文件名中保存特殊字符，请重新输入', newname)
      }
      if (!newname) {
        return
      }
      let zfidx = this.curtshow.list.findIndex(f=>f.name===newname)
      if (zfidx !== -1 && !confirm(newname + ' 已存在，是否继续？（将会覆盖原文件')) {
        return
      }
      if (oldidx === -1) {
        oldidx = this.curtshow.list.findIndex(f=>f.name===oldname)
      }
      const hideloading = this.$message.loading(oldname, '重命名中...', 0)
      this.$axios.post('/rpc', {
        method: 'rename',
        params: [this.fullpath + '/' + oldname, this.fullpath + '/' + newname],
      }).then((res)=>{
        if (res.data.rescode === 0) {
          this.$message.success(`成功重命名为 ${newname} ${res.data.message}`)
          this.curtshow.list[oldidx].name = newname
          if (zfidx !== -1) {
            this.curtshow.list.splice(zfidx, 1)
          }
          this.fileMCheck('none')
          console.debug(res.data)
        } else {
          this.$message.error(`重命名失败 ${res.data.message}`)
          console.error(res.data)
        }
      }).catch(e=>{
        this.$message.error(`重命名失败 ${e.message}`)
        console.error(e)
      }).finally(hideloading)
    },
    operateFiles(){
      if (!(this.fileop.name && this.fileop.folder && this.fileop.operate)) {
        this.$message.error('无法对空对象进行操作')
        return
      }
      if (this.fileop.folder === this.fullpath) {
        this.$message.error('无法在和复制/剪切相同的目录下进行粘贴操作')
        return
      }
      if (this.$sType(this.fileop.name) === 'string') {
        this.fileop.name = [ this.fileop.name ]
      }
      let operation = this.fileop.operate
      const hideloading = this.$message.loading(this.fileop.name.join(', '), operation, '中...', 0)
      this.$axios.post('/rpc', {
        method: this.fileop.operate,
        params: [this.fileop.name, this.fileop.folder, this.fullpath],  // [name, from, to]
      }).then((res)=>{
        if (res.data.rescode === 0) {
          this.$message.success(`${this.fileop.name.join(', ')} ${operation}成功\n${res.data.message}`)
          let mtime = this.$sTime()
          this.curtshow.list.push(...this.fileop.name.map(name=>({
            type: 'file', name, mtime
          })))
          console.debug(res.data)
          this.fileop.name = ''
          this.fileop.folder = ''
          this.fileop.operate = ''
        } else {
          this.$message.error(`${this.fileop.name.join(', ')} ${operation} 失败\n${res.data.message || res.data}`)
          console.error(res.data)
        }
      }).catch(e=>{
        this.$message.error(`${this.fileop.name.join(', ')} ${operation} 失败\n${e.message}`)
        console.error(e)
      }).finally(hideloading)
    },
    copyFiles(){
      console.debug(this.filecheck, 'ready to copy')
      this.fileop.name = [...this.filecheck]
      this.fileop.folder = this.fullpath
      this.fileop.operate = 'copy'
      this.$message.success('已获取', this.fileop.name.join(', '), '文件地址\n请选择目标文件夹后进行粘贴')
    },
    moveFiles(){
      console.debug(this.filecheck, 'ready to move')
      this.fileop.name = [...this.filecheck]
      this.fileop.folder = this.fullpath
      this.fileop.operate = 'move'
      this.$message.success('已获取', this.fileop.name.join(', '), '文件地址\n请选择目标文件夹后进行粘贴')
    },
    deltFiles(){
      this.eDel([...this.filecheck])
    },
    zipFiles(){
      this.eZip(this.filecheck.map(f=>this.fullpath + '/' + f), this.fullpath, this.$uStr.surlName(this.fullpath) + '.zip')
      this.fileMCheck('none')
    },
    unzipFile(){
      if (this.isSingleCheck) {
        this.eUnZip(this.fullpath, this.filecheck[0])
        this.fileMCheck('none')
      } else {
        this.$message.error('请选择单个 zip 文件进行解压')
      }
    },
    fileDownload(){
      if (!this.filedownloadurl || /^https?:\/\/\S{4}/.test(this.filedownloadurl) === false) {
        this.$message.error("该远程文件链接有误", this.filedownloadurl);
        return;
      }
      let ren = this.filedownloadurl.match(/ -rename(=| )([^\- ]+)/), filename = '', downloadurl = '';
      if (ren && ren[2]) {
        filename = ren[2].replace(/^(\\|\/)+/, '');
        downloadurl = this.filedownloadurl.split(' ')[0];
      } else {
        filename = this.$uStr.surlName(this.filedownloadurl);
        downloadurl = this.filedownloadurl;
      }
      let zfidx = this.curtshow.list.findIndex(f=>f.name===filename);
      if (zfidx !== -1 && !confirm(filename + ' 已存在，是否继续？（将会覆盖原文件')) {
        return;
      }
      if (!sseWeb.connections.has('efss')) {
        sseWeb.Recv('efss', data=>{
          if (data.type === 'message') {
            const { progress, mid } = data.data;
            this.$message.success(progress, { mid });
          }
        });
      }
      const hideloading = this.$message.loading(`${filename} 下载中...`, 0);
      this.$axios.post('/rpc', {
        method: 'download',
        params: [downloadurl, this.fullpath, filename], // [url, folder, name]
      }).then(res=>{
        if (res.data.rescode === 0) {
          this.$message.success(filename, '下载成功');
          if (zfidx === -1) {
            this.curtshow.list.push({
              type: 'file',
              name: this.$uStr.surlName(res.data.resdata) || filename,
              mtime: this.$sTime()
            });
          } else {
            this.curtshow.list[zfidx].mtime = this.$sTime();
          }
        } else if (res.data.rescode === 1) {
          this.$message.success(res.data.resdata || filename, '下载任务已存在，请尝试其他链接或目录/文件名');
        } else {
          this.$message.error(filename, '下载失败', res.data.message);
        }
        console.debug(res.data);
      }).catch(e=>{
        this.$message.error('下载失败', e.message);
        console.error(downloadurl, '下载失败', e);
      }).finally(hideloading)
    },
    fileMCheck(type = 'none') {
      switch(type){
      case 'all':
        this.filecheck = this.showlist.map(f=>f.name)
        break
      case 'none':
      default:
        if (this.filecheck.length) {
          this.filecheck.splice(0)
        }
      }
    },
  }
}
</script>

<style scoped>
#app {
  display: block;
  padding: 6px 12px;
  min-height: 100vh;
  box-sizing: border-box;
}

.efssset_container {
  background: var(--main-bk);
  border-radius: var(--radius-bs);
}

.efssset {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  padding: 3px 0;
  border-radius: var(--radius-bs) var(--radius-bs) 0 0;
  font-size: 20px;
  text-align: center;
  border-bottom: 2px solid var(--main-fc);
  background: var(--main-bk);
  color: var(--main-cl);
}

.efssset--collapsed {
  height: 42px;
  overflow: hidden;
}

.efssset--collapsed > .efssset_item, .efssset--collapsed > .efss_btn {
  display: none;
}

.efssset_title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
  margin: 0;
  padding: 0 8px;
  text-align: center;
  border-bottom: 1px solid;
  font-size: 24px;
  color: var(--main-fc);
}

.efssset_titlea {
  min-width: 1em;
  min-height: 1em;
  text-decoration: none;
  color: var(--main-fc);
}

.efssset_titlea--main {
  font-size: 24px;
  cursor: help;
}

.efssset_item {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  margin: 6px 0;
}

.efssset_label {
  margin: 5px 8px;
}

.efssset_input {
  width: 480px;
  max-width: 100%;
  padding: 8px;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  text-align: center;
  color: var(--main-cl);
}

.efssset_input--number {
  width: 108px;
}

.efssupload {
  display: flex;
  flex-wrap: wrap;
  box-sizing: border-box;
  padding: 3px 6px;
  justify-content: space-around;
  border-top: 1px solid var(--main-fc);
  background: var(--main-bk);
}

.eupload_file:before {
  content: '选择本地文件';
}

.efss_btn {
  width: 480px;
  height: 40px;
  max-width: 100%;
  padding: 6px;
  margin: 6px 0;
  border: none;
  border-radius: 8px;
  font-size: 22px;
  letter-spacing: 2px;
  cursor: pointer;
  color: var(--main-fc);
  background: var(--secd-bk);
}
.efsslist_content {
  border: 1px solid var(--main-bk);
  border-radius: 0 0 var(--radius-bs) var(--radius-bs);
}
.efssa {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  padding: 6px 8px;
  font-size: 18px;
  text-decoration: none;
  background: var(--main-fc);
  color: var(--main-bk);
  border-bottom: 1px solid var(--main-bk);
}

.efssa:last-child {
  border-bottom: none;
  border-radius: 0 0 var(--radius-bs) var(--radius-bs);
}

.efssa:hover{
  opacity:.6;
}

.efssa_check {
  display: inline-flex;
}

.efssa_check .echeckbox {
  margin: 0 6px 0 0;
}

.efssa_name {
  width: 60%;
  flex-grow: 1;
  word-break: break-word;
  cursor: pointer;
}

.efssa_mtime {
  width: 36%;
  min-width: 100px;
  font-size: 14px;
  word-break: break-word;
  text-align: center;
}

.efssa_last {
  display: inline-flex;
  align-items: center;
}

.efssa_span{
  display: inline-block;
  font-size: 14px;
  width: 72px;
  line-height: 24px;
  text-align: right;
  word-break: break-word;
}

.efssa_delete {
  display: inline-block;
  width: 48px;
  text-align: center;
  opacity: .06;
  cursor: pointer;
}

.efssa_delete:hover{
  opacity:1;
}

.efsslist {
  margin-top: .6em;
  border-radius: var(--radius-bs);
}

.efsslist_header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  height: 32px;
  width: 100%;
  padding: 0 8px;
  font-size: 20px;
  border-radius: var(--radius-bs) var(--radius-bs) 0 0;
  background: var(--main-bk);
  color: var(--main-fc);
}

.efsslist_op {
  display: none;
  position: fixed;
  z-index: 2;
  top: 0;
  left: 0px;
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  flex-wrap: wrap;
  box-sizing: border-box;
  padding: 0 12px;
  background: var(--main-cl);
}

.efsslist_op--show {
  display: inline-flex;
}

.efsslist_sync {
  display: inline-flex;
  align-items: center;
  font-size: 22px;
  cursor: pointer;
  margin-right: 8px;
}

.efsslist_folder {
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  align-content: center;
  height: 100%;
  width: 100%;
  white-space: pre;
  text-overflow: ellipsis;
  user-select: none;
}

.efsslist_item {
  display: inline-flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  align-content: center;
  cursor: pointer;
}

.efsslist_item:first-child {
  cursor: default;
  border-left: 2px solid;
  border-right: 2px solid;
  margin-right: .5em;
  padding-left: .8em;
}

.efsslist_item::after {
  content: ">";
  margin-left: 4px;
  cursor: default;
}

.efsslist_item:last-child::after, .efsslist_item:first-child::after {
  content: "";
}

.efssa--directory::before {
  content: "📁";
  display: inline-flex;
  margin-right: 3px;
}
.efss_menu {
  padding: 0 .3em;
  margin: 0 .2em;
  cursor: pointer;
}

@media screen and (max-width: 600px) {
  #app {
    padding: 8px 0;
  }
  .efssa_mtime {
    display: none;
  }
  .efsslist_sync, .efsslist_header {
    font-size: 24px;
  }
}
</style>