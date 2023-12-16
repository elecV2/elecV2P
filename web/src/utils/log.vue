<template>
  <div class="loginfo" :class="{ 'loginfo--full': !collapse.loginfo }"
    tabindex="-1" @keyup.esc.prevent.stop.exact="collapse.loginfo=true">
    <h3 class="loginfo_title">
      <span class="loginfo_clear icon" @click="logs.splice(0)" :title="$t('clear')+$t('logs')" v-html="icon.clear"></span>
      <span>{{ title || 'elecV2P ' + $t('logs') }}</span>
      <span @click.prevent.self="collapse.loginfo=!collapse.loginfo" class="title_collapse" :class="{ 'title_collapse--collapsed': collapse.loginfo }"></span>
    </h3>
    <div class="logcontext">
      <span class="loginfo_item" v-for="{ log, key } in logobj" :key="key" v-html="log"></span>
    </div>
  </div>
</template>

<script>
import icon from './icon'
import { logHtml } from './string'

export default {
  name: "log",
  props: {
    'logs': Object,
    'title': String,
    'collapse': {
      type: Object,
      default: function (){
        return { loginfo: true }
      }
    }
  },
  data(){
    return {
      icon,
      logobj: [],
    }
  },
  watch: {
    logs(val){
      let tobj = []
      val.forEach((log, idx)=>{
        if (typeof log !== 'string') {
          return
        }
        tobj.push({ log: logHtml(log), key: val.length - idx })
      })
      this.logobj = tobj
    }
  }
}
</script>

<style scoped>
.loginfo {
  box-sizing: border-box;
  padding: 8px 10px;
  margin-top: var(--base-sz);
  border-radius: var(--radius-bs);
  text-align: left;
  font-size: 20px;
  outline: none;
  color: var(--main-fc);
  background: var(--main-bk);
}
.loginfo--full {
  z-index: 3;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  border-radius: 0;
  margin-top: 0;
  padding-right: 0;
}
.loginfo--full .logcontext {
  overflow-y: auto;
  height: calc(100vh - 48px);
}
.loginfo--full .loginfo_title {
  padding-right: 10px;
}
.loginfo_title {
  position: relative;
  display: flex;
  justify-content: space-between;
  vertical-align: middle;
  align-items: center;
  height: 32px;
  text-align: center;
  font-size: 26px;
  color: var(--main-fc);
}

.loginfo_clear {
  height: 32px;
  line-height: 32px;
  font-size: 32px;
  color: var(--main-fc);
  cursor: pointer;
}

.loginfo_clear:focus {
  outline: none;
}

.loginfo_item {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-ms);
}
</style>