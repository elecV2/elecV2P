<template>
  <div class="evui">
    <VueDragResize v-for="(ediv, drid) in draglist" :key="drid" className="ediv" dragHandle=".ediv_title--name" :parent="true" :prevent-deactivation="false" :active="ediv.active" :w="ediv.width" :h="ediv.height" :x="ediv.left" :y="ediv.top" :z="ediv.z" :resizable="ediv.resizable" :draggable="ediv.draggable" :handles="['tl','tr','bl','br']" :lock-aspect-ratio="false" @deactivated="ediv.z=1" @activated="ediv.z=2" @resizestop="updateVal(arguments, drid)" @dragstop="updateVal(arguments, drid)">
      <h3 class="ediv_title" :style="ediv.style.title" @click="ediv.z=2">
        <span class="ediv_title--name" :title="drid">{{ ediv.title }}</span>
        <span class="ediv_title--close" @click="evRemove(drid)">x</span>
      </h3>
      <div class="ediv_content" :style="ediv.style.content" v-html="ediv.content" @click="evDelegate($event, drid)" @keydown.ctrl.83.prevent.stop="evSave(drid)"></div>
      <div v-if="ediv.cbable" class="ediv_btncontainer">
        <textarea class="elecTable_input ediv_cbdata" :style="ediv.style.cbdata" :placeholder="ediv.cbhint" v-model="ediv.cbdata" @keyup.ctrl.enter="cbsubmit(drid)"></textarea>
        <button class="elecBtn ediv_cbbtn" :style="ediv.style.cbbtn" @click="cbsubmit(drid)">{{ ediv.cblabel }}</button>
      </div>
    </VueDragResize>
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
        content: `<h1>暂时没有添加任何内容</h1><p>关于 $evui 的使用可参考：<a href='https://github.com/elecV2/elecV2P-dei/tree/master/docs/04-JS.md' target='elecV2PDoc'>说明文档 $evui 部分</a></p>`,
        style: {
          content: "font-size: 15px",
        },
        cbable: false,
        cbdata: '',
        cblabel: '提交',
        cbhint: '输入返回给后台的数据',
      },
      script: '',
      draglist: { },
    }
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
          if (this.draglist[sobj.id]) {
            this.$message.success('收到服务器端关闭', this.draglist[sobj.id].title, 'evui 界面的命令', sobj.message && '\n附带信息: ' + sobj.message )
            this.evRemove(sobj.id)
          }
          break
        case 'contentadd':
          this.$set(this.draglist[sobj.id], 'content', this.draglist[sobj.id].content + this.$sString(sobj.data))
          break
        case 'content':
          this.$set(this.draglist[sobj.id], 'content', this.$sString(sobj.data))
          break
        case 'cbdataadd':
          let newdata = this.draglist[sobj.id].cbdata + '\n' + this.$sString(sobj.data)
          this.$set(this.draglist[sobj.id], 'cbdata', newdata)
          break
        case 'cbdata':
        default:
          this.$set(this.draglist[sobj.id], 'cbdata', this.$sString(sobj.data))
        }
      })
    }
  },
  watch: {
    script(code){
      // 插入代码
      this.$uApi.injectJs(code)
    }
  },
  methods: {
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
    },
    neweu(evui = {}){
      let id = evui.id || this.$uStr.euid()
      evui = { ...this.init, ...evui }
      evui.top = evui.top || (document.body.clientHeight - Number(evui.height || 460))/2
      evui.left = evui.left || (document.body.clientWidth - Number(evui.width || 800))/2
      if (evui.top < 0) evui.top = 0
      if (evui.left < 0) evui.left = 0
      if (evui.content) evui.content = this.$sString(evui.content)
      if (evui.cbdata) evui.cbdata = this.$sString(evui.cbdata)
      if (this.$sType(evui.style) !== 'object') evui.style = { content: evui.style }
      if (evui.script) this.script = evui.script
      this.$set(this.draglist, id, evui)
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
        this.$delete(this.draglist, id)
      }
    },
    cbsubmit(id){
      this.$message.success(this.draglist[id].title, 'send data:\n', this.draglist[id].cbdata)
      if (this.$wsrecv) {
        this.$wsrecv.send(id, this.draglist[id].cbdata)
      }
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