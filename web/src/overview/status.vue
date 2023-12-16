<template>
  <div class="status">
    <div class="title title--radius" :class="{ trasbk: boffline }">
      <span class="title_main mleft30 cursor" @click.prevent.self="cinfo_show=!cinfo_show">{{ $t('con_clients') }}: {{ clients }}</span>
      <span @click="ovUpdate()" class="icon cursor title_sync" title="刷新当前页面数据" v-html="icon.sync"></span>
    </div>
    <div class="cinfo" v-show="cinfo_show">
      <div v-for="(client, id) in clientsitem" :key="id" class="cinfo_item border_top1" :class="{ greenbk: id === $wsrecv.id }" :title="(id === $wsrecv.id ? '当前客户端 ' : '其他客户端 ') + id">{{ client }}</div>
    </div>
    <div class="hoststatus" v-show="sysinfo" title="该部分数据仅在刷新页面时更新">
      <h4 class="status_title">{{ $t('host_info') }}</h4>
      <div class="status_memoryusage">
        <span class="status_item">{{ $t('arch') }}: {{ sysinfo.arch }}</span>
        <span class="status_item">{{ $t('platform') }}: {{ sysinfo.platform }}</span>
        <span class="status_item">{{ $t('memory') }}: {{ sysinfo.memory }}</span>
        <span class="status_item" title="服务器持续运行时间">UPTIME: {{ sysinfo.uptime }}</span>
        <span class="status_item">NODEJS: {{ sysinfo.nodever }}</span>
      </div>
    </div>
    <div class="memorystatus">
      <h4 class="status_title">elecV2P {{ $t('memoryusage') }}<span class="status_toggle" @click="statusSendToggle()" :title="statussendflag ? '暂停更新' : '保持传输'" v-html="statussendflag ? icon.stop : icon.plays"></span></h4>
      <div class="status_memoryusage">
        <span v-for="(value, key) in memoryusage" :key="key" class="status_item">{{ key }}: {{ value }}</span>
      </div>
    </div>
    <div class="jsrunstatus" v-if="jsruntotal">
      <h4 class="status_title">{{ $t('jsruntimes') }} - {{ jsruntotal }}</h4>
      <div class="status_jsdetail" @click.prevent="logGate($event)">
        <span class="status_item cursor" v-for="(value, key) in jsrundetail" :key="key" data-method="open" :data-param="key">{{ key }}: {{ value }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import icon from '../utils/icon.js'

export default {
  name: 'status',
  props: ['sysinfo'],
  data(){
    return {
      clients: 0,
      memoryusage: {},
      jsruntotal: 0,
      jsrundetail: {},
      statussendflag: true,
      icon,
      clientsinfo: {},
      cinfo_show: false,
    }
  },
  computed: {
    boffline() {
      return typeof this.clients !== 'number'
    },
    clientsitem() {
      let citem = {}
      for (let key in this.clientsinfo) {
        let info = ''
        for (let subk in this.clientsinfo[key]) {
          info += `${subk}: ${this.clientsinfo[key][subk]} `
        }
        citem[key] = info.trim()
      }
      return citem
    }
  },
  created(){
    this.$wsrecv.add('elecV2Pstatus', (data)=>{
      this.clients = data.clients
      if (data.memoryusage) {
        this.memoryusage = data.memoryusage
      }
      this.statussendflag = true
      if (data.clientsinfo) {
        this.clientsinfo = data.clientsinfo
      }
    })

    this.$wsrecv.add('jsrunstatus', data => {
      this.jsruntotal = data.total
      this.jsrundetail = data.detail
    })
  },
  methods: {
    ovUpdate(){
      this.$emit('ovInit')
      if (!this.$wsrecv.connected) {
        this.$wsrecv.connect()
      }
    },
    statusSendToggle(){
      if (!this.$wsrecv.connected) {
        this.$message.error('当前 websocket 已断开，请连接后再试')
        return
      }
      this.$wsrecv.send('stopsendstatus', this.statussendflag)
      this.statussendflag = !this.statussendflag
    },
    logGate(e){
      let key = event.target.dataset.param
      switch(event.target.dataset.method) {
      case 'open':
      default:
        this.$uApi.open('./logs/' + key.replace(/\/|\\/g, '-') + '.log')
      }
    },
  }
}
</script>

<style scoped>
.status {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 0;
  margin: 0;
  margin-bottom: var(--base-sz);
  font-size: 24px;
  text-align: center;
  border-radius: var(--radius-bs);
  background: var(--main-bk);
  color: var(--main-fc);
}

.status_title {
  margin: 0;
  padding: 0 5px;
  word-break: break-word;
  color: var(--main-fc);
}

.status_toggle {
  float: right;
  cursor: pointer;
}

.status_item {
  width: 280px;
  max-width: 100%;
  min-width: fit-content;
  box-sizing: border-box;
  padding: 2px 8px;
  margin: 6px 1em;
  font-size: 18px;
  font-weight: bolder;
  border-radius: 8px;
  text-align: center;
  word-break: break-word;
  background: var(--main-fc);
  color: var(--main-cl);
}

.hoststatus,
.memorystatus, .jsrunstatus {
  padding: 6px 8px;
  border-top: 1px solid var(--main-fc);
}

.status_memoryusage, .status_jsdetail {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

.cinfo_item {
  font-size: 18px;
}
</style>