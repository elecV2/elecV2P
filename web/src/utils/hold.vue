<template>
  <div class="hold" v-if="!bIsHide">
    <h4 class="hold_title">$HOLD: {{ title }}</h4>
    <div class="hold_edit">
      <div class="hold_left">
        <div v-if="request" class="hold_request">
          <div class="hold_request_flex">
            <select class="elecTable_select header_select" v-model="request.method">
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
            <label class="header_label">HOST : </label>
            <input class="elecTable_input hostname_input" v-model="request.hostname">
            <label class="header_label"> : </label>
            <input class="elecTable_input port_input" v-model="request.port">
          </div>
          <div class="hold_request_flex">
            <label class="header_label">PATH : </label>
            <input class="elecTable_input path_input" v-model="request.path">
          </div>
        </div>
        <div class="hold_header">
          <h4 class="hold_title">header<span @click="bIsTheader=!bIsTheader" aria-label="icon: interaction" class="icon icon-interaction"><svg viewBox="64 64 896 896" data-icon="interaction" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false" class=""><path d="M880 112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V144c0-17.7-14.3-32-32-32zm-40 728H184V184h656v656zM304.8 524h50.7c3.7 0 6.8-3 6.8-6.8v-78.9c0-19.7 15.9-35.6 35.5-35.6h205.7v53.4c0 5.7 6.5 8.8 10.9 5.3l109.1-85.7c3.5-2.7 3.5-8 0-10.7l-109.1-85.7c-4.4-3.5-10.9-.3-10.9 5.3V338H397.7c-55.1 0-99.7 44.8-99.7 100.1V517c0 4 3 7 6.8 7zm-4.2 134.9l109.1 85.7c4.4 3.5 10.9.3 10.9-5.3v-53.4h205.7c55.1 0 99.7-44.8 99.7-100.1v-78.9c0-3.7-3-6.8-6.8-6.8h-50.7c-3.7 0-6.8 3-6.8 6.8v78.9c0 19.7-15.9 35.6-35.5 35.6H420.6V568c0-5.7-6.5-8.8-10.9-5.3l-109.1 85.7c-3.5 2.5-3.5 7.8 0 10.5z"></path></svg></span></h4>
          <textarea v-if="bIsTheader" v-model.lazy="strheader" class="editor_textarea header_text"></textarea>
          <div v-else>
            <span v-for="(value, key) in header" :key="key" class="header_item">
              <label class="header_label" :title="key">{{ key }}:</label>
              <span class="button_delete" @click="headerDelete(key)">X</span>
              <input v-model="header[key]" class="elecTable_input header_input">
            </span>
          </div>
        </div>
      </div>
      <div class="hold_body">
        <h4 class="hold_title">body</h4>
        <textarea v-model.lazy="body" class="editor_textarea body_text"></textarea>
      </div>
    </div>
    <p class="hold_bcont center">
      <button class="elecBtn hold_button" @click="holdDone">完成</button>
      <button v-if="request" class="elecBtn hold_button" @click="reject">直接返回当前数据</button>
    </p>
  </div>
</template>

<script>
export default {
  name: "hold",
  data(){
    return {
      title: 'waiting hold data',
      request: null,
      header: {},
      body: 'hello elecV2P',
      bIsHide: true,
      bIsTheader: false,
    }
  },
  computed: {
    strheader: {
      get(){
        return JSON.stringify(this.header, null, 4)
      },
      set(value){
        try {
          this.header = JSON.parse(value)
        } catch {
          console.log('hold header string is not a json')
          this.$message.error('header 内容并不是正确的 JSON 格式', 10)
        }
      }
    }
  },
  created(){
    this.$wsrecv.add('hold', data => {
      if (data === 'over') {
        this.bIsHide = true
        this.request = null
        this.header  = {}
        this.body    = 'hello elecV2P'
      } else {
        this.title   = data.title
        this.request = data.request || null
        this.header  = data.header || {}
        this.body    = data.body
        this.bIsHide = false
      }
    })
  },
  methods: {
    holdDone(){
      const res = { header: this.header, body: this.body }
      if (this.request) {
        this.request.path = encodeURI(this.request.path)
        res.request = this.request
      }
      this.$wsrecv.send('hold', res)
      this.bIsHide = true
    },
    reject(){
      const res = {
        reject: true,
        header: this.header,
        body: this.body
      }
      this.$wsrecv.send('hold', res)
      this.bIsHide = true
    },
    headerDelete(h){
      this.$delete(this.header, h)
    }
  }
}
</script>

<style scoped>
.hold {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: auto;
  width: 1080px;
  max-width: 100%;
  background: var(--main-bk);
  border-radius: 8px;
  padding-bottom: 8px;
  z-index: 999;
}

.hold_edit {
  display: flex;
  justify-content: space-around;
}

.hold_request {
  height: 120px;
  margin-bottom: 1em;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.hold_request_flex {
  display: flex;
  justify-content: space-between;
}

.hold_left {
  width: 50%;
}

.hold_header, .hold_request {
  width: 100%;
}

.hold_body {
  display: flex;
  flex-direction: column;
  width: 49%;
}

.hold_left, .hold_header, .hold_body {
  max-height: 78vh;
  overflow: hidden auto;
  box-sizing: border-box;
}

.hold_header, .hold_body, .hold_request {
  border: 1px solid var(--main-cl);
  border-radius: 8px;
  padding: 0px 8px;
}

.hostname_input {
  width: 180px;
}

.port_input {
  min-width: 80px;
  width: 80px;
}

.path_input {
  width: 386px;
  max-width: 86%;
}

.hold_title {
  color: var(--main-fc);
  font-size: 22px;
  text-align: center;
  margin: 4px 0;
}

.header_item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  box-sizing: border-box;
}

.header_label {
  color: var(--main-fc);
  font-size: 18px;
  height: 42px;
  line-height: 42px;
  word-break: break-all;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.header_input {
  text-align: center;
  max-width: 68%;
}

.header_select {
  width: 100px;
  min-width: 20%;
  padding: 6px;
}

.header_text {
  height: 390px;
  overflow: hidden auto;
}

.hold_bcont {
  display: flex;
  justify-content: space-around;
}

.hold_button {
  width: 60%;
  margin: 10px 1em 0;
  font-size: 22px;
}

.button_delete {
  opacity: 0;
  cursor: pointer;
  width: 20px;
  text-align: center;
  margin: auto;
  padding: 0px 2px;
  border-radius: 8px;
  font-size: 26px;
  color: var(--main-fc);
  background-color: var(--delt-bk);
}

.button_delete:hover {
  opacity: 1;
}

.icon-interaction {
  float: right;
  color: var(--main-cl);
  margin-top: 6px;
  cursor: pointer;
}
</style>