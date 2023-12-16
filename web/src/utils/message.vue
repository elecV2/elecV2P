<template>
  <div class="message">
    <div class="message_item" v-for="(item, mid) in msgs" :key="mid" :style="{ 'textAlign': item.align }">
      <span class="message_type icon" v-html="icon[item.type]"></span>
      <span class="message_text" :class="{ cursor: item.url }" @click="$uApi.open(item.url)" :title="item.url">{{ item.text }}</span>
      <span class="message_remove" @click="msgRemove(mid)">X</span>
    </div>
  </div>
</template>

<script>
import icon from './icon.js'
import { vue2Proto } from './api'
import { sType, sString, euid } from './string'

export default {
  name: "message",
  data(){
    return {
      msgs: {},
      icon
    }
  },
  computed: { },
  created(){
    Object.assign(vue2Proto.message, {
      success: (...args)=>{
        return this.msgShow('success', this.formMsg(args))
      },
      error: (...args)=>{
        return this.msgShow('error', this.formMsg(args))
      },
      loading: (...args)=>{
        return this.msgShow('loading', this.formMsg(args))
      },
      close: (mid)=>{
        if (mid) {
          this.msgRemove(mid)
        } else {
          this.msgs = {}
        }
      }
    })

    if (this.$wsrecv) {
      // 避免 EFSS 界面报错
      this.$wsrecv.add('message', data => {
        if (sType(data) === 'object') {
          switch (data.type) {
          case 'success':
          case 'error':
          case 'loading':
            const info = this.formMsg(data.data)
            this.msgShow(data.type, info)
            this.msgNotify(info.msg, { secd: info.secd, url: info.url, tag: info.mid })
            break
          case 'close':
            if (data.data) {
              this.msgRemove(data.data)
            } else {
              this.msgs = {}
            }
            break
          default:
            this.msgShow('error', { msg: '暂不支持的通知类型: ' + data.type, secd: 10 })
          }
        } else {
          this.msgShow('success', this.formMsg(data))
        }
      })
    }
  },
  methods: {
    formMsg(args) {
      if (args.length === 0) {
        return { msg: '' }
      }
      if (sType(args) !== 'array') {
        return { msg: sString(args) }
      }
      if (args.length === 1) {
        return { msg: sString(args[0]) }
      }
      let option = args.pop(), secd, url, mid, align
      if (Number.isFinite(option)) {
        secd = option
      } else if (sType(option) === 'object' && (option.secd || option.url || option.mid || option.align)) {
        secd = option.secd
        url = option.url
        mid = option.mid
        align = option.align
      } else {
        args.push(option)
      }
      return { msg: args.map(arg=>sString(arg)).join(' '), secd, url, mid, align }
    },
    msgShow(type, { msg, secd, url, mid = euid(), align }){
      if (msg === undefined || msg === '') {
        msg = 'a empty message'
        mid = 'empty'
      }
      if (!Number.isFinite(secd)) {
        // 根据内容长度设置 secd
        secd = (msg.match(/\W/g) || msg).length / 5 + (3 * Object.keys(this.msgs).length || 5)
      }

      this.$set(this.msgs, mid, {
        text: msg,
        type, secd, url, align
      })

      if (secd !== 0) {
        this.msgs[mid].sTout = setTimeout(this.msgRemove, secd * 1000, mid)
      }

      return ()=>{
        this.msgRemove(mid)
      }
    },
    msgRemove(mid){
      if (this.msgs[mid]) {
        clearTimeout(this.msgs[mid].sTout)
        this.$delete(this.msgs, mid)
      }
    },
    async getNotifyPerm(){
      if (typeof Notification === 'undefined') {
        return ''
      }
      let perm = Notification.permission
      if (perm === 'granted' || perm === 'denied') {
        return perm
      }
      perm = await Notification.requestPermission()
      if (perm === undefined) {
        return new Promise(resolve=>Notification.requestPermission(perm=>resolve(perm)))
      }
      return perm
    },
    async msgNotify(body = '', options = {}){
      let perm = await this.getNotifyPerm()
      if (perm === 'granted') {
        if (!options.icon) {
          options.icon = 'efss/logo/elecV2P.png'
        }
        const nid = new Notification(options.title || '', { body, icon: options.icon, tag: options.tag })
        if (options.secd > 0) {
          setTimeout(()=>nid.close(), options.secd * 1000)
        }
        if (options.url) {
          nid.onclick = event=>{
            event.preventDefault()
            this.$uApi.open(options.url)
            nid.close()
          }
        }
      }
    },
  }
}
</script>

<style scoped>
.message {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  max-height: 100%;
  display: flex;
  justify-content: space-around;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  line-height: 1.5;
  list-style: none;
  pointer-events: none;
  z-index: 1024;
  color: rgba(0, 0, 0, 0.65);
}

.message_item {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  max-width: 82%;
  min-height: 35px;
  max-height: 600px;
  font-size: 18px;
  text-align: center;
  border-radius: 1em;
  margin: 4px 0;
  padding-left: 8px;
  background: var(--main-cl);
  pointer-events: painted;
}

.message_type, .message_text, .message_remove {
  padding: 4px 0;
}

.message_type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
}

.message_text {
  width: 100%;
  overflow: hidden auto;
  color: var(--main-fc);
  word-break: break-all;
  white-space: pre-wrap;
  font-family: var(--font-ms);
}

.message_remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  border-radius: 0 1em 1em 0;
  cursor: pointer;
  opacity: 0;
  color: var(--main-fc);
  background: var(--delt-bk);
}

.message_remove:hover {
  opacity: 1;
}
</style>