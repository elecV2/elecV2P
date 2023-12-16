<template>
  <div class="codeditor" :class="{ 'codeditor--collapsed': collapse, 'codeditor--full': fullscreen }" v-show="bShow" @keydown.122.prevent.stop.exact="fullscreen=!fullscreen"
    :style="'transform: translate(' + tranposi[0] + 'px, ' + tranposi[1] + 'px);'"
    :draggable="collapse"
    @dragstart="dragStart($event)"
    @dragend="dragEnd($event)"
  >
    <h3 class="title title--editview">
      <span class="title_close" @click.prevent="bShow=false" title="alt+w">X</span>
      <span class="title_main" title="按 F2 或双击可修改文件名（原文件将保留）" @dblclick.prevent="nameChange()">{{ curtfile.path }}/{{ curtfile.name }}</span>
      <span class="title_collapse" :class="{ 'title_collapse--collapsed': collapse }" @click.prevent="tranposi=[0, 0];collapse=!collapse;"></span>
    </h3>
    <div class="codeditor_toolbar">
      <ul class="codeditor_menu eflex">
        <li class="toolbar_item">
          <label>自动换行</label>
          <input class="echeckbox" checked type="checkbox" name="autoWrap" @change="autoWrap($event)">
        </li>
        <li class="toolbar_item">
          <label>行线显示</label>
          <input class="echeckbox" checked type="checkbox" name="offUnder" @change="offUnder($event)">
        </li>
        <li class="toolbar_separate"></li>
        <li class="toolbar_item">
          <label>显示不可见字符</label>
          <input class="echeckbox" checked type="checkbox" name="showInvi" @change="showInvi($event)">
        </li>
        <li class="toolbar_item">
          <label>Tab 宽度</label>
          <select class="elecTable_select toolbar_select" @change="tabResize($event)">
            <option value="4">4 个空格</option>
            <option value="2">2 个空格</option>
          </select>
        </li>
        <li class="toolbar_item">
          <label>使用空格代替 Tab</label>
          <input class="echeckbox" checked type="checkbox" name="softTabs" @change="softTabs($event)">
        </li>
        <li class="toolbar_separate"></li>
        <li class="toolbar_item">
          <label>只读模式</label>
          <input class="echeckbox" type="checkbox" name="readOnly" @change="readOnly($event)">
        </li>
        <li v-if="curtfile.mode==='hex'" title="尝试将当前内容转化为文本">
          <button class="elecBtn elecBtn--h32 emargin bk_main_cl" @click="hexstrToggle()">文本模式</button>
        </li>
        <li class="toolbar_item" title="在新标签页中查看该文件">
          <button class="elecBtn elecBtn--h32 emargin bk_main_cl" @click="fileView()">查看源文件</button>
        </li>
        <li class="toolbar_item">
          <button class="elecBtn elecBtn--h32 emargin bk_main_cl" @click="moreSet()">更多设置</button>
        </li>
        <li class="toolbar_item toolbar_item--mergebtn" title="仅在 https 环境下有效">
          <span class="toolbar_mergebtn" @click="editor.selectAll()">全选</span>
          <span class="toolbar_copy" @click="copySelection()">复制</span>
          <span class="toolbar_mergebtn" @click="pasteSelection()">粘贴</span>
        </li>
      </ul>
    </div>
    <div id="aceditor" @keydown.ctrl.83.prevent.stop.exact="save()" @keyup.113.prevent.stop.exact="nameChange()" @keydown.alt.enter.prevent.stop.exact="fileView()" @keydown.alt.87.prevent.stop.exact="bShow=false">elecV2P editor</div>
    <div class="codeditor_button center">
      <button class="elecBtn" @click.prevent="save()">保存（Ctrl+S）</button>
      <ul class="codeditor_tip" v-show="tipshow" @click.prevent="tipshow=!tipshow">
        <li>f2: 重命名文件 f11: 全屏</li>
        <li>alt+enter: 新标签页中查看该文件</li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'editor',
  props: ['file'],
  data() {
    return {
      curtfile: {
        burl: '',
        name: '',
        path: '',
        mode: 'string'
      },
      bShow: false,
      editor: null,
      modelist: null,
      collapse: false,
      tipshow: true,
      fullscreen: false,
      tranposi: [0, 0],
      dragposi: [0, 0],
    }
  },
  mounted(){
    window.onload = () =>{
    if (ace) {
      this.editor = ace.edit("aceditor", {
        wrap: true,
        fontSize: 20,
        showInvisibles: true,
        indentedSoftWrap: false,
      })
      this.modelist = ace.require("ace/ext/modelist")
      // 最小/大化时，line 重新计算（待优化
      document.querySelector('.codeditor').addEventListener('transitionend', ()=>{
        this.editor.resize()
      })
      // window.test = this.editor
      // this.editor.setTheme('ace/theme/monokai')
      // this.editor.getSession().setMode("ace/mode/javascript")
    } else {
      this.$message.error('ace editor not ready yet')
    }
    }
  },
  watch: {
    'file.start': function(val) {
      if (val) {
        this.fileOpen().catch(e=>{
          this.$message.error('编辑文件', this.file.name, `失败 ${e.message}\n文件已在新标签页打开`)
          this.$uApi.open(this.file.burl + this.file.name)
          console.error('编辑文件', this.file.name, '失败', e)
        })
        this.file.start = false
      }
    }
  },
  methods: {
    nameChange(){
      let newname = prompt('新的文件名（不包含路径）', this.curtfile.name)
      if (newname) {
        if (/\\|\/|\?|\||<|>|:|\*/.test(newname)) {
          this.$message.error('文件名中保存特殊字符，请修改后重试')
          return
        }
        this.curtfile.name = newname
        this.$message.success('文件名修改成功')
        this.editor.focus()
      }
    },
    async fileOpen() {
      if (!this.editor) {
        this.$message.error('编辑器暂时不可用，请稍等...，或尝试刷新页面')
        return
      }
      if (!this.file.name || !this.file.path) {
        this.$message.error('没有获取到可编辑的文件信息')
        return
      }
      let name = this.file.name, burl = this.file.burl, content = ''
      let mobj = this.modelist.getModeForPath(name), ext = mobj.name, mode = mobj.mode
      let badext = ext === 'text' && !/\.txt$/.test(name)
      if (badext) {
        if (!confirm(name + ' 可能并不是文本文件\n点击确定-使用文本编辑器打开\n点击取消-在新标签页面中打开')) {
          this.$uApi.open(this.file.burl + this.file.name)
          return
        }
      }
      if (this.file.start === 'url') {
        if (!/^https?:\/\/\S{4}/.test(burl)) {
          this.$message.error('远程链接错误，无法获取文件内容', burl + name)
          return
        }
        let loading = this.$message.loading('正在加载', name, '文件内容...', 0)
        try {
          content = await this.$axios.get(burl + name, {
            responseType: 'arraybuffer',
          }).then(res=>{
            if (badext) {
              this.curtfile.mode = 'hex'
              return this.$uStr.bufferToHex(res.data)
            } else {
              this.curtfile.mode = 'string'
              return new TextDecoder().decode(res.data)
            }
          })
          loading()
          this.curtfile.burl = burl
          this.$message.success(name, '文件内容加载成功')
        } catch(e) {
          loading()
          this.$message.error('无法加载', name, '文件内容', e.message)
          console.error('无法加载', name, '文件内容', e)
          return
        }
      } else if (this.file.start === 'new') {
        this.$message.success('新建文件', name)
        this.curtfile.burl = this.file.burl
        content = this.file.content || `欢迎使用 elecV2P 文本文件编辑器\n\nctrl+a 全选\nctrl+s保存`
      } else {
        this.$message.error('未知指令', this.file.start, '无法打开文本编辑器')
        return
      }
      this.editor.session.setMode(mode)
      console.debug('elecV2P editor current mode', ext)
      if (this.$sType(content) !== 'string') {
        this.$message.error('获取文件内容并非文本格式，已强制进行转换')
        content = this.$sString(content)
      }
      this.bShow = true
      this.tranposi = [0, 0]
      this.collapse = false
      this.curtfile.path = this.file.path
      this.curtfile.name = name
      this.editor.session.setValue(content)
      this.editor.focus()
    },
    fileView(){
      if (/^https?:\/\/\S{4}/.test(this.curtfile.burl)) {
        this.$uApi.open(this.curtfile.burl + this.curtfile.name)
      } else {
        this.$message.error('暂时无法获取该文件的远程查看链接')
      }
    },
    autoWrap(event){
      this.editor.session.setUseWrapMode(event.target.checked)
      this.editor.focus()
    },
    offUnder(event){
      if (event.target.checked) {
        document.querySelector('.ace_content').classList.remove('underoff')
      } else {
        document.querySelector('.ace_content').classList.add('underoff')
      }
      this.editor.focus()
    },
    readOnly(event){
      this.editor.setReadOnly(event.target.checked)
      this.editor.focus()
    },
    tabResize(event){
      this.editor.session.setTabSize(Number(event.target.value))
      this.editor.focus()
    },
    softTabs(event){
      this.editor.session.setUseSoftTabs(event.target.checked)
      this.editor.focus()
    },
    showInvi(event){
      this.editor.setShowInvisibles(event.target.checked)
      this.editor.focus()
    },
    hexstrToggle(){
      if (this.curtfile.mode === 'hex') {
        const hideloading = this.$message.loading('正在尝试将当前内容转化为文本')
        let fcont = this.editor.getValue()
        fcont = new TextDecoder().decode(this.$uStr.hexToBuffer(fcont))
        this.editor.session.setValue(fcont)
        hideloading()
        this.$message.success('转化完成')
        this.curtfile.mode = 'string'
      } else {
        console.log('当前编辑器内容已经是文本格式')
      }
    },
    moreSet(){
      this.editor.execCommand('showSettingsMenu')
      this.tipshow = !this.tipshow
    },
    dragStart(e){
      e.dataTransfer.effectAllowed = 'move'
      this.dragposi = [e.clientX, e.clientY]
    },
    dragEnd(e){
      e.preventDefault()
      this.tranposi = [this.tranposi[0] + e.clientX - this.dragposi[0], this.tranposi[1] + e.clientY - this.dragposi[1]]
    },
    copySelection(){
      if (!navigator.clipboard) {
        this.$message.error('粘贴板仅在 https 页面中可访问')
        return
      }
      let copyText = this.editor.getCopyText()
      if (copyText === '') {
        this.$message.error('请先选择文字')
        return
      }
      navigator.clipboard.writeText(copyText).then(()=>{
        this.$message.success('复制成功')
      }).catch(e=>{
        this.$message.error('复制失败', e.message)
        console.error('复制选择文字失败', e)
      })
    },
    pasteSelection(){
      if (!navigator.clipboard) {
        this.$message.error('粘贴板仅在 https 页面中可访问')
        return
      }
      navigator.clipboard.readText().then(data=>{
        if (data) {
          this.editor.insert('')  // 替换选择内容
          this.editor.session.insert(this.editor.getCursorPosition(), data)
          this.$message.success('粘贴成功')
        } else {
          this.$message.error('没有检测到文字内容')
          console.log('没有检测到文字内容')
        }
      }).catch(e=>{
        this.$message.error('粘贴失败', e.message)
        console.error('粘贴失败', e)
      })
    },
    save(){
      const hideloading = this.$message.loading(this.curtfile.name, '上传保存中...', 0)
      let fcont = this.editor.getValue()
      if (this.curtfile.mode === 'hex') {
        fcont = Array.from(this.$uStr.hexToBuffer(fcont))
      }
      this.$axios.post('/rpc', {
        v: 103,
        method: 'save',
        params: [this.curtfile.path + '/' + this.curtfile.name, fcont, this.curtfile.mode]
      }).then(res=>{
        if (res.data.rescode === 0) {
          this.$message.success(this.curtfile.name, '保存成功')
        } else {
          this.$message.error(this.curtfile.name, '保存失败', res.data.message)
          console.error(this.curtfile.name, '保存失败', res.data.message)
        }
      }).catch(e=>{
        this.$message.error(this.curtfile.name, '保存失败', e.message)
        console.error(this.curtfile.name, '保存失败', e)
      }).finally(hideloading)
    }
  }
}
</script>

<style type="text/css">
/* ace editor 通用样式 */
#aceditor {
  width: 100%;
  height: 100%;
  line-height: 26px;
  border: 6px solid var(--main-bk);
  border-top: none;
  border-radius: 0 0 8px 8px;
  font-size: 20px;
  box-sizing: border-box;
}

.ace_content {
  background-image: -webkit-linear-gradient(left, white 8px, transparent 8px), -webkit-linear-gradient(right, white 8px, transparent 8px), -webkit-linear-gradient(white 25px, #ccc 25px, #ccc 26px, white 26px);
  background-size: 100% 100%, 100% 100%, 100% 26px;
}

.ace_content.underoff {
  background-image: none;
}

@media screen and (max-width: 720px) {
  .ace_editor > .ace_gutter, .ace_gutter > .ace_gutter-layer {
    max-width: 36px;
  }

  .ace_gutter-layer > .ace_gutter-cell {
    padding-left: 0px;
    padding-right: 2px;
  }
}
</style>

<style scoped>
.codeditor {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  z-index: 9;
  background: var(--main-fc);
  transition-property: width,height;
  transition-duration: .2s;
}

.codeditor--collapsed {
  height: 36px;
  width: 360px;
  overflow: hidden;
  border-radius: 8px;
}
.codeditor--collapsed .title_main {
  white-space: pre;
  text-overflow: ellipsis;
  overflow: hidden;
  direction: rtl;
  cursor: move;
  user-select: none;
}
.codeditor--collapsed .codeditor_button, .codeditor--collapsed #aceditor, .codeditor--collapsed .codeditor_toolbar,
.codeditor--full .codeditor_toolbar, .codeditor--full .codeditor_button {
  display: none;
}

.codeditor_toolbar {
  border: 6px solid var(--main-bk);
  border-bottom: 1px solid var(--tras-bk);
  border-top: none;
  background: var(--main-fc);
  color: var(--main-bk);
}

.codeditor_menu {
  width: 100%;
  flex-wrap: wrap;
  justify-content: center;
}

.toolbar_item {
  display: inline-flex;
  align-content: center;
  justify-content: space-around;
  align-items: center;
  box-sizing: border-box;
  margin: 0 12px;
  font-weight: 600;
}

.toolbar_item--mergebtn {
  display: none;
  height: 32px;
  margin: 3px 12px;
  padding: .5em .6em;
  border-radius: 8px;
  font-size: 18px;
  background: var(--main-bk);
  color: var(--main-fc);
  cursor: pointer;
}

.toolbar_copy {
  border-right: 1px solid;
  border-left: 1px solid;
  margin: 0 0.6em;
  padding: 0 0.6em;
}

.toolbar_separate {
  display: inline-block;
  width: 1px;
  height: 40px;
  margin: 0 10px;
  background: var(--main-bk);
}

.toolbar_select {
  width: 80px;
  height: 32px;
  border: 1px solid var(--tras-bk);
  font-size: 18px;
  margin-left: 8px;
}

.codeditor_tip {
  position: fixed;
  right: 1em;
  bottom: 3px;
  display: inline-block;
  width: 280px;
  text-align: right;
  cursor: pointer;
}

.codeditor_button {
  position: fixed;
  bottom: 1em;
  z-index: 8;
  width: 100%;
  max-width: 100%;
}

@media screen and (max-width: 720px) {
  .codeditor_toolbar {
    height: 48px;
    overflow-y: auto;
  }
}

@media screen and (max-width: 1220px) {
  .toolbar_item--mergebtn {
    display: inline-flex;
  }
  .toolbar_separate, .codeditor_tip {
    display: none;
  }
}
</style>