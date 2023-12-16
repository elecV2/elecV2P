<template>
  <div class="favend" :class="{ 'favend--collapsed': collapse }">
    <table class="elecTable" @keydown.ctrl.83.prevent.stop.exact="favendSave()">
      <caption class="elecTable_caption">
        <div class="title padding0">
          <span class="icon cursor title_sync" @click="$emit('init', 'config')" title="刷新 EFSS 相关设置" v-html="icon.sync"></span>
          <span class="title_main" title="EFSS favorite&backend">favend 相关设置 - {{ favend_total }}</span>
          <span class="title_collapse" :class="{ 'title_collapse--collapsed': collapse }" @click="collapse=!collapse"></span>
        </div>
      </caption>
      <thead v-show="!collapse">
        <tr title="在输入框内使用 alt + enter 打开 favend 页面">
          <th class="elecTable_th elecTable_th--check" title="全选/全不选">
            <input type="checkbox" class="echeckbox" @change="favendCkall($event)">
          </th>
          <th class="elecTable_th elecTable_th--name">名称</th>
          <th class="elecTable_th elecTable_th--input">关键字</th>
          <th class="elecTable_th elecTable_th--input">类型</th>
          <th class="elecTable_th minw480">目标</th>
          <th class="elecTable_th elecTable_th--enable">启用</th>
          <th class="elecTable_th elecTable_cell100">操作</th>
        </tr>
      </thead>
      <tbody v-show="!collapse" @keydown.alt.enter.prevent.exact="favendOpenDelegate($event)">
        <tr v-for="(favend, index) in showlist" :key="'key' + index"
          :class="{ 'elecTable_tr--disabled': !favend.enable, 'elecTable_tr--selected': favendChecked[favend.key] }"
        >
          <td class="elecTable_td" :class="{ 'folderbk': favend.collapse }">
            <input class="echeckbox" type="checkbox" :value="favend.key" v-model="favendCheck" />
          </td>
          <td class="elecTable_td">
            <input class="elecTable_input" type="text" v-model.trim="favend.name" :data-key="favend.key">
          </td>
          <td class="elecTable_td">
            <input class="elecTable_input" type="text" v-model.trim="favend.key" :data-key="favend.key">
          </td>
          <td class="elecTable_td">
            <select v-model="favend.type" class="elecTable_select">
              <option value="favorite">收藏目录</option>
              <option value="runjs">运行脚本</option>
            </select>
          </td>
          <td class="elecTable_td">
            <input type="text" v-model.trim="favend.target" class="elecTable_input" placeholder="目录地址 或 脚本名称 比如: logs 或 favend.js" :data-key="favend.key">
          </td>
          <td class="elecTable_td"><checkbox :oCheck="favend" /></td>
          <td class="elecTable_td elecTable_cell100">
            <span class="icon--op" @click="favendOpen(favend.key)" v-html="icon.play" title="打开查看"></span>
            <span class="icon--op" @click="favendDel(favend.key)" v-html="icon.delete" title="删除此项"></span>
          </td>
        </tr>
      </tbody>
      <tfoot v-show="!collapse">
        <tr>
          <td class="center cursor border_top1 border_right1 favend_collanum" :class="{ 'favend_collanum--show': coll_show }" @click.prevent.self="coll_show=!coll_show">{{ coll_keys.length }}</td>
          <td colspan="6" class="center border_top1">
            <span class="elecTable_addbtn elecBtn--file" @click="favendCol(true)" v-show="hasChecks">隐藏选择规则</span>
            <span class="elecTable_addbtn elecTable_addbtn--stop" @click="favendCol(false)" v-show="hasCheckCols">规则隐藏取消</span>
            <span class="elecTable_addbtn elecTable_addbtn--clear" @click="favendDelCks()" v-show="hasChecks">删除选择规则</span>
            <span class="elecTable_addbtn" @click="favendNew()">添加新的规则</span>
            <span class="elecTable_addbtn" @click="favendSave()" title="（CTRL+S）保存后正式生效">保存当前列表</span>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script>
import checkbox from '../utils/checkbox.vue'
import icon from '../utils/icon.js'

export default {
  name: "efss",
  props: ['favendlist', 'efssdir'],
  data(){
    return {
      icon,
      collapse: true,
      orglist: [],
      coll_show: false,
      favendCheck: [],
    }
  },
  components: {
    checkbox
  },
  computed: {
    favend_total(){
      return this.orglist.length
    },
    showlist(){
      if (this.coll_show) {
        return this.orglist
      }
      return this.orglist.filter(s=>!s.collapse)
    },
    coll_keys(){
      return this.orglist.filter(f=>f.collapse).map(f=>f.key)
    },
    favendChecked: {
      get(){
        let clist = {}
        this.favendCheck.forEach(rc=>{
          clist[rc] = true
        })
        return clist
      },
      set(val){
        if (val === 'all') {
          this.favendCheck = this.showlist.map(fd=>fd.key)
        } else if (val === 'none') {
          this.favendCheck = []
        }
      }
    },
    hasChecks(){
      return this.favendCheck.length !== 0
    },
    hasCheckCols(){
      return this.favendCheck.some(key=>this.coll_keys.includes(key))
    },
  },
  watch: {
    favendlist(newval) {
      let flist = [];
      for (let key in newval) {
        flist.push(newval[key]);
      }
      this.orglist = flist;
    }
  },
  methods: {
    favendOpen(key) {
      this.$uApi.open('/efss/' + key)
    },
    favendOpenDelegate(event){
      if (event.target.dataset.key) {
        this.$uApi.open('/efss/' + event.target.dataset.key)
      }
    },
    favendDel(key) {
      this.orglist = this.orglist.filter(favend=>favend.key !== key)
    },
    favendDelCks(){
      this.orglist = this.orglist.filter(favend=>!this.favendChecked[favend.key])
      this.$message.success(`成功删除 ${this.favendCheck.length} 条规则，保存后正式生效`)
      this.favendCheck = []
    },
    favendNew(key = this.$uStr.euid()) {
      let type = Math.random() < 0.5 ? 'runjs' : 'favorite';
      this.orglist.push({
        key, name: 'favend ' + (Object.keys(this.orglist).length + 1),
        type, target: type === 'favorite' ? this.efssdir : 'test.js',
        enable: true
      });
    },
    favendSave(){
      let newfavend = Object.create(null);
      for (let favend of this.orglist) {
        if (favend.key && favend.name && favend.target) {
          if (newfavend[favend.key]) {
            this.$message.error('设置了重复关键字:', favend.key, '请修改后再进行保存\n重复项:', favend.name, '和', newfavend[favend.key].name);
            return;
          }
          newfavend[favend.key] = favend;
        } else {
          this.$message.error(favend.name, favend.key, '部分项参数为空，请修改后再进行保存');
          return;
        }
      };
      const hideloading = this.$message.loading('favend 列表更新中...', 0)
      this.$axios.put("/config", { type: 'efss', data: { favend: newfavend } }).then((res) => {
        if (res.data.rescode === 0) {
          this.$message.success('favend 设置保存成功')
          for (let key in this.favendlist) {
            if (!newfavend[key]) {
              delete this.favendlist[key]
            }
          }
          for (let key in newfavend) {
            this.favendlist[key] = newfavend[key]
          }
        } else {
          this.$message.error('favend 设置保存失败', res.data.message || '未知错误');
          console.error(res.data);
        }
      }).catch(e=>{
        this.$message.error('favend 设置失败', e.message)
        console.error(e)
      }).finally(hideloading)
    },
    favendCkall(e) {
      this.favendChecked = e.target.checked ? 'all' : 'none'
    },
    favendCol(bcol = true){
      if (!this.hasChecks) {
        this.$message.error('请先选择规则')
        return
      }
      const hideloading = this.$message.loading('隐藏列表更新中...', 0)
      this.$axios.put('/config', {
        type: 'favend',
        prop: 'collapse',
        keys: this.favendCheck,
        value: bcol,
      }).then((res) => {
        if (res.data.rescode === 0) {
          this.$message.success('隐藏列表更新成功')
          if (res.data.resdata) {
            this.$message.error('其中', res.data.resdata.join(', '), '对应规则尚未上传保存')
          }
          this.orglist = this.orglist.map(favend=>{
            if (this.favendCheck.includes(favend.key)) {
              return {
                ...favend, collapse: bcol
              }
            }
            return { ...favend }
          })
          this.favendCheck = []
        } else {
          this.$message.error('隐藏列表更新失败', res.data.message || res.data || '未知错误')
          console.error('隐藏列表更新失败', res.data)
        }
      }).catch(e=>{
        this.$message.error('隐藏列表更新失败失败', e.message)
        console.error('隐藏列表更新失败', e)
      }).finally(hideloading)
    },
  }
}
</script>

<style scoped>
.favend {
  border-radius: 0 0 var(--radius-bs) var(--radius-bs);
  overflow-x: auto;
}

.favend--collapsed {
  height: 40px;
  overflow: hidden;
}

.favend_collanum {
  font-size: 1.5em;
  color: var(--main-cl);
  background-color: var(--folder-bk);
}
.favend_collanum--show {
  color: var(--main-fc);
}
</style>