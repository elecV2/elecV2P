<template>
  <div class="shell" :class="{ mini:bIsHide }">
    <span class="shell_hide" :class="{ 'shell_hide--close': !$wsrecv.connected }" @click="bIsHide=!bIsHide">{{ subnum }}</span>
    <div class="shelllogs" v-if="!bIsHide" @click="autoScroll=false">
      <div class="shell_status">
        <span class="shell_status_item">CLIENTS: {{ status.clients }}</span>
        <span class="shell_status_item">RSS: {{ status.rss }}</span>
        <span class="shell_status_item" v-show="status.rtimes">JSRUNTS: {{ status.rtimes }}</span>
      </div>
      <span class="loginfo_item" v-for="log in logs" v-html="logHtml(log)"></span>
    </div>
    <ul class="shellsub" v-if="!bIsHide">
      <li class="eflex w100 shellsub_item" v-for="(process, cid) in subprocess" :key="cid">
        <span class="shellsub_command" :title="cid">{{ subCommandAlign(process.command + ' %') }}</span>
        <input class="shellsub_input" type="text" v-model="process.subcommand"
          @keydown.enter.prevent.stop.exact="sendToSub(cid)"
          @keyup.up.prevent.stop.exact="hiupdownSub(cid, true)"
          @keyup.down.prevent.stop.exact="hiupdownSub(cid)"
          @keyup.esc.prevent.stop.exact="process.subcommand=''" />
        <span class="shellsub_close" @click="subProcessExit(cid)">X</span>
      </li>
    </ul>
    <div class="shellcommand" v-if="!bIsHide" @click="autoScroll=true">
      <textarea class="shellcommand_input" v-model="fullcommand"
        @keydown.enter.prevent.stop.exact="send"
        @keyup.up.prevent.stop.exact="hiupdown(true)"
        @keyup.down.prevent.stop.exact="hiupdown()"
        @keydown.ctrl.76.prevent.stop.exact="logs=[]"
        @keydown.36.prevent.stop.exact="moveCur(0, $event)"
        @keydown.ctrl.65.prevent.stop.exact="moveCur(0, $event)"
        @keydown.ctrl.69.prevent.stop.exact="moveCur(-1, $event)"
        @keyup.esc.prevent.stop.exact="command=''">
      </textarea>
    </div>
  </div>
</template>

<script>
  import { open, scrollBottom, focusOn } from '../utils/api'
  import { logHead, logHtml } from '../utils/string'

  export default {
    name: "minishell",
    data(){
      return {
        logs: [],
        command: 'node -v',
        cwd: '',
        bIsHide: true,
        status: {
          clients: 0,
          rss: 0,
          rtimes: 0,
        },
        history: {
          current: -1,
          lists:[]
        },
        autoScroll: true,
        subprocess: Object.create(null),
        subDelaySend: Object.create(null),
        tips: `快捷键：
- esc         // 清空当前输入命令
- ctrl + l    // 清空屏幕日志
- up/down     // 上下查找历史执行命令
- shift + tab // 移动光标到子进程交互输入框（如果存在的话
- 单击上方日志输出部分，停止自动滚动。单击下方命令输入部分，开启自动滚动

特殊指令：
- cls/clear   // 清空屏幕日志
- cwd         // 获取当前工作目录
- cd xxx      // 更改当前工作目录到xxx
- docs        // 打开 minishell 相关说明文档
- exit        // 最小化 minishell 界面（在子进程交互中输入时表示结束子进程`,
      }
    },
    computed: {
      cwdshow(){
        return this.cwd ? this.cwd.replace(/(\/|\\)$/, '').split(/\\|\//).pop() + '> ' : '> '
      },
      subnum(){
        return Object.keys(this.subprocess).length || ''
      },
      fullcommand: {
        get(){
          return this.cwdshow + this.command
        },
        set(val){
          this.command = val.replace(/[^>]*> /, '')
        }
      }
    },
    created(){
      this.logs.push(this.tips)
      this.$wsrecv.add('minishell', ms => {
        if (!ms.data) {
          console.debug('minishell recv', ms, 'expected ms.data')
          return
        }
        switch (ms.type) {
        case 'cwd':
          this.logs.push('cwd: ' + ms.data)
          this.cwd = ms.data
          break
        case 'shellinit':
          this.logs.push('cwd: ' + ms.data.cwd)
          this.cwd = ms.data.cwd
          if (ms.data.subprocess) {
            this.subprocess = ms.data.subprocess
          }
          break
        case 'subprocessexit':
          if (this.subDelaySend[ms.data]) {
            // 存在表示暂未添加
            console.debug('exit subprocess:', ms.data)
            clearTimeout(this.subDelaySend[ms.data])
            this.subDelaySend[ms.data] = null
            break
          }
          if (this.subprocess[ms.data]) {
            console.debug('exit subprocess:', ms.data, 'command:', this.subprocess[ms.data].command)
            this.$delete(this.subprocess, ms.data)
          } else {
            console.debug('subprocess: ' + ms.data + ' not exist yet')
          }
          break
        case 'subprocessadd':
          console.debug('run  subprocess:', ms.data.id, 'command:', ms.data.command)
          let { id, command } = ms.data
          this.subDelaySend[id] = setTimeout(()=>{
            // 子交互命令输入框延迟显示
            // 原因：有些命令不需要交互
            this.subDelaySend[id] = null
            this.$set(this.subprocess, id, {
              command: command,
              history: {
                current: -1,
                lists: []
              }
            })
          }, 800)
          break
        case 'elecV2Pstatus':
          this.status.clients = ms.data.clients
          this.status.rss = ms.data.memoryusage.rss
          break
        case 'jsrunstatus':
          this.status.rtimes = ms.data.total
          break
        default:
          if (/\x1b\[H/.test(ms.data)) {
            this.logs = [ms.data]
          } else if (/\r|(\x1b\[F)/.test(ms.data)) {
            this.logs.splice(-1, 1, ms.data)
          } else {
            this.logs.push(ms.data)
          }
        }
      })

      if(this.$wsrecv.connected) {
        this.$wsrecv.send('shell', 'init')
      }
      setTimeout(focusOn, 2000, '.shellcommand_input')
    },
    watch: {
      logs(val) {
        this.logBottom()
      },
      subprocess() {
        this.logBottom()
      },
    },
    methods: {
      logBottom(){
        if (this.autoScroll) {
          this.autoScroll = false
          setTimeout(()=>{
            scrollBottom('.shelllogs')
            this.autoScroll = true
          }, 200)
        }
      },
      logHtml,
      send(e){
        if(!this.$wsrecv.connected) {
          this.$message.error('websocket 尚未连接')
          this.logs.push(`[${this.$logHead('minishell  error')}][${this.$sTime(null, 1)}] websocket 尚未连接`)
          return
        }
        if (e.ctrlKey || e.shiftKey) return
        if (this.command) {
          this.command = this.command.trim()
          switch(this.command) {
          case 'exit':
            this.bIsHide = true
            break
          case 'clear':
          case 'CLEAR':
          case 'cls':
          case 'CLS':
            this.logs.splice(0)
            break
          case 'docs':
            open('https://github.com/elecV2/elecV2P-dei/blob/master/docs/Advanced.md')
            break
          default:
            const commandid = `${this.$wsrecv.id}_minishell_${this.history.lists.length}`
            this.$wsrecv.send('shell', {
              id: commandid,
              type: 'main',
              data: encodeURI(this.command),
            })
            this.logs.push(`[${this.$logHead('minishell notify')}][${this.$sTime(null, 1)}] running command: ${this.command}`)
          }
          this.history.lists.push(this.command)
          this.history.current = -1
          this.command = ''
        }
      },
      sendToSub(commandid){
        if (!commandid) {
          this.$message.error('a command id is expected')
          return
        }
        let subcommand = this.subprocess[commandid].subcommand
        if (!this.subprocess[commandid] || !subcommand) {
          this.$message.error('请先输入要执行的命令')
          return
        }
        this.subprocess[commandid].subcommand = ''
        this.$wsrecv.send('shell', {
          id: commandid,
          type: 'sub',
          data: encodeURI(subcommand),
        })
        if (!this.subprocess[commandid].history) {
          this.subprocess[commandid].history = {
            lists: [],
          }
        }
        this.subprocess[commandid].history.lists.push(subcommand)
        this.subprocess[commandid].history.current = -1
      },
      subProcessExit(commandid){
        this.$wsrecv.send('shell', {
          id: commandid,
          type: 'sub',
          data: 'exit',
        })
        this.$delete(this.subprocess, commandid)
      },
      hiupdown(up = false){
        // up/down history
        if (this.history.lists.length === 0) {
          return
        }
        if (up) {
          this.history.current--
          if (this.history.current < 0) {
            this.history.current = this.history.lists.length - 1
          }
        } else {
          this.history.current++
          if (this.history.current >= this.history.lists.length) {
            this.history.current = 0
          }
        }
        this.command = this.history.lists[this.history.current]
      },
      hiupdownSub(cid, up = false){
        let subp = this.subprocess[cid]
        if (!subp || !subp.history || subp.history.lists.length === 0) {
          return
        }
        if (up) {
          subp.history.current--
          if (subp.history.current < 0) {
            subp.history.current = subp.history.lists.length - 1
          }
        } else {
          subp.history.current++
          if (subp.history.current >= subp.history.lists.length) {
            subp.history.current = 0
          }
        }
        subp.subcommand = subp.history.lists[subp.history.current]
      },
      subCommandAlign(head) {
        return head.length < 32 ? head : logHead(head, 32)
      },
      moveCur(idx = 0, e){
        switch (idx) {
        case 0:
          const pos = e.target.value.indexOf('>') + 2;
          e.target.setSelectionRange(pos, pos);
          break;
        case -1:
        default:
          e.target.setSelectionRange(idx, idx);
        }
      },
    }
  }
</script>

<style scoped>
.shell {
  position: fixed;
  top: .5em;
  left: .9%;
  bottom: .5em;
  width: 98%;
  display: flex;
  flex-direction: column;
  z-index: 3;
}

.shell.mini {
  width: 48px;
  height: 32px;
  left: 98%;
  margin-left: -48px;
}

.shell_status {
  position: absolute;
  right: 48px;
  top: 0;
  background: var(--main-cl);
  border-radius: 1em;
  padding: 2px 1em;
  max-width: 100%;
}

.shell_status_item {
  margin: 0 8px;
}

.shell_hide {
  position: absolute;
  width: 48px;
  height: 32px;
  right: 0em;
  top: 0em;
  border: 4px solid var(--main-cl);
  box-sizing: border-box;
  text-align: center;
  border-radius: 1em;
  border-bottom: 6px solid var(--main-bk);
  cursor: pointer;
  color: var(--icon-bk);
  text-shadow: 0 0 var(--main-bk);
}

.shell_hide--close {
  border-bottom: 6px solid var(--note-bk);
}

.shelllogs {
  width: 100%;
  height: 78%;
  border: none;
  box-sizing: border-box;
  border-radius: var(--radius-bs) var(--radius-bs) 0 0;
  padding: 1.6em .6em 0;
  font-size: 18px;
  overflow: auto;
  scroll-behavior: smooth;
  background: #001529d8;
  color: var(--main-fc);
}

.shellcommand {
  height: 22%;
}

.shellsub {
  width: 100%;
  color: var(--icon-bk);
  background: var(--secd-fc);
}

.shellsub_item {
  border-bottom: 1px solid var(--tras-bk);
}

.shellsub_command {
  white-space: nowrap;
  margin-left: .5em;
}

.shellsub_input {
  height: 1.4em;
  width: 100%;
  grid-row: 1;
  margin: 0 .4em 0;
  padding: 0;
  padding-left: .3em;
  text-align: left;
  border: none;
  border-radius: .5em;
  background: transparent;
  font-size: 1em;
  color: var(--main-cl);
}

.shellsub_close {
  padding: 0 .5em;
  cursor: pointer;
  color: var(--note-bk);
  opacity: .3;
}

.shellsub_close:hover {
  opacity: 1;
}

.shellcommand_input {
  width: 100%;
  height: 100%;
  max-height: 260px;
  border: none;
  box-sizing: border-box;
  border-radius: 0 0 var(--radius-bs) var(--radius-bs);
  padding: 6px 8px;
  letter-spacing: 2px;
  font-size: 20px;
  font-family: var(--font-ms);
  background: var(--secd-bk);
  color: var(--main-fc);
}

.loginfo_item {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-ms);
}
</style>