<template>
  <main>
    <header class="header">{{ header }}</header>
    <main class="content">
      <div class="etable"><table class="elecTable" @keydown.ctrl.83.prevent.stop.exact="filterSave()">
        <caption class="elecTable_caption">
          <span>filter.list - {{ lists.length }}</span>
          <span @click="cfInit()" class="icon icon_caption--sync" title="刷新当前列表" v-html="icon.sync"></span>
        </caption>
        <thead>
          <tr>
            <th class="elecTable_th elecTable_th--name">匹配方式</th>
            <th class="elecTable_th">匹配内容</th>
            <th class="elecTable_th minw62">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{data, index} in lists" :key="'filter' + index">
            <td class="elecTable_td">
              <select v-model="data[0]" class="elecTable_select">
                <option>DOMAIN</option>
                <option>DOMAIN-SUFFIX</option>
                <option>IP-CIDR</option>
              </select>
            </td>
            <td class="elecTable_td">
              <input v-model.trim="data[1]" class="elecTable_input">
            </td>
            <td class="elecTable_td">
              <span class="icon--op" @click="$set(orglist[index], 'status', -1)" v-html="icon.delete"></span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" @click="orglist.push({ data: ['DOMAIN', ''], index: orglist.length, status: 1 })" class="elecTable_add">+</td>
          </tr>
        </tfoot>
      </table></div>
      <p class="center"><button class="elecBtn elecBtn--long" @click="filterSave()">保存当前列表</button></p>
    </main>
    <footer class="footer footer--h48">
      <div>
        <span>该列表用于客户端分流（filter）订阅  地址:</span>
        <strong><a href="/filter" target="elecV2PFilter">{{ homepage }}/filter</a></strong>
      </div>
    </footer>
  </main>
</template>

<script>
import icon from '../utils/icon.js'
  export default {
    name: "filter",
    data(){
      return {
        icon,
        header: '客户端订阅分流列表',
        homepage: location.origin,
        orglist: [],
      }
    },
    created(){
      this.cfInit()
    },
    computed: {
      lists(){
        return this.orglist.filter(fr=>fr.status !== -1)
      }
    },
    methods: {
      cfInit(){
        const hideloading = this.$message.loading('正在获取 filter 列表...', 0)
        this.$axios.get('/data?type=filter').then(res=>{
          let str = res.data
          let templ = []
          if (str) {
            str.split(/\n|\r/).forEach(l=>{
              if (l.split(',').length === 3 && !/^(#|\[)/.test(l)) {
                let litem = l.split(',')
                templ.push({ data: [litem[0], litem[1]], index: templ.length, status: 0 })
              }
            })
          }
          this.orglist = templ
          this.$message.success('成功获取 filter 列表 ' + this.orglist.length)
        }).catch(e=>{
          this.$message.error('获取 filter 列表失败', e.message)
          console.error('获取 filter 数据失败', e)
        }).finally(hideloading)
      },
      filterSave(){
        let savers = []
        savers = this.lists.filter(fr=>fr.data[1] && /^(DOMAIN(-SUFFIX)?|IP-CIDR)$/.test(fr.data[0]))
        let deletenum = this.lists.length - savers.length
        if (deletenum) {
          this.$message.error('部分规则为空，请填写完成或删除后再进行保存')
          return
        }
        savers = this.lists.map(fr=>fr.data)
        const hideloading = this.$message.loading('filter 列表保存中...', 0)
        this.$axios.post('/filterlist', {
          filterlist: savers
        }).then(res=>{
          this.$message.success('保存成功', res.data.message)
        }).catch(e=>{
          this.$message.error('保存失败', e.message)
          console.error(e)
        }).finally(hideloading)
      }
    }
  }
</script>