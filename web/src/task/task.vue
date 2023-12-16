<template>
  <section @keydown.ctrl.83.prevent.stop.exact="taskSave()">
    <header class="header">{{ $ta('timed', 'task') }}</header>
    <main class="content" @click="menu={}" @keyup.esc.prevent.stop.exact="menu={};taskChecked='none'">
      <contextmenu :menus="menu.list" :pos="menu.pos" />
      <movegroup :show="show" :gpoptions="gnamelist" @choose="taskMoveToGroup($event)" />
      <div class="etable"><table class="elecTable">
        <caption class="elecTable_caption">
          <input class="elecTable_input elecTable_input--caption" :class="{ eopacity: search }" v-model="search" :placeholder="$ta('search', 'task')" title="输入名称/时间/任务内容中的关键字进行过滤显示" @keyup.esc.prevent.stop.exact="search=''">
          <span>{{ $ta('task', 'list') }} - {{ taskstatus }}</span>
          <span @click="taskInit()" class="icon icon_caption--sync" title="刷新当前任务列表" v-html="icon.sync"></span>
        </caption>
        <thead>
          <tr>
            <th class="elecTable_th elecTable_th--check" :title="$ta('checkall', '/', 'checknone')">
              <input type="checkbox" class="echeckbox" @change="taskCkall($event)">
            </th>
            <th class="elecTable_th elecTable_th--name">{{ $t('name') }}</th>
            <th colspan="2" class="elecTable_th task_time">{{ $t('time') }}</th>
            <th colspan="2" class="elecTable_th minw600" title="enter: 开始定时任务
ctrl+enter: 测试运行任务
alt +enter: 查看任务日志">{{ $t('task') }}</th>
            <th class="elecTable_th minw62" :title="$t('status')">{{ $t('status_short') }}</th>
            <th colspan="2" class="elecTable_th elecTable_cell100" :title="$t('operate')">{{ $t('operate_short') }}</th>
          </tr>
        </thead>
        <tbody v-for="(tlist, gid) in grouplist" :key="gid" :class="{ 'elecTable_group': gid !== 'normal', 'elecTable_group--bottom': gid !== 'normal' }" :style="{ background: tasklists[gid] && tasklists[gid].bkcolor }" @keydown.alt.enter.prevent.exact="taskLog($event)" @keydown.ctrl.enter.prevent.exact="taskTest($event)" @keyup.enter.prevent.exact="taskStartDelegate($event)" tabindex="-1">
          <tr v-if="gid !== 'normal'">
            <td class="elecTable_td">
              <input type="checkbox" @change="taskGroupCheck(gid, $event)" class="echeckbox">
            </td>
            <td class="elecTable_td">
              <input v-model.trim="tasklists[gid].name" class="elecTable_input" :placeholder="'id: ' + gid">
            </td>
            <td class="elecTable_td" colspan="5">
              <div class="eflex w100">
                <input type="text" v-model.trim="tasklists[gid].note" class="elecTable_input" placeholder="分组备注说明（可省略">
                <input class="elecTable_input elecTable_cell100 elecBtn--mleft" v-model.trim.lazy="tasklists[gid].bkcolor" placeholder="背景色" title="当前分组背景颜色/图片">
                <span class="elecBtn elecBtn--mleft elecBtn--uncheck">{{ tasklists[gid].active }}/{{ tasklists[gid].total }}</span>
              </div>
            </td>
            <td colspan="2" class="elecTable_td elecTable_cell100">
              <span v-show="tasklists[gid].collapse" class="icon--op" @click="taskGroupOp(gid)" v-html="icon.downcircle"></span>
              <span v-show="!tasklists[gid].collapse" class="icon--op" @click="taskGroupOp(gid)" v-html="icon.upcircle"></span>
              <span class="icon--op" @click="taskGroupDelete(gid)" v-html="icon.delete"></span>
            </td>
          </tr>
          <tr v-for="(titem, tid) in tlist" :key="tid" :class="{ 'elecTable_tr--disabled': !titem.running, 'elecTable_tr--selected': taskChecked[tid] }">
            <td class="elecTable_td"><input type="checkbox" :value="tid" v-model="taskChecklist" class="echeckbox"></td>
            <td class="elecTable_td">
              <input v-model.trim="titem.name" class="elecTable_input" :data-tid="tid" :placeholder="'id: ' + titem.id">
            </td>
            <td class="elecTable_td">
              <select v-model="titem.type" class="elecTable_select">
                <option value="cron">{{ type_of_time.cron }}</option>
                <option value="schedule">{{ type_of_time.schedule }}</option>
              </select>
            </td>
            <td class="elecTable_td">
              <input v-model.trim="titem.time" class="elecTable_input" :data-tid="tid">
            </td>
            <td class="elecTable_td task_select">
              <select v-model="titem.job.type" class="elecTable_select" @change="titem.job.type === 'exec' ? titem.job.target = 'node -v' : ''">
                <option v-for='(value, key) in jobtype_select' :key="key" :value="key">{{ value }}</option>
              </select>
            </td>
            <td class="elecTable_td">
              <select v-if="/^task/.test(titem.job.type)" v-model.trim="titem.job.target" class="elecTable_select">
                <option v-for='(item, key) in normlist' :key="key" :value="key">{{ item.name }}</option>
              </select>
              <input v-else :data-tid="tid" v-model.trim="titem.job.target" class="elecTable_input">
            </td>
            <td class="elecTable_td" @click.prevent.stop="taskMenu($event, tid)" @contextmenu.prevent.stop="taskMenu($event, tid)">
              <span v-show="titem.running" class="icon--op icon--run" v-html="icon.sync"></span>
              <span v-show="!titem.running" class='icon--op' v-html="icon.pause"></span>
            </td>
            <td colspan="2" class="elecTable_td elecTable_cell100">
              <span v-show="titem.running" class='icon--op' @click='taskStop(tid)' v-html="icon.pause"></span>
              <span v-show="!titem.running" class='icon--op' @click='taskStart(tid)' v-html="icon.play"></span>
              <span class='icon--op' @click='taskDelete(tid)' v-html="icon.delete"></span>
            </td>
          </tr>
        </tbody>
        <tbody>
          <tr>
            <td colspan="9" class="center border_top1">
              <span class="elecTable_addbtn" @click="taskNew()">{{ $ta('new', 'timed', 'task') }}</span>
              <span class="elecTable_addbtn" @click="subNew()">{{ $ta('add', 'task', 'sub') }}</span>
              <span class="elecTable_addbtn folderbk" @click="taskImport()">{{ $ta('import', 'local', 'sub') }}</span>
              <span class="elecTable_addbtn" :class="{ 'elecTable_addbtn--selected': subeishow===1 }" @click="taskExport()">{{ $t('export') }}{{ taskChecklist.length ? $ta('', 'checked', 'task') : $ta('', 'task', 'list') }}</span>
              <span class="elecTable_addbtn" @click="jsUpdate()" title="更新会覆盖本地同名文件">{{ $ta('update', 'remote', 'script') }}</span>
            </td>
          </tr>
          <tr v-show="taskChecklist.length">
            <td colspan="9" class="center">
              <span class="elecTable_addbtn elecTable_addbtn--check" @click="show.groupchoose=true">{{ $ta('moveto', 'agroup') }}</span>
              <span class="elecTable_addbtn elecTable_addbtn--uncheck" @click="taskCkall($event)">{{ $ta('cancel', 'checked', 'task') }}</span>
              <span class="elecTable_addbtn greenbk" @click="taskStart(taskChecklist)">{{ $ta('start', 'checked', 'task') }}</span>
              <span class="elecTable_addbtn elecTable_addbtn--stop" @click="taskStop(taskChecklist)">{{ $ta('stop', 'checked', 'task') }}</span>
              <span class="elecTable_addbtn elecTable_addbtn--clear" @click="taskDelete(taskChecklist)">{{ $ta('delete', 'checked', 'task') }} {{ taskChecklist.length }}</span>
            </td>
          </tr>
        </tbody>
        <tbody>
          <tr v-for="(titem, tid, idx) in sublist" :key="tid" :class="{ 'elecTable_tr--selected': subimport.tid===tid }">
            <td class="elecTable_td"><input type="checkbox" @change="tasksubCheck(tid, $event)" class="echeckbox"></td>
            <td class="elecTable_td">
              <input class="elecTable_input" v-model="titem.name" placeholder="订阅名称">
            </td>
            <td class="elecTable_td" title="自动更新订阅任务" :class="{ 'greenbk': titem.update_type!=='none' }">
              <select v-model="titem.update_type" class="elecTable_select">
                <option value="none">{{ type_of_time.noupdate }}</option>
                <option value="cron">{{ type_of_time.cron }}</option>
                <option value="schedule">{{ type_of_time.schedule }}</option>
              </select>
            </td>
            <td class="elecTable_td" :class="{ 'greenbk': titem.update_type!=='none' }">
              <input v-model.trim="titem.time" class="elecTable_input" :data-tid="tid" placeholder="自动更新时间">
            </td>
            <td class="elecTable_td" title="同名任务更新方式">
              <select v-model="titem.job.type" class="elecTable_select">
                <option v-for='(value, key) in subselect' :key="key" :value="key">{{ value }}</option>
              </select>
            </td>
            <td class="elecTable_td">
              <input class="elecTable_input" v-model="titem.job.target" placeholder="订阅链接，不兼容其他软件的订阅格式。请勿添加不信任的来源链接">
            </td>
            <td colspan="2" class="elecTable_td">
              <button class="elecBtn" @click="subGet(titem.job.target, tid)">{{ $t('fetch') }}</button>
            </td>
            <td class="elecTable_td minw62">
              <span class="icon--op" @click="subDelete(tid)" v-html="icon.delete"></span>
            </td>
          </tr>
        </tbody>
        <tbody class="border_top" v-show="subeishow === 1">
          <tr>
            <td colspan="6" class="elecTable_td">
              <div class="subdetail_head">
                <label class="subdetail_label">{{ $ta('sub', 'name') }}: </label>
                <input class="elecTable_input subdetail_name" v-model.lazy.trim="subexport.name" placeholder="elecV2P 定时任务订阅">
                <label class="subdetail_label">{{ $ta('sub', 'note') }}: </label>
                <input class="elecTable_input subdetail_note" v-model.lazy.trim="subexport.note" placeholder="这是一个适用于 elecV2P 的定时任务订阅。请不要添加未知来源的订阅">
              </div>
            </td>
            <td colspan="3" class="elecTable_td">
              <button @click="taskExportDownload()" class="elecBtn greenbk">{{ $t('exportsub') }}</button>
            </td>
          </tr>
          <tr>
            <td colspan="9" class="elecTable_td">
              <textarea class="editor_textarea subdetail_content" v-model.lazy.trim="subexportstr" placeholder='订阅内容格式如下: 
{
  name: "订阅名称",
  note: "订阅描述，可省略。不兼容其他软件的订阅格式。详细说明参考: https://github.com/elecV2/elecV2P-dei/tree/master/docs/06-task.md",
  list: [
    {
      "name": "清空日志",
      "type": "cron",
      "time": "30 59 23 * * *",
      "job": {
        "type": "runjs",
        "target": "https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/deletelog.js"
      }
    }
  ]
}'></textarea>
            </td>
          </tr>
        </tbody>
        <tbody class="border_top" v-show="subeishow === 2">
          <tr>
            <td colspan="6" class="elecTable_td">
              <div class="subdetail_head">
                <label class="subdetail_label">{{ $ta('sub', 'name') }}: </label>
                <input class="elecTable_input subdetail_name" v-model.trim="subimport.name" placeholder="elecV2P 定时任务订阅">
                <label class="subdetail_label">{{ $ta('sub', 'note') }}: </label>
                <input class="elecTable_input subdetail_note" v-model.lazy.trim="subimport.note" placeholder="elecV2P 定时任务订阅。请不要添加未知来源的订阅">
              </div>
            </td>
            <td colspan="2" class="elecTable_td" title="绿色背景: 任务添加时即开始定时">
              <button @click="subAll()" class="elecBtn greenbk">{{ tasksubChecklist.length ? $ta('add', 'checked_short') : $ta('add', 'all') }}</button>
            </td>
            <td class="elecTable_td minw62">
              <span class="icon--op" @click="subClear()" v-html="icon.delete"></span>
            </td>
          </tr>
          <tr v-for="(titem, ind) in subimport.list" :key="ind" :class="{ 'elecTable_tr--selected': tasksubChecklist.indexOf(ind) !== -1 }">
            <td class="elecTable_td"><input type="checkbox" :value="ind" v-model="tasksubChecklist" class="echeckbox"></td>
            <td class="elecTable_td"><input v-model.lazy.trim="titem.name" class="elecTable_input"></td>
            <td class="elecTable_td">
              <select v-model="titem.type" class="elecTable_select" @change="titem.time = titem.type === 'cron' ? '30 10 0 * * *' : titem.type === 'schedule' ? '3 2 3 2' : ''">
                <option value="cron">{{ type_of_time.cron }}</option>
                <option value="schedule">{{ type_of_time.schedule }}</option>
              </select>
            </td>
            <td class="elecTable_td">
              <input v-model.lazy.trim="titem.time" class="elecTable_input">
            </td>
            <td class="elecTable_td task_select">
              <select v-model="titem.job.type" class="elecTable_select">
                <option v-for='(value, key) in jobtype_select' :key="key" :value="key">{{ value }}</option>
              </select>
            </td>
            <td class="elecTable_td">
              <input v-model.lazy.trim="titem.job.target" class="elecTable_input">
            </td>
            <td colspan="3" class="elecTable_td" :class="{ 'greenbk': titem.running!==false }">
              <button class="elecBtn" @click.prevent="subTaskAdd(titem)">{{ $t('add', 'task') }}</button>
            </td>
          </tr>
          <tr v-show="(subimport.author || subimport.date || subimport.resource)">
            <td colspan="9" class="elecTable_td elecTable_td--subinfo">
              <span class="">{{ subimport.author ? $t('author') + ': ' + subimport.author : '' }}</span>
              <span class="mleft30">{{ subimport.date ? $ta('update', 'date') + ': ' + subimport.date : '' }}</span>
              <span class="mleft30">{{ subimport.resource ? $ta('update', 'address') + ': ' + subimport.resource : '' }}</span>
            </td>
          </tr>
        </tbody>
      </table></div>
      <p class="center">
        <button class="elecBtn elecBtn--long elecBtn--tasksave" @click="taskSave()">{{ $t('save') }}</button>
      </p>

      <log :logs="logs" :title="tasklogs" :collapse="collapse" />
    </main>
    <footer class="footer">
      <ul>
        <li><strong>{{ type_of_time.cron }}</strong> {{ $t('format').toLowerCase() }}: (*) * * * * *（{{ $ta('five', 'or', 'six', 'cron', 'format').toLowerCase() }}）</li>
        <li><strong>{{ type_of_time.schedule }}</strong> {{ $t('format').toLowerCase() }}: 30 999 3 2（{{ $ta('countdown', 'seconds', '/', 'repeat', 'times', '/', 'random', 'seconds', '/', 'random', 'times') }}）<i>{{ $ta('last_three', 'optional') }}</i></li>
        <li>{{ $ta('task', 'input', 'shortcut') }}: enter - {{ $ta('start', 'task') }} ctrl+enter - {{ $ta('test', 'run', 'task') }} alt+enter - {{ $ta('open', 'task', 'run', 'logs') }}</li>
        <li>{{ $ta('more', 'detail') }} <a href="https://github.com/elecV2/elecV2P-dei/tree/master/docs/06-task.md" target="elecV2PDoc">{{ $t('document') }}: 06-task.md</a></li>
      </ul>
    </footer>
  </section>
</template>

<script>
import movegroup from './movegroup.vue'
import log from '../utils/log.vue'
import icon from '../utils/icon.js'
import contextmenu from '../utils/contextmenu.vue'

export default {
  name: "task",
  data(){
    return {
      tasklists: {},
      subexport: {},
      subimport: {},
      taskimorn: false,
      taskimtid: '',
      subeishow: 0,      // 1: sub export, 2: sub import
      taskstatus: '',
      jobtype_select: {
        runjs: this.$t('run') + ' JS',
        exec: 'SHELL ' + this.$t('cmd'),
        taskstart: this.$ta('start', 'task'),
        taskstop: this.$ta('stop', '', 'task'),
      },
      subselect: {
        skip: this.$t('skip'),
        replace: this.$t('replace'),
        addition: this.$t('addition'),
      },
      type_of_time: {
        cron: this.$t('cron'),
        schedule: this.$t('countdown'),
        noupdate: this.$t('noupdate'),
      },
      logs: [],
      icon,
      taskChecklist: [],
      tasksubChecklist: [],
      menu: {
        pos: [0, 0],
        list: []
      },
      show: {
        groupchoose: false
      },
      search: '',
      collapse: {
        loginfo: true
      },
      tasklogs: this.$ta('task', 'run', 'logs'),
    }
  },
  components: {
    log, contextmenu, movegroup
  },
  computed: {
    normlist(){
      let rlist = {}
      for (let t in this.tasklists) {
        if (this.tasklists[t]) {
          switch(this.tasklists[t].type) {
          case 'cron':
          case 'schedule':
            rlist[t] = this.tasklists[t]
            break
          }
        }
      }
      return rlist
    },
    tnamelist(){
      let tname = {}
      for (let tid in this.normlist) {
        tname[this.normlist[tid].name] = tid
      }
      return tname
    },
    gnamelist(){
      let gname = {}
      for (let tid in this.tasklists) {
        if (this.tasklists[tid].type === 'group') {
          gname[tid] = this.tasklists[tid].name
        }
      }
      return gname
    },
    sublist(){
      let rlist = {}
      for (let t in this.tasklists) {
        if (this.tasklists[t].type === 'sub') {
          rlist[t] = this.tasklists[t]
        }
      }
      return rlist
    },
    searchlist(){
      if (!this.search) {
        return this.tasklists;
      }
      let slist = {}, searchreg = new RegExp(this.search);
      for (let t in this.normlist) {
        // 有搜索时取消分组
        if (searchreg.test(this.normlist[t].name + this.normlist[t].time + this.normlist[t].job.target)) {
          slist[t] = this.normlist[t];
        }
      }
      return slist;
    },
    grouplist(){
      let glist = {}, normal = {}
      let status = {
        running: 0,
        total: 0,
        sub: Object.keys(this.sublist).length
      }
      for (let t in this.searchlist) {
        if (this.searchlist[t].type === 'sub') {
          if (!this.searchlist[t].update_type) {
            this.searchlist[t].update_type = 'none'
          }
          continue;
        }
        if (this.searchlist[t].type === 'group') {
          if (!glist[t]) {
            glist[t] = {}
            this.searchlist[t].total = 0
            this.searchlist[t].active = 0
            if (!this.searchlist[t].bkcolor) {
              this.searchlist[t].bkcolor = this.$uStr.randomColor({ max: 200 })
            }
            if (this.searchlist[t].collapse === undefined) {
              this.searchlist[t].collapse = false
            }
          }
          continue
        }
        status.total++
        if (this.searchlist[t].running) {
          status.running++
        }
        let gid = this.searchlist[t].group
        if (gid && this.searchlist[gid] && this.searchlist[gid].type === 'group') {
          if (!glist[gid]) {
            glist[gid] = {}
            this.searchlist[gid].total = 0
            this.searchlist[gid].active = 0
            if (!this.searchlist[gid].bkcolor) {
              this.searchlist[gid].bkcolor = this.$uStr.randomColor({ max: 200 })
            }
            if (this.searchlist[gid].collapse === undefined) {
              this.searchlist[gid].collapse = false
            }
          }
          if (!this.searchlist[gid].collapse) {
            glist[gid][t] = this.searchlist[t]
          }
          this.searchlist[gid].total++
          if (this.searchlist[t].running) {
            this.searchlist[gid].active++
          }
        } else {
          normal[t] = this.searchlist[t]
        }
      }
      this.taskstatus = status.running + '/' + status.total + '/' + status.sub
      glist.normal = normal
      return glist
    },
    subexportstr: {
      get(){
        return JSON.stringify(this.subexport, null, 2)
      },
      set(val){
        let obj = this.$sJson(val)
        if (obj) {
          Object.assign(this.subexport, obj)
        } else {
          this.$message.error('订阅内容格式不正确, 已自动退回到修改前内容', 10)
        }
      }
    },
    taskChecked: {
      get(){
        let clist = []
        this.taskChecklist.forEach(idx=>{
          clist[idx] = true
        })
        return clist
      },
      set(val){
        if (val === 'all') {
          this.taskChecklist = Object.keys(this.search ? this.searchlist : this.normlist);
        } else if (val === 'none') {
          this.taskChecklist = []
        } else if (this.normlist[val] && this.taskChecklist.indexOf(val) === -1) {
          this.taskChecklist.push(val)
        }
      }
    }
  },
  watch: {
    taskimorn(val){
      if (val === false) {
        this.$delete(this.tasklists, 'localtemp')
      } else {
        this.taskimtid = Object.keys(this.sublist)[0]
      }
    }
  },
  created(){
    this.taskInit()

    let wserr = this.$wsrecv.add('tasklog', data => {
      if (this.logs.length >= 200 || /\x1b\[H/.test(data)) {
        this.logs = [data]
      } else if (/\r|(\x1b\[F)/.test(data)) {
        this.logs.splice(0, 1, data)
      } else {
        this.logs.unshift(data)
      }
    })

    if (wserr) {
      this.logs.unshift(`[${this.$logHead('websocket error')}][${this.$sTime(null, 1)}] ${wserr}, 日志无法传输`)
    }

    this.$wsrecv.add('task', data => {
      if (data.op === 'init') {
        this.taskInit()
        return
      }
      if (!this.tasklists[data.tid]) {
        if (data.tid && data.taskinfo && this.taskCheck(data.taskinfo)) {
          this.tasklists[data.tid] = data.taskinfo
        } else {
          console.error('任务暂不存在', data)
        }
        return
      }
      switch (data.op) {
      case 'start':
        this.$set(this.tasklists[data.tid], 'running', true)
        break
      case 'stop':
        this.$set(this.tasklists[data.tid], 'running', false)
        break
      default:
        console.error('unknow task operation')
      }
    })
  },
  methods: {
    taskInit(){
      const hideloading = this.$message.loading('获取任务列表中...', 0)
      this.$axios.get('/task').then(res=>{
        if (res.data.rescode === -1) {
          this.$message.error('获取任务列表失败', res.data.message)
          this.logs.unshift(`[${this.$logHead('taskInit info')}][${this.$sTime(null, 1)}] 获取任务列表失败: ${res.data.message}`)
          return
        }
        this.tasklists = res.data || {}
        this.subexport = {}
        this.subimport = {}
        this.subeishow = 0
        console.debug(`[${this.$logHead('taskInit info')}][${this.$sTime(null, 1)}]`, '当前 elecV2P 任务分组数', Object.keys(this.grouplist).length - 1);   // 更新 this.taskstatus
        this.$message.success('成功获取任务列表', this.taskstatus)
        this.logs.unshift(`[${this.$logHead('taskInit info')}][${this.$sTime(null, 1)}] 成功获取任务列表: ${this.taskstatus}`)
      }).catch(e=>{
        this.$message.error('获取任务列表失败', e.message)
        this.logs.unshift(`[${this.$logHead('taskInit error')}][${this.$sTime(null, 1)}] 获取任务列表失败: ${e.message}`)
        console.error('获取任务列表失败', e)
      }).finally(hideloading)
    },
    taskNewId(len = 8) {
      // 获取一个随机字符，默认长度为 8, 可自定义
      let str = this.$uStr.euid(len)
      if (this.tasklists[str]) {
        return this.taskNewId()
      } else {
        return str
      }
    },
    taskNew(tid = this.taskNewId()){
      let rand = {}, rjob = {}
      if (Math.random() > 0.6) {
        rand.type = 'schedule'
        rand.time = '3 2 2'
      } else {
        rand.type = 'cron'
        rand.time = '20 10 0 * * *'
      }
      if (Math.random() < 0.5) {
        rjob.type = 'runjs'
        rjob.target = 'test.js'
      } else {
        rjob.type = 'exec'
        rjob.target = 'node -v'
      }
      this.$set(this.tasklists, tid, {
        id: tid,
        name: this.$ta('new', 'task') + (Object.keys(this.normlist).length + 1),
        type: rand.type,
        time: rand.time,
        job: rjob,
        running: false
      })
    },
    taskCheck(titem){
      if (!titem) {
        this.$message.error('请输入任务内容')
        this.logs.unshift(`[${this.$logHead('taskAdd error')}][${this.$sTime(null, 1)}] 没有任何任务信息`)
        return false
      }
      if (!titem.name) {
        this.$message.error('请输入任务名')
        this.logs.unshift(`[${this.$logHead('taskAdd error')}][${this.$sTime(null, 1)}] 没有任务名称`)
        return false
      }
      if (!/schedule|cron/.test(titem.type)) {
        this.$message.error('非法任务类型', titem.type)
        this.logs.unshift(`[${this.$logHead('taskAdd error')}][${this.$sTime(null, 1)}] ${titem.name} 任务类型 ${titem.type} 有误`)
        return false
      }
      let ftime = titem.time.split(' ')
      if (titem.type === 'cron' && !(ftime.length === 5 || ftime.length === 6)) {
        this.$message.error(titem.time, '不符合 cron 时间格式标准')
        this.logs.unshift(`[${this.$logHead('taskAdd error')}][${this.$sTime(null, 1)}] ${titem.name} 时间: ${titem.time} 不符合 cron 时间格式标准`)
        return false
      }
      if (titem.type === 'schedule' && ftime.filter(t=>/^\d+$/.test(t)).length !== ftime.length ) {
        this.$message.error(titem.time, '不符合', this.type_of_time.schedule, '时间格式标准')
        this.logs.unshift(`[${this.$logHead('taskAdd error')}][${this.$sTime(null, 1)}] ${titem.name} 时间: ${titem.time} 不符合 ${this.type_of_time.schedule} 时间格式标准`)
        return false
      }
      if (!(titem.job && titem.job.type && titem.job.target)) {
        this.$message.error('任务内容填写不完整')
        this.logs.unshift(`[${this.$logHead('taskAdd error')}][${this.$sTime(null, 1)}] ${titem.name} 任务内容填写不完整`)
        return false
      }
      return true
    },
    taskStart(tid){
      let bArr = this.$sType(tid) === 'array', taskinfo
      if (bArr) {
        taskinfo = []
        tid.forEach(tid=>{
          if (!this.taskCheck(this.tasklists[tid])) {
            return
          }
          this.tasklists[tid].id = tid
          this.tasklists[tid].running = true
          taskinfo.push(this.tasklists[tid])
        })
      } else {
        if (!this.taskCheck(this.tasklists[tid])) {
          return
        }
        if (this.tasklists[tid].running) {
          this.$message.error(this.tasklists[tid].name, '正在运行中')
          return
        }
        this.tasklists[tid].id = tid
        this.tasklists[tid].running = true
        taskinfo = this.tasklists[tid]
      }
      let fail = false
      const hideloading = this.$message.loading('任务上传准备执行中...', 0)
      this.$axios.put('/task', {
        op: 'start',
        data: {
          task: taskinfo
        }
      }).then(res=>{
        if (res.data.rescode === 0) {
          this.$message.success('定时任务已开始')
        } else {
          fail = res.data.message
        }
      }).catch(e=>{
        console.error(e)
        fail = e.message
      }).finally(()=>{
        hideloading()
        if (fail) {
          if (!bArr) {
            this.tasklists[tid].running = false
          }
          this.$message.error('开始任务失败')
          this.logs.unshift(`[${this.$logHead('taskStart error')}][${this.$sTime(null, 1)}] 开始任务执行失败: ${fail}`)
        }
      })
    },
    taskStop(tid){
      let bArr = this.$sType(tid) === 'array'
      if (!bArr) {
        if (this.tasklists[tid].running === false) {
          this.$message.success(this.tasklists[tid].name, '已停止，无需任何操作')
          return
        }
        this.tasklists[tid].running = false
      }
      let fail = false
      const hideloading = this.$message.loading('任务停止命令执行中...', 0)
      this.$axios.put('/task', { op: 'stop', data: { tid }}).then(res=>{
        if (res.data.rescode === 0) {
          this.$message.success('相关定时任务已停止')
        } else {
          fail = res.data.message
        }
      }).catch(e=>{
        fail = e.message
        console.error(e)
      }).finally(()=>{
        hideloading()
        if (fail) {
          if (!bArr) {
            this.tasklists[tid].running = true
          }
          this.$message.error('停止任务失败')
          this.logs.unshift(`[${this.$logHead('taskStop error')}][${this.$sTime(null, 1)}] 停止任务失败: ${fail}`)          
        }
      })
    },
    taskDelete(tid){
      if (this.$sType(tid) === 'array') {
        if (confirm(`确定删除这 ${tid.length} 个定时任务？`)) {
          const hideloading = this.$message.loading('定时任务批量删除中...', 0)
          this.$axios.put('/task', { op: 'delete', data: { tid }}).then(res=>{
            if (res.data.rescode === 0) {
              this.$message.success('定时任务批量删除完成')
              tid.forEach(id=>this.$delete(this.tasklists, id))
              this.logs.unshift(`[${this.$logHead('taskDelete info')}][${this.$sTime(null, 1)}] 定时任务批量删除完成`)
              this.taskChecked = 'none'
            } else {
              this.$message.error('定时任务批量删除失败')
              this.logs.unshift(`[${this.$logHead('taskDelete error')}][${this.$sTime(null, 1)}] 定时任务批量删除失败 ${res.data.message}`)
            }
          }).catch(e=>{
            this.$message.error('定时任务批量删除失败', e.message)
            this.logs.unshift(`[${this.$logHead('taskDelete error')}][${this.$sTime(null, 1)}] 定时任务批量删除: ${e.message}`)
            console.error(e)
          }).finally(hideloading)
        }
      } else if (confirm(`确定删除任务 ${this.tasklists[tid].name}？`)) {
        const hideloading = this.$message.loading('定时任务', this.tasklists[tid].name, '删除中...', 0)
        this.$axios.put('/task', { op: 'delete', data: { tid }}).then(res=>{
          if (res.data.rescode === 0) {
            this.$message.success('成功删除任务:', this.tasklists[tid].name)
            this.logs.unshift(`[${this.$logHead('taskDelete info')}][${this.$sTime(null, 1)}] 成功删除任务: ${this.tasklists[tid].name}`)
            this.$delete(this.tasklists, tid)
          } else {
            this.$message.error('任务:', this.tasklists[tid].name, '删除失败')
            this.logs.unshift(`[${this.$logHead('taskDelete error')}][${this.$sTime(null, 1)}] 任务: ${this.tasklists[tid].name} 删除失败 ${res.data.message}`)
          }
        }).catch(e=>{
          this.$message.error('删除任务失败', e.message)
          this.logs.unshift(`[${this.$logHead('taskDelete error')}][${this.$sTime(null, 1)}] 删除任务失败: ${e.message}`)
          console.error(e)
        }).finally(hideloading)
      }
    },
    taskSave(){
      this.search = '';
      const hideloading = this.$message.loading('正在保存当前任务列表...', 0)
      this.$axios.post('/task', this.tasklists).then(res=>{
        if (res.data.rescode === -1) {
          this.$message.error('当前任务列表保存失败')
          this.logs.unshift(`[${this.$logHead('taskSave error')}][${this.$sTime(null, 1)}] 当前任务列表保存失败：${res.data.message}`)
        } else {
          this.$message.success('当前任务列表已保存', this.taskstatus)
          this.logs.unshift(`[${this.$logHead('taskSave info')}][${this.$sTime(null, 1)}] 当前任务列表已保存 ${this.taskstatus}，将在 elecV2P 下次启动时自动恢复`)
        }
      }).catch(e=>{
        console.error(e)
        this.$message.error('当前任务列表保存失败', e.message)
        this.logs.unshift(`[${this.$logHead('taskSave error')}][${this.$sTime(null, 1)}] 当前任务列表保存失败：${e.message}`)
      }).finally(hideloading)
    },
    taskStartDelegate(event){
      let tid = event.target.dataset.tid
      if (tid) {
        this.taskStart(tid)
      }
    },
    taskTest(event){
      let tid = event.target ? event.target.dataset.tid : event
      if (!tid) {
        return
      }
      if (!this.taskCheck(this.tasklists[tid])) {
        return
      }
      let orgstatus = this.tasklists[tid].running   // 保留任务的原始状态
      this.tasklists[tid].running = true
      const hideloading = this.$message.loading('任务测试运行中...', 0)
      this.logs.unshift(`[${this.$logHead('taskStart info')}][${this.$sTime(null, 1)}] 立即测试运行定时任务: ${this.tasklists[tid].name}`)
      this.collapse.loginfo = false
      this.$axios.put('/task', { op: 'test', data: { tid: 'totest', task: this.tasklists[tid] } }).then(res=>{
        let message = this.$sString(res.data.message) || '无'
        this.$message.success(this.tasklists[tid].name, '测试运行结果:', message)
        this.logs.unshift(`[${this.$logHead('taskTest info')}][${this.$sTime(null, 1)}] ${this.tasklists[tid].name} 测试运行结果: ${message}`)
      }).catch(e=>{
        console.error(e)
        this.$message.error(this.tasklists[tid].name, '测试运行失败', e.message)
        this.logs.unshift(`[${this.$logHead('taskTest error')}][${this.$sTime(null, 1)}] ${this.tasklists[tid].name} 测试运行失败: ${e.message}`)
      }).finally(()=>{
        hideloading()
        this.tasklists[tid].running = orgstatus
      })
    },
    taskLog(event){
      let tid = event.target ? event.target.dataset.tid : event
      if (!tid) {
        return
      }
      if (!this.tasklists[tid]) {
        this.$message.error('任务不存在')
        return
      }
      if (this.tasklists[tid].job.type === 'runjs') {
        if (/^https?:\/\/\S{4}/.test(this.tasklists[tid].job.target)) {
          this.$uApi.open(`./logs/${this.$uStr.surlName(this.tasklists[tid].job.target.split(' ')[0])}.log`)
        } else {
          this.$uApi.open(`./logs/${this.tasklists[tid].job.target.split(' ')[0].replace(/\/|\\/g, '-')}.log`)
        }
      } else if (this.tasklists[tid].job.type === 'exec') {
        this.$uApi.open(`./logs/${this.tasklists[tid].name}.task.log`)
      } else {
        this.$message.error('该任务类型不支持查看日志')
      }
    },
    subNew(tid = this.taskNewId()){
      this.$set(this.tasklists, tid, {
        name: this.$ta('task', 'sub') + (Object.keys(this.sublist).length + 1),
        type: "sub",
        update_type: "none",
        time: "26 5 * * *",
        job: {
          type: 'skip',
          target: ''
        }
      })
    },
    async subGet(url, tid) {
      if (!(url && /^https?:\/\/\S{4}|^\/?efss\//.test(url))) {
        this.$message.error('请输入正确的订阅地址', 6)
        return
      }
      if (!/\.json$/.test(url) && !confirm('该订阅内容可能并不是 JSON 格式，确认继续？')) {
        return
      }
      let hideloading = this.$message.loading('正在获取订阅信息...', 0)
      let res = ''
      try {
        res = await this.$axios.get(url, { crossdomain: true })
      } catch(e) {
        this.logs.unshift(`[${this.$logHead('taskSub error')}][${this.$sTime(null, 1)}] 获取订阅信息失败 ${e.message}`)
        if (e.response) {
          hideloading()
          this.$message.error(`获取订阅内容失败，服务器返回状态码 ${e.response.status}`)
          console.debug(`获取订阅内容失败，服务器返回状态码 ${e.response.status}`, e.response.data)
          return
        }
        if (/^https?:\/\/\S{4}/.test(url)) {
          this.logs.unshift(`[${this.$logHead('taskSub info')}][${this.$sTime(null, 1)}] 即将尝试从服务器端获取该订阅内容`)
          this.$message.error('获取订阅信息失败', e.message, '即将尝试从服务器端获取该订阅内容')
          try {
            res = await this.$axios.get('/data?type=stream&url=' + url)
          } catch(e) {
            hideloading()
            this.$message.error('获取订阅信息失败', e.message, '请检测网络后重试')
            this.logs.unshift(`[${this.$logHead('taskSub error')}][${this.$sTime(null, 1)}] 从 ${url} 获取订阅信息失败 ${e.message}，请检测网络后重试`)
            return
          }
        }
      }
      if (res.status !== 200 || res.data.rescode === -1) {
        hideloading()
        this.logs.unshift(`[${this.$logHead('taskSub error')}][${this.$sTime(null, 1)}] 该订阅链接 ${url} 返回结果有误 ${ this.$sString(res.data) } 请确认输入地址是否正确`)
        this.$message.error('该订阅返回状态不正确，请确认当前网络环境或输入地址是否正常')
        console.error(res)
        return
      }
      hideloading()
      let data = this.$sJson(res.data)
      if (data && data.name && data.list) {
        if (tid === 'localtemp') {
          tid = this.taskNewId()
          this.$set(this.tasklists, tid, this.tasklists['localtemp'])
        }
        data.tid = tid
        data.resource = data.resource || data.surl
        data.note = data.note || data.desc
        this.subimport = data
        this.taskimorn = false
        this.subeishow = 2
        this.$message.success('成功获取订阅信息')
        this.logs.unshift(`[${this.$logHead('taskSub info')}][${this.$sTime(null, 1)}] 成功获取订阅 ${data.name} 内容`)
        if (data.time && !this.sublist[tid].time) {
          this.sublist[tid].time = data.time
          this.sublist[tid].update_type = data.update_type || data.type || 'none'
        }
        if (this.sublist[tid].name === '定时任务订阅') {
          this.sublist[tid].name = data.name
        }
      } else {
        this.$message.error('该订阅内容无法解析')
        this.logs.unshift(`[${this.$logHead('taskSub error')}][${this.$sTime(null, 1)}] 该订阅 ${url} 内容并不符合 elecV2P 订阅格式，请确认订阅链接及内容无误后再次添加`)
      }
    },
    subDelete(tid) {
      if (this.subimport.tid === tid) {
        this.subeishow = 0
        this.subimport.tid = null
        return
      }
      if (!this.tasklists[tid].job.target || confirm('确定删除订阅：' + this.tasklists[tid].name + ' （并不会删除相关任务）')) {
        const hideloading = this.$message.loading(this.tasklists[tid].name, '删除中...', 0)
        this.$axios.put('/task', { op: 'delete', data: { tid }}).then(res=>{
          this.$message.success('成功删除订阅:', this.tasklists[tid].name)
          this.logs.unshift(`[${this.$logHead('taskSub info')}][${this.$sTime(null, 1)}] 成功删除订阅: ${this.tasklists[tid].name}`)
          this.$delete(this.tasklists, tid)
        }).catch(e=>{
          console.error(e)
          this.$message.error('删除订阅失败', e.message)
          this.logs.unshift(`[${this.$logHead('taskSub error')}][${this.$sTime(null, 1)}] 删除订阅失败 ${e.message}`)
        }).finally(hideloading)
      }
    },
    subClear(){
      this.subeishow = 0
      this.subimport.tid = null
      if (this.taskimorn) {
        this.taskimorn = false
      }
    },
    taskExport(){
      if (this.subeishow === 1) {
        this.subeishow = 0
        return
      }
      let exsub = {
        name: 'elecV2P 定时任务订阅',
        author: '留个名字',
        note: 'xx 导出的任务订阅。该订阅适用于 elecV2P，与其他软件并不兼容。相关说明参考：https://github.com/elecV2/elecV2P-dei/tree/master/docs/06-task.md',
        date: this.$sTime(),
        type: 'task',
        list: []
      }
      if (this.taskChecklist.length) {
        this.taskChecklist.forEach(tid=>{
          if (this.normlist[tid] && this.normlist[tid].name && this.normlist[tid].time && this.normlist[tid].job) {
            exsub.list.push({
              name: this.normlist[tid].name,
              type: this.normlist[tid].type,
              time: this.normlist[tid].time,
              running: this.normlist[tid].running,
              job: this.normlist[tid].job,
            })
          }
        })
      } else {
        for (let tid in this.normlist) {
          exsub.list.push({
            name: this.normlist[tid].name,
            type: this.normlist[tid].type,
            time: this.normlist[tid].time,
            running: this.normlist[tid].running,
            job: this.normlist[tid].job,
          })
        }
      }
      this.subimport = {}
      this.subexport = exsub
      this.subeishow = 1
      this.taskimorn = false
    },
    taskExportDownload(){
      if (this.subexport.name && this.subexport.list) {
        this.$uApi.saveAsFile(this.subexport, this.subexport.name + '.json')
        this.logs.unshift(`[${this.$logHead('taskExport info')}][${this.$sTime(null, 1)}] 成功导出订阅：${this.subexport.name}`)
      } else {
        this.$message.error('订阅信息不完整')
        this.logs.unshift(`[${this.$logHead('taskExport error')}][${this.$sTime(null, 1)}] 订阅导出失败，订阅信息填写不完整`)
      }
    },
    taskImport(){
      this.$uApi.getFile({ accept: '.json', type: 'text' }).then(file=>{
        let taskjson = file.content
        // console.debug(taskjson)
        let data = this.$sJson(taskjson)
        if (data && data.name && data.list) {
          data.resource = data.resource || data.surl
          data.note = data.note || data.desc
          this.subimport = data
          this.subimport.tid = 'local'
          this.subeishow = 2
          if (Object.keys(this.sublist).length === 0) {
            this.subNew('localtemp')
          }
          this.logs.unshift(`[${this.$logHead('taskImport info')}][${this.$sTime(null, 1)}] 成功获取本地订阅: ${data.name}`)
          this.taskimorn = true
          this.$message.success('成功获取本地订阅任务列表')
        } else {
          console.error('elecV2P 无法解析该订阅内容', taskjson)
          this.$message.error('该订阅内容无法解析')
          this.logs.unshift(`[${this.$logHead('taskImport error')}][${this.$sTime(null, 1)}] 导入的本地订阅内容并不符合 elecV2P 订阅格式，请尝试修改后再次添加\n${ this.$sString(taskjson).slice(-300) }`)
        }
      }).catch(error=>{
        this.subimport = {}
        console.debug(error)
      })
    },
    async jsUpdate(){
      let toupdate = []
      if (this.taskChecklist.length) {
        this.taskChecklist.forEach(tid=>{
          if (this.tasklists[tid] && this.tasklists[tid].job && this.tasklists[tid].job.type === 'runjs' && /^https?:\/\/\S{4}/.test(this.tasklists[tid].job.target)) {
            toupdate.push(this.tasklists[tid].job.target.split(' ')[0])
          }
        })
      } else {
        for (let tid in this.tasklists) {
          if (this.tasklists[tid] && this.tasklists[tid].job && this.tasklists[tid].job.type === 'runjs' && /^https?:\/\/\S{4}/.test(this.tasklists[tid].job.target)) {
            toupdate.push(this.tasklists[tid].job.target.split(' ')[0])
          }
        }
      }
      if (toupdate.length) {
        if (confirm('共有 ' + toupdate.length + ' 个远程脚本等待更新，确定继续？')) {
          const hideloading = this.$message.loading('正在更新远程 JS...', 0)
          for (let upurl of toupdate) {
            this.logs.unshift(`[${this.$logHead('taskJSUP info')}][${this.$sTime(null, 1)}] 开始更新下载 ${upurl}`)
            let res = await this.$axios.put('/jsfile', { op: 'jsdownload', name: this.$uStr.surlName(upurl), url: upurl }).catch(e=>this.$message.error(e.message))
            if (res.data.rescode === 0) {
              this.logs.unshift(`[${this.$logHead('taskJSUP info')}][${this.$sTime(null, 1)}] 更新完成 ${res.data.message} `)
            } else {
              this.logs.unshift(`[${this.$logHead('taskJSUP error')}][${this.$sTime(null, 1)}] 更新失败 ${res.data.message} `)
            }
          }
          hideloading()
          this.$message.success('全部远程脚本更新完成')
        }
      } else {
        const message = this.$ta('current', '') + (this.taskChecklist.length ? this.$ta('checked', 'task') : this.$ta('task', 'list')) + this.$ta('', 'dthave', 'remote', 'script')
        this.$message.error(message)
        this.logs.unshift(`[${this.$logHead('taskJSUP error')}][${this.$sTime(null, 1)}] ${message}`)
      }
    },
    subTaskForm(taskinfo, { type = 'skip', belong }) {
      if (!this.taskCheck(taskinfo)) {
        return false
      }
      if (!taskinfo.id) {if (this.tnamelist[taskinfo.name]) {
        this.logs.unshift(`[${this.$logHead('taskSubAdd info')}][${this.$sTime(null, 1)}] 检测到同名任务: ${taskinfo.name}，当前同名任务更新方式为: ${this.subselect[type]}`)
        if (type === 'replace') {
          taskinfo.id = this.tnamelist[taskinfo.name]
        } else if (type === 'addition') {
          taskinfo.id = this.taskNewId()
        } else {
          this.logs.unshift(`[${this.$logHead('taskSubAdd info')}][${this.$sTime(null, 1)}] 跳过添加同名任务: ${taskinfo.name}`)
          return false
        }
      } else {
        taskinfo.id = this.taskNewId()
      }}
      if (taskinfo.running !== false) {
        taskinfo.running = true
      }
      if (belong && belong !== 'local') {
        taskinfo.belong = belong
      }
      return taskinfo
    },
    subTaskAdd(titem) {
      let tid = this.subimport.tid, type = ''
      if (tid === 'local') {
        type = this.sublist[this.taskimtid].job.type
      } else if (this.sublist[tid] && this.sublist[tid].job) {
        type = this.sublist[tid].job.type
      } else {
        return Promise.reject('未知错误，订阅可能不存在')
      }
      let tinfolist = [],
          tinfoadd  = (item)=>{
            let tinfo = this.subTaskForm(item, { type, belong: tid })
            if (tinfo) {
              tinfolist.push(tinfo)
            }
          }
      if (this.$sType(titem) === 'array') {
        titem.forEach(item=>tinfoadd(item))
      } else {
        tinfoadd(titem)
      }
      if (tinfolist.length === 0) {
        let message = '没有新的任务需要添加'
        this.$message.success(message)
        this.logs.unshift(`[${this.$logHead('taskSubAdd info')}][${this.$sTime(null, 1)}] ${message}`)
        return Promise.resolve(message)
      }

      let hideloading = this.$message.loading('正在添加定时任务...', 0)
      return new Promise((resolve, reject)=>{
        this.$axios.put('/task', {
          op: 'add',
          data: {
            task: tinfolist,
            type
          }
        }).then(res=>{
          if (res.data.rescode === 0) {
            this.$message.success('定时任务添加成功')
            this.logs.unshift(`[${this.$logHead('taskSubAdd info')}][${this.$sTime(null, 1)}] 定时任务添加完成`)
            JSON.parse(JSON.stringify(tinfolist)).forEach(tinfo=>{
              this.$set(this.tasklists, tinfo.id, tinfo)
            }) // 浅拷，不影响订阅里的内容
          } else {
            this.$message.error('定时任务添加失败')
            this.logs.unshift(`[${this.$logHead('taskSubAdd error')}][${this.$sTime(null, 1)}] 添加定时任务失败 ${res.data.message}`)
          }
        }).catch(e=>{
          console.error(e)
          this.$message.error('定时任务添加失败', e.message)
          this.logs.unshift(`[${this.$logHead('taskSubAdd error')}][${this.$sTime(null, 1)}] 添加定时任务失败 ${e.message}`)
        }).finally(()=>{
          resolve()
          hideloading()
        })
      })
    },
    subAll(){
      if (this.subimport.list && this.subimport.list.length) {
        let subtasklist = []
        if (this.tasksubChecklist.length) {
          this.tasksubChecklist.forEach(idx=>{
            subtasklist.push(this.subimport.list[idx])
          })
        } else {
          subtasklist = this.subimport.list
        }
        this.logs.unshift(`[${this.$logHead('taskSubAdd info')}][${this.$sTime(null, 1)}] 开始添加订阅 ${this.subimport.name} 中的任务`)
        this.subTaskAdd(subtasklist).catch(e=>this.$message.error(e)).finally(()=>{
          this.tasksubChecklist = []
        })
      } else {
        this.$message.error('并没有可以导入的定时任务')
        this.logs.unshift(`[${this.$logHead('taskSubAdd error')}][${this.$sTime(null, 1)}] 当前订阅列表为空`)
      }
    },
    tasksubCheck(tid, e){
      if (tid && e) {
        if (e.target.checked) {
          let rlists = JSON.parse(JSON.stringify(this.normlist)), nocflag = true
          this.taskChecklist.forEach(idx=>{
            rlists[idx] = -1
          })
          for (let idx in rlists) {
            let r = rlists[idx]
            if (r.belong === tid) {
              this.taskChecklist.push(idx)
              if (nocflag) {
                nocflag = false
              }
            }
          }
          if (nocflag) {
            this.$message.success('列表中暂时还没有该订阅内的定时任务')
          }
        } else {
          this.taskChecklist = this.taskChecklist.filter(idx=>this.tasklists[idx] && this.tasklists[idx].belong !== tid)
        }
      }
    },
    taskCkall(e){
      this.taskChecked = e.target.checked ? 'all' : 'none'
    },
    taskMenu(event, tid){
      let menuitems = [], taskTest = this.taskTest, taskLog = this.taskLog
      menuitems.push({
        label: '立即测试运行',
        bkcolor: 'var(--icon-bk)',
        click(){
          taskTest(tid)
        }
      }, {
        label: '查看任务日志',
        click(){
          taskLog(tid)
        }
      })
      if (this.tasklists[tid].job.type === 'runjs') {
        let scriptview = this.tasklists[tid].job.target.split(' ')[0], storeSetCache = this.$uApi.store.setCache
        menuitems.push({
          label: '查看脚本内容',
          method: 'nav',
          param: 'jsmanage',
          click(){
            storeSetCache('scriptview', scriptview)
          }
        })
      }
      this.menu = {
        pos: this.$uApi.getCursorPos(event, 160, 32 * menuitems.length),
        list: menuitems
      }
    },
    taskGroupCheck(gid, e){
      if (gid && e) {
        if (e.target.checked) {
          for (let tid in this.normlist) {
            if (this.normlist[tid].group === gid) {
              this.taskChecked = tid
            }
          }
        } else {
          this.taskChecklist = this.taskChecklist.filter(tid=>this.normlist[tid].group !== gid)
        }
      }
    },
    taskGroupDelete(gid){
      if (!this.tasklists[gid]) {
        this.$message.error('分组', gid, '暂不存在')
        return
      }
      let name = this.tasklists[gid].name, gkeys = Object.keys(this.grouplist[gid])
      if (gkeys.length === 0 || confirm('确定删除分组 ' + name + '（并不会删除该分组下的任务）？')) {
        const hideloading = this.$message.loading(name, '删除中...', 0)
        this.$axios.put('/task', { op: 'delete', data: { tid: gid }}).then(res=>{
          this.$message.success('成功删除分组', name, `${ gkeys.length ? gkeys.length + '个任务已移动到普通列表' : ''}`)
          this.logs.unshift(`[${this.$logHead('taskGroup info')}][${this.$sTime(null, 1)}] 成功删除分组: ${name}`)
          gkeys.forEach(tid=>{
            this.$delete(this.normlist[tid], 'group')
          })
          this.$delete(this.tasklists, gid)
          console.debug(res.data)
        }).catch(e=>{
          console.error(e)
          this.$message.error('删除分组失败', e.message)
          this.logs.unshift(`[${this.$logHead('taskGroup error')}][${this.$sTime(null, 1)}] 删除分组失败 ${e.message}`)
        }).finally(hideloading)
      }
    },
    taskGroupOp(gid){
      this.$set(this.tasklists[gid], 'collapse', !this.tasklists[gid].collapse)
    },
    taskMoveToGroup(e){
      if (e === 'new') {
        e = this.taskNewId()
        this.$set(this.tasklists, e, {
          name: "新的分组 " + Object.keys(this.grouplist).length,
          type: "group",
          note: "关于该分组的一些备注说明",
          bkcolor: this.$uStr.randomColor({ max: 200 }),
          collapse: false
        })
      }
      if (e === 'none' || (this.tasklists[e] && this.tasklists[e].type === 'group')) {
        this.taskChecklist.forEach(tid=>{
          if (e === 'none') {
            this.$delete(this.tasklists[tid], 'group')
          } else {
            this.$set(this.tasklists[tid], 'group', e)
          }
        })
        this.$message.success('成功移动', this.taskChecklist.length, '个定时任务到', e === 'none' ? '普通列表' : this.tasklists[e].name)
        this.logs.unshift(`[${this.$logHead('taskGroup info')}][${this.$sTime(null, 1)}] 成功移动 ${this.taskChecklist.length} 个定时任务到 ${ e === 'none' ? '普通列表' : this.tasklists[e].name }，保存后生效`)
        this.show.groupchoose = false
        this.taskChecked = 'none'
      } else {
        this.$message.error('所选分组不存在，请重新选择')
      }
    },
  }
}
</script>

<style scoped>
.task_time {
  width: 22%;
  min-width: 360px;
}

.task_select {
  width: 160px;
}

.tasksub_method {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.tasksub_label {
  border-radius: 8px;
  min-width: 192px;
  height: 40px;
  padding: 6px 10px;
  font-size: 20px;
  background: white;
}

.subdetail_head {
  display: flex;
  align-items: center;
}

.subdetail_label {
  width: 120px;
  min-width: 120px;
  white-space: nowrap;
  font-size: 20px;
}

.subdetail_name {
  width: 20%;
  margin-right: 2em;
}

.subdetail_note {
  width: 72%;
}

.elecTable_td--subinfo {
  padding: 3px 12px;
  border-top: 1px solid var(--main-fc);
  font-size: 16px;
  text-align: left;
}

.elecBtn--tasksave {
  margin-bottom: 0;
}
</style>