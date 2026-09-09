<template>
  <div class="evui">
    <VueDragResize v-for="(ediv, drid) in displayList" :key="drid" className="ediv" dragHandle=".ediv_title--name" :parent="true" :prevent-deactivation="false" :active="ediv.active" :w="ediv.width" :h="ediv.height" :x="ediv.left" :y="ediv.top" :z="ediv.z" :resizable="ediv.active ? ediv.resizable : false" :draggable="ediv.draggable" :maxWidth="evMaxW" :maxHeight="evMaxH" :handles="['tl','tr','bl','br']" :lock-aspect-ratio="false" :class="{ 'ediv--minimized': ediv.minimized, 'ediv--maximized': ediv.maximized && !ediv.minimized, 'ediv--inactive': !ediv.active }" @deactivated="ediv.z=1" @activated="ediv.maximized ? ediv.z=100 : (ediv.z=2)" @resizeStop="(...args) => updateVal(args, drid)" @dragStop="(...args) => updateVal(args, drid)">
      <h3 class="ediv_title" :style="ediv.style.title" @click="ediv.maximized ? null : (ediv.z=Math.max(ediv.z, 100), evActivate(drid))">
        <span class="ediv_title--arrows" v-if="sortedDisplayList.length > 1" @click.stop>
          <span class="ediv_title--arrow ediv_title--arrowprev" @click.stop="evSwitchWindow('prev')" :title="'切换到上一个窗口'"><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></span>
          <span class="ediv_title--counter">{{ getWindowIndex(drid) }}/{{ topWindowTotal }}</span>
          <span class="ediv_title--arrow ediv_title--arrownext" @click.stop="evSwitchWindow('next')" :title="'切换到下一个窗口'"><svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></span>
        </span>
        <span class="ediv_title--name" :title="drid">{{ ediv.title }}</span>
        <span class="ediv_title--minimize" @click="evMinimize(drid)" :title="$t('minimize')"><i class="ediv_btn_icon ediv_btn_icon--min"></i></span>
        <span v-if="ediv.maximized" class="ediv_title--maximize" @click="evRestoreMaximized(drid)" :title="$t('restore')"><i class="ediv_btn_icon ediv_btn_icon--restore"></i></span>
        <span v-else class="ediv_title--maximize" @click="evMaximize(drid)" :title="$t('maximize')"><i class="ediv_btn_icon ediv_btn_icon--max"></i></span>
        <span class="ediv_title--close" @click="evRemove(drid)">x</span>
      </h3>
      <div class="ediv_content" :style="ediv.style.content" v-html="ediv.content" @click="evDelegate($event, drid)" @keydown.ctrl.83.prevent.stop="evSave(drid)"></div>
      <div v-if="ediv.cbable" class="ediv_btncontainer">
        <textarea class="elecTable_input ediv_cbdata" :style="ediv.style.cbdata" :placeholder="ediv.cbhint" v-model="ediv.cbdata" @keyup.ctrl.enter="cbsubmit(drid)"></textarea>
        <button class="elecBtn ediv_cbbtn" :style="ediv.style.cbbtn" @click="cbsubmit(drid)">{{ ediv.cblabel }}</button>
      </div>
    </VueDragResize>
    <div v-if="hasMinimized" class="evui_dock">
      <div v-for="ediv in minimizedList" :key="ediv._id" class="evui_dock_item" @click="evRestoreMinimized(ediv._id)">
        <span class="evui_dock_label">{{ ediv.title }}</span>
        <div class="evui_dock_iconwrap">
          <img class="evui_dock_icon" :src="minLogo(ediv)" :alt="ediv.title" />
          <span class="evui_dock_close" @click.stop="evRemove(ediv._id)" title="x"><svg viewBox="0 0 24 24" width="10" height="10"><path fill="currentColor" d="M6.4 5L5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"/></svg></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { vue2Proto } from './api'
import VueDragResize from 'vue-draggable-resizable'

export default {
  name: 'evui',
  components: {
    VueDragResize
  },
  data() {
    return {
      init: {
        title: 'elecV2P 显示窗口',
        top: 0,
        left: 0,
        width: 620,
        height: 360,
        z: 1,
        active: true,
        resizable: false,
        draggable: true,
        content: `<h1>${this.$t('no_content')}</h1><p>About $evui: <a href='https://github.com/elecV2/elecV2P-dei/tree/master/docs/04-JS.md' target='elecV2PDoc'>DOCS $evui</a></p>`,
        style: {
          content: "font-size: 15px",
        },
        cbable: false,
        cbdata: '',
        cblabel: this.$t('submit'),
        cbhint: this.$t('input_return_data'),
      },
      script: '',
      draglist: { },
      docklist: { },
      dirty: false,
      maxZ: 2,
      viewport: { w: 0, h: 0 },
      windowOrder: [],  // 按固定顺序记录窗口ID
    }
  },
  computed: {
    evMaxW() {
      return this.viewport.w
    },
    evMaxH() {
      return this.viewport.h
    },
    hasMinimized() {
      return Object.values(this.draglist).some(e => e.minimized) || Object.keys(this.docklist).length > 0
    },
    displayList() {
      const list = {}
      for (const [id, item] of Object.entries(this.draglist)) {
        list[id] = item
      }
      return list
    },
    minimizedList() {
      const list = []
      for (const [id, item] of Object.entries(this.draglist)) {
        if (item.minimized) {
          list.push({ ...item, _id: id, _source: 'drag' })
        }
      }
      for (const [id, item] of Object.entries(this.docklist)) {
        list.push({ ...item, _id: id, _source: 'dock' })
      }
      return list
    },
    sortedDisplayList() {
      // 按 windowOrder 顺序排列，非最小化窗口
      const ids = this.windowOrder.filter(id => this.draglist[id] && !this.draglist[id].minimized)
      return ids.map(id => [id, this.draglist[id]])
    },
    topWindowTotal() {
      return this.windowOrder.filter(id => this.draglist[id] && !this.draglist[id].minimized).length
    },
  },
  created() {
    vue2Proto.evui = (evui)=>this.neweu({ ...evui, type: 'local' })

    if (this.$wsrecv) {
      this.$wsrecv.add('evui', obj => {
        let sobj = this.$sJson(obj)

        if (!sobj) {
          this.$message.error('evui 输送的数据有误')
          return
        }
        if (sobj.data && sobj.data.script) {
          this.script = sobj.data.script
        }

        switch (sobj.type) {
        case 'neweu':
          this.neweu(sobj.data)
          break
        case 'close':
        case 'delete':
          if (this.draglist[sobj.id] || this.docklist[sobj.id]) {
            const item = this.draglist[sobj.id] || this.docklist[sobj.id]
            this.$message.success('收到服务器端关闭', item.title, 'evui 界面的命令', sobj.message && '\n附带信息: ' + sobj.message )
            this.evRemove(sobj.id)
          }
          break
        case 'contentadd':
          this.draglist[sobj.id].content = this.draglist[sobj.id].content + this.$sString(sobj.data)
          break
        case 'content':
          this.draglist[sobj.id].content = this.$sString(sobj.data)
          break
        case 'cbdataadd':
          let newdata = this.draglist[sobj.id].cbdata + '\n' + this.$sString(sobj.data)
          this.draglist[sobj.id].cbdata = newdata
          break
        case 'cbdata':
        default:
          this.draglist[sobj.id].cbdata = this.$sString(sobj.data)
        }
      })
    }
    this.restoreAll()
  },
  mounted() {
    this.updateViewport()
    window.addEventListener('resize', this.updateViewport)
    window.addEventListener('orientationchange', this.updateViewport)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    window.addEventListener('beforeunload', this.onBeforeUnload)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateViewport)
    window.removeEventListener('orientationchange', this.updateViewport)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    window.removeEventListener('beforeunload', this.onBeforeUnload)
  },
  watch: {
    script(code){
      this.$uApi.injectJs(code)
    }
  },
  methods: {
    minLogo(item) {
      return this.$uApi.hashToLogo(item._id, item.title, 3)
    },
    updateVal({...rect}, drid) {
      let newval = {
        left: rect[0],
        top: rect[1]
      }
      if (rect[2] !== undefined && rect[3] !== undefined) {
        newval.width = rect[2]
        newval.height = rect[3]
      }
      Object.assign(this.draglist[drid], newval)
      this.markDirty()
    },
    evActivate(id){
      for (const wid in this.draglist) {
        if (wid !== id) this.draglist[wid].active = false
      }
      if (this.draglist[id]) this.draglist[id].active = true
    },
    neweu(evui = {}){
      let id = evui.id || this.$uStr.euid()
      const reqMaximized = !!evui.maximized
      evui = { ...this.init, ...evui }
      // 移动端按可视区域 clamp 宽高，避免窗口溢出屏幕（vue-draggable-resizable 的内联 width/height 优先级高于 .ediv { max-width:100% }）
      const vw = document.documentElement.clientWidth || document.body.clientWidth || window.innerWidth
      const vh = document.documentElement.clientHeight || document.body.clientHeight || window.innerHeight
      const defW = Number(evui.width || 800)
      const defH = evui.height === 'auto' ? 'auto' : Number(evui.height || 460)
      if (evui.width == null || defW === 'auto' ? false : defW > vw) evui.width = Math.max(240, Math.min(defW, vw))
      if (evui.height === 'auto') {
        // 自适应高度：保持 auto，不强制设为固定值
        evui.height = 'auto'
      } else if (evui.height == null || defH > vh) {
        evui.height = Math.max(160, Math.min(defH, vh))
      }
      const autoH = evui.height === 'auto'
      const hNum = autoH ? 320 : evui.height
      const wNum = evui.width === 'auto' ? 600 : evui.width
      evui.top = evui.top || (vh - hNum)/2
      evui.left = evui.left || (vw - wNum)/2
      if (evui.top < 0) evui.top = 0
      if (evui.left < 0) evui.left = 0
      if (!autoH && evui.top + evui.height > vh) evui.top = Math.max(0, vh - evui.height)
      if (evui.left + evui.width > vw) evui.left = Math.max(0, vw - evui.width)
      if (evui.content) evui.content = this.$sString(evui.content)
      if (evui.cbdata) evui.cbdata = this.$sString(evui.cbdata)
      if (this.$sType(evui.style) !== 'object') evui.style = { content: evui.style }
      if (evui.script) this.script = evui.script
      evui.minimized = false
      evui.maximized = false
      evui.z = ++this.maxZ
      evui.active = true
      // 取消其他窗口的激活状态
      for (const wid in this.draglist) {
        if (wid !== id) this.draglist[wid].active = false
      }
      this.draglist[id] = evui
      if (!this.windowOrder.includes(id)) this.windowOrder.push(id)
      // 窗口数量超过 12 时，提示可能影响性能，且不进行 store 持久化
      if (Object.keys(this.draglist).length > 12) {
        this.$message.success(this.$t('evui_too_many_title'), this.$t('evui_too_many_msg'), 6)
      }
      this.dirty = evui.persist !== false
      if (reqMaximized) this.evMaximize(id)
    },
    evMaximize(id) {
      const item = this.draglist[id]
      if (!item) return
      item.prev = { resizable: item.resizable, draggable: item.draggable }
      item.resizable = false
      item.draggable = false
      item.maximized = true
    },
    evRestoreMaximized(id) {
      const item = this.draglist[id]
      if (!item || !item.prev) return
      Object.assign(item, item.prev, { maximized: false })
      delete item.prev
      item.z = ++this.maxZ
      item.active = true
    },
    markDirty() {
      this.dirty = true
    },
    persistAll() {
      if (!this.dirty) return
      const data = {}
      const entries = [
        ...Object.entries(this.draglist),
        ...Object.entries(this.docklist),
      ]
      // 只保留最新的 10 个窗口
      const latest = entries.slice(-12)
      for (const [id, item] of latest) {
        // content 大于 20KB 直接丢弃
        if (item.content && this.$sString(item.content).length > 20 * 1024) continue
        data[id] = {
          title: item.title,
          top: item.top,
          left: item.left,
          width: item.width,
          height: item.height,
          z: item.z,
          type: item.type,
          content: item.content,
          style: item.style,
          // 最大化时 resizable/draggable 会被临时改成 false，若直接持久化会导致还原后窗口不可拖动/缩放。
          // 因此写入 store 时应取最大化前的原始值（item.prev），没有则用当前值。
          resizable: item.prev?.resizable ?? item.resizable,
          draggable: item.prev?.draggable ?? item.draggable,
          cbable: item.cbable,
          cbdata: item.cbdata,
          cblabel: item.cblabel,
          cbhint: item.cbhint,
          minimized: item.minimized,
          maximized: item.maximized,
        }
      }
      const hasData = Object.keys(data).length > 0
      const req = hasData
        ? { type: 'save', data: { key: '.evui_all', value: { type: 'object', value: data } } }
        : { type: 'delete', data: '.evui_all' }
      this.$axios.put('/store', req).then(res=>{
        if (hasData && res.data.rescode !== 0) {
          this.$message.error('evui 窗口保存到 store 常量失败', res.data.message)
        }
      }).catch(e=>{
        this.$message.error('evui 窗口保存到 store 常量失败', e && e.message)
      })
      this.dirty = false
    },
    restoreAll() {
      this.$axios.get('/store/.evui_all').then(res=>{
        let store
        try {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          store = parsed && parsed.value || {}
        } catch (e) {
          store = {}
        }
        for (const id of Object.keys(store)) {
          if (this.draglist[id] || this.docklist[id]) continue
          const data = store[id]
          if (data.minimized) {
            // 最小化状态的窗口不调用 neweu，仅作为 dock 项，节省 content 加载
            this.docklist[id] = data
          } else {
            this.neweu({ id, ...data })
          }
        }
        this.dirty = false
      }).catch(()=>{})
    },
    updateViewport() {
      const w = document.documentElement.clientWidth || window.innerWidth || 0
      const h = document.documentElement.clientHeight || window.innerHeight || 0
      if (this.viewport.w === w && this.viewport.h === h) return
      this.viewport = { w, h }
    },
    onVisibilityChange() {
      if (document.hidden) this.persistAll()
    },
    onBeforeUnload() {
      this.persistAll()
    },
    evMinimize(id) {
      const item = this.draglist[id]
      if (!item || item.minimized) return
      if (!item.prev) {
        item.prev = { top: item.top, left: item.left, width: item.width, height: item.height, z: item.z, resizable: item.resizable, draggable: item.draggable, maximized: !!item.maximized }
      }
      item.minimized = true
      item.active = false
      this.markDirty()
    },
    evRestoreMinimized(id){
      // 先判断来源
      if (this.docklist[id]) {
        const data = this.docklist[id]
        delete this.docklist[id]
        this.neweu({ id, ...data })
        return
      }
      const item = this.draglist[id]
      if (!item) return
      // 取消其他窗口的激活状态
      for (const wid in this.draglist) {
        if (wid !== id) this.draglist[wid].active = false
      }
      item.minimized = false
      const wasMaximized = item.prev && item.prev.maximized
      if (item.prev && !item.maximized) {
        Object.assign(item, item.prev)
        delete item.prev
      }
      // 如果最小化前是最大化状态，调用 evMaximize 重新进入全屏
      if (wasMaximized) {
        this.evMaximize(id)
      } else {
        item.z = ++this.maxZ
      }
      item.active = true
      this.markDirty()
    },
    evRemove(id){
      if (!id) {
        this.$message.error('a id of the evui is expect')
        return
      }
      if (this.draglist[id]) {
        if (this.draglist[id].type !== 'local' && this.$wsrecv && this.$wsrecv.connected) {
          this.$wsrecv.send(id, 'close')
        }
        delete this.draglist[id]
        this.windowOrder = this.windowOrder.filter(wid => wid !== id)
        this.markDirty()
        return
      }
      if (this.docklist[id]) {
        delete this.docklist[id]
        this.markDirty()
      }
    },
    cbsubmit(id){
      this.$message.success(this.draglist[id].title, 'send data:\n', this.draglist[id].cbdata)
      if (this.$wsrecv) {
        this.$wsrecv.send(id, this.draglist[id].cbdata)
      }
    },
    evSwitchWindow(direction) {
      const order = this.windowOrder.filter(id => this.draglist[id] && !this.draglist[id].minimized)
      if (order.length <= 1) return
      // 找到当前激活窗口，找不到则用第一个
      let activeId = order.find(id => this.draglist[id]?.active)
      if (!activeId) activeId = order[0]
      const curIdx = order.indexOf(activeId)
      // 计算下一个窗口 ID（prev 上一个，next 下一个，循环）
      let nextIdx
      if (direction === 'prev') {
        nextIdx = curIdx > 0 ? curIdx - 1 : order.length - 1
      } else {
        nextIdx = curIdx < order.length - 1 ? curIdx + 1 : 0
      }
      const nextId = order[nextIdx]
      if (nextId === activeId) return
      // 检查是否有全屏窗口
      const maximizedId = order.find(id => this.draglist[id].maximized)
      // 切换激活状态
      this.draglist[activeId].active = false
      // 新激活窗口设为最高 z，全屏窗口重置为 100（确保在 dock 之上）
      this.draglist[nextId].z = maximizedId ? 101 : Math.max(++this.maxZ, 100)
      this.draglist[nextId].active = true
      if (maximizedId && maximizedId !== nextId) {
        this.draglist[maximizedId].z = 100
      }
      this.markDirty()
    },
    getWindowIndex(drid) {
      const order = this.windowOrder.filter(id => this.draglist[id] && !this.draglist[id].minimized)
      const idx = order.indexOf(drid)
      return idx === -1 ? 0 : idx + 1
    },
    evDelegate(event, id){
      const method = event && event.target.dataset.method
      if (!method) {
        return
      }
      if (this.draglist[id].methods && this.draglist[id].methods[method]) {
        this.draglist[id].methods[method](event)
      }
      const dclose = event.target.dataset.close
      if (dclose === 'true' || method === 'close') {
        this.evRemove(id)
      }
    },
    evSave(id){
      if (this.draglist[id].methods && this.draglist[id].methods['save']) {
        this.draglist[id].methods['save']()
        this.evRemove(id)
      }
    },
  }
}
</script>
