<template>
  <div class="preview" v-show="preview.enable" :class="{ 'preview--collapsed': collapse }"
    :style="'transform: translate(' + tranposi[0] + 'px, ' + tranposi[1] + 'px);'"
    :draggable="collapse"
    @dragstart="dragStart($event)"
    @dragend="dragEnd($event)"
  >
    <div class="title title--editview">
      <span class="title_close" @click.prevent="previewClose()">X</span>
      <span class="title_main">{{ preview.name }}</span>
      <span class="title_collapse" :class="{ 'title_collapse--collapsed': collapse }" @click.prevent="previewCollapse()"></span>
    </div>
    <div class="preview_toolbar">
      <ul class="preview_menu eflex eflex--wrap">
        <li title="保存该文件到本地磁盘上">
          <button class="elecBtn elecBtn--h32 folderbk" @click="fileSave()">下载该文件</button>
        </li>
        <li>
          <button class="elecBtn elecBtn--clear elecBtn--h32" @click="fileDelete()">删除该文件</button>
        </li>
        <li title="在新标签页中查看该文件">
          <button class="elecBtn elecBtn--check elecBtn--h32" @click="fileOpen()">新页面打开</button>
        </li>
      </ul>
    </div>
    <div class="preview_content">
      <img v-if="preview.type==='image'" :src="previewurl" :alt="preview.name" class="preview_image" draggable="false"/>
      <div v-else-if="preview.type==='media'" class="premedia">
        <video :src="previewurl" controls class="preview_media" autoplay="true"
          @play="playStart()" @ended="playNext()"
          @loadedmetadata="volumeSet($event)"
        >
        <p>
          Your browser doesn't support HTML media. Here is a
          <a :href="previewurl" target="_blank">link to the media</a> instead.
        </p>
        </video>
      </div>
      <div v-else-if="preview.type">
        <p>暂时无法预览文件类型 {{ preview.type }}。文件地址：<a :href="previewurl" target="_blank">{{previewurl}}</a></p>
      </div>
      <div class="preview_list" v-show="listshow">
        <ul class="preview_listul">
          <li v-for="name in preview.list" class="preview_listli" :class="{ greenbk: name === preview.name }" :key="name" @click="preview.name=name">{{name}}</li>
        </ul>
      </div>
      <div class="precontrol">
        <div class="precontrol_menu">
          <span class="precontrol_item" @click="listshow=!listshow" title="查看同类型文件列表">☰</span>
          <span class="precontrol_item" @click="playNext(-1)" title="上一项">⏮</span>
          <span class="precontrol_item" :class="{ 'precontrol_item--active': autonext }" @click="playMode(1)" title="连续播放">🔁</span>
          <span class="precontrol_item" :class="{ 'precontrol_item--active': randnext }" @click="playMode(2)" title="随机播放">🔀</span>
          <span class="precontrol_item" @click="playNext(1)" title="下一项">⏭</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "preview",
  props: ['preview'],
  data(){
    return {
      collapse: false,
      position: [0, 0],
      tranposi: [0, 0],
      listshow: false,
      autonext: false,
      randnext: false,
      b_volume: true,
      orgtitle: this.$uApi.getTitle(),
      autoInter: null,
      mediaend: true,
    }
  },
  watch: {
    'preview': function(val) {
      if (val.enable) {
        this.collapse = false
        this.listshow = false
        this.tranposi = [0, 0]
      }
    }
  },
  computed: {
    previewurl(){
      return '/efss' + this.preview.base + '/' + this.preview.name
    },
    curtidx(){
      return this.preview.list.indexOf(this.preview.name)
    },
  },
  methods: {
    previewClose(){
      this.preview.enable = false
      this.preview.type = ''
      this.preview.base = ''
      this.preview.name = ''
      this.preview.list = []
      this.$uApi.setTitle(this.orgtitle)
      this.interClear()
      this.autonext = false
      this.randnext = false
    },
    previewCollapse(){
      this.tranposi = [0, 0]
      this.collapse = !this.collapse
      this.interClear()
    },
    fileOpen(){
      this.$uApi.open(this.previewurl)
    },
    fileSave(){
      this.$uApi.downloadFile(this.previewurl, this.preview.name)
    },
    fileDelete(){
      const filename = this.preview.name
      if (!confirm(`确定删除文件 ${ filename }？(不可恢复)`)) {
        return
      }
      const hideloading = this.$message.loading('正在删除文件', filename, '...', 0)
      this.$axios.delete('/sefss', {
        data: {
          path: this.preview.base,
          files: [filename],
        }
      }).then((res)=>{
        if (res.data.rescode === 0) {
          this.$emit('eRemove', filename)
          const del_idx = this.preview.list.indexOf(filename)
          this.preview.list.splice(del_idx, 1)
          if (this.preview.list.length) {
            this.preview.name = this.preview.list[del_idx] || this.preview.list[0]
          }
          this.$message.success('操作完成', res.data.message)
        } else {
          this.$message.error(filename, '删除失败:', res.data.message)
        }
      }).catch(e=>{
        this.$message.error(filename, '删除失败', e.message)
        console.error(filename, '删除失败', e)
      }).finally(hideloading)
    },
    dragStart(e){
      e.dataTransfer.effectAllowed = 'move'
      this.position = [e.clientX, e.clientY]
    },
    dragEnd(e){
      e.preventDefault()
      this.tranposi = [this.tranposi[0] + e.clientX - this.position[0], this.tranposi[1] + e.clientY - this.position[1]]
    },
    playStart(){
      this.$uApi.setTitle(this.preview.name + ' - elecV2P Player')
      this.mediaend = false
    },
    playNext(next = 0){
      // next: -1 上一 1 下一 0 自动
      if (this.preview.type === 'media') {
        this.$uApi.setTitle(this.orgtitle)
        if (next === 0) this.mediaend = true
      }
      if (!next && !(this.autonext || this.randnext)) {
        return
      }
      const list_len = this.preview.list.length
      if (list_len <= 1) {
        return
      }
      const next_idx = this.randnext ? this.$uStr.iRandom(0, list_len) : this.curtidx + (next || 1)
      this.preview.name = this.preview.list[next_idx] || this.preview.list[0]
    },
    playMode(mode = 1){
      // mode: 1 连续播放 2 随机播放
      switch(mode){
      case 1:
        this.autonext = !this.autonext
        this.$message.success(this.autonext ? '开启连续播放模式' : '退出连续播放模式')
        this.autonext && (this.randnext = false)
        break
      case 2:
        this.randnext = !this.randnext
        this.$message.success(this.randnext ? '开启随机播放模式' : '退出随机播放模式')
        this.randnext && (this.autonext = false)
        break
      default:
        this.message.error('未知操作')
      }
      if (this.preview.type === 'image') {
        if (!this.autoInter && (this.autonext || this.randnext)) {
          this.autoInter = setInterval(this.playNext, 5e3, 1)
        } else if (this.autoInter && !(this.autonext || this.randnext)) {
          this.interClear()
        }
      } else if (this.mediaend) {
        this.playNext(1)
      }
    },
    interClear(){
      if (this.autoInter) {
        clearInterval(this.autoInter)
        this.autoInter = null
        this.autonext = false
        this.randnext = false
      }
    },
    volumeSet(e){
      if (this.b_volume) {
        e.target.volume = 0.3
        this.b_volume = false
      }
    },
  }
}
</script>

<style scoped>
.preview {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  z-index: 8;
  background: var(--main-fc);
  transition-property: width,height;
  transition-duration: .2s;
}
.preview--collapsed {
  height: 36px;
  width: 360px;
  overflow: hidden;
  border-radius: 8px;
}
.preview--collapsed .title_main {
  white-space: pre;
  text-overflow: ellipsis;
  overflow: hidden;
  direction: rtl;
  cursor: move;
  user-select: none;
}
.preview--collapsed > .preview_content, .preview--collapsed > .preview_toolbar,
.preview--collapsed > .preview_list {
  display: none;
}
.preview_toolbar {
  padding-top: 3px;
  border-bottom: 1px solid var(--tras-bk);
  border-top: none;
  background: var(--main-fc);
  color: var(--main-bk);
}
.preview_menu {
  width: 100%;
}
.preview_content {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow: auto;
}
.preview_image, .preview_media {
  max-width: 100%;
  user-drag: none;
  user-select: none;
  pointer-events: none;
}
.preview_list {
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  max-width: 360px;
  height: 100%;
  background: var(--secd-fc);
  color: var(--main-fc);
  font-size: 18px;
  overflow: hidden auto;
}
.preview_listli {
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 3px 0.5em;
  border-bottom: 1px solid;
  cursor: pointer;
}

.premedia {
  width: 100%;
  text-align: center;
}
.precontrol {
  position: fixed;
  bottom: 1em;
  display: flex;
  justify-content: center;
  vertical-align: middle;
}
.precontrol_menu {
  height: 40px;
  display: inline-flex;
  vertical-align: middle;
  padding: 0 6px;
  border-radius: 20px;
  background: var(--main-bk);
  color: var(--main-fc);
}
.precontrol_item {
  line-height: 40px;
  padding: 0 12px;
  width: 60px;
  display: inline-flex;
  vertical-align: middle;
  justify-content: center;
  border-right: 1px solid;
  text-shadow: 0 0 2px var(--main-fc);
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
}
.precontrol_item:last-child {
  border: none;
}
.precontrol_item--active {
  background-color: var(--main-cl);
}
</style>