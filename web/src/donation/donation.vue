<template>
  <section>
    <header class="header">{{ $t('donation') }}</header>
    <main class="content">
      <div class="donation">
        <p>如果你觉得本项目还不错的话，<a href="https://github.com/elecV2/elecV2P" target="elecV2PGit">给个 Star</a> ，或者赞助打赏一下</p>
        <div class="donationpic">
          <img class="donationpic_item" alt="wechat" src="https://elecv2.github.io/src/wechat.png"/>
          <img class="donationpic_item" alt="alipay" src="https://elecv2.github.io/src/alipay.png"/>
        </div>
        <div v-show="userid" title="可多台设备共用（设置相同 WEBHOOK TOKEN）">
          <p>当前用户 ID: {{ userid }}</p>
          <p class="tip">* 赞助 10 元及以上，体验<a href="https://github.com/elecV2/elecV2P-dei/tree/master/examples/theme" target="elecV2PDoc" class="tip"> 主题功能</a>（请附上用户 ID）</p>
        </div>
      </div>
      <div class="todo">
        <h2 v-show='!tododata' class="todotitle" @click='todoget'>查看 Todo-Done-Project</h2>
        <div v-html='tododata'></div>
      </div>
    </main>
    <footer class="footer">
      <span>BTC: 1GtN4T1GB4YUf4YWynqr1Vgv4sdgLepoo9</span>
      <span>ETH: 0x2455850dAC2f44309E3e208E5ffAF5945308E76a</span>
    </footer>
  </section>
</template>

<script>
  export default {
    name: "donation",
    data(){
      return {
        userid: this.$uApi.store.get('userid'),
        tododata: ''
      }
    },
    created(){
      if (!this.$uApi.store.getCache('bSponsor')) {
        this.$axios.get('/data?type=sponsors').then(res=>{
          if (res.data.rescode === 0) {
            let resdata = res.data.resdata
            this.$uApi.store.set('sponsors', this.$uStr.ebufEncrypt(JSON.stringify(resdata.sponsors), 'elecV2P_sponsors'))
            if (this.userid !== resdata.userid) {
              this.userid = resdata.userid
              this.$uApi.store.set('userid', this.userid)
            }
            let bSponsor = this.$uApi.store.getCache('sponsors').has(this.userid) || resdata.sponsors.indexOf(this.userid) !== -1
            if (bSponsor) {
              this.$message.success('感谢您的赞助，相关权益已激活，请回到首页并刷新')
              this.$uApi.store.setCache('bSponsor', true)
            }
          }
          console.debug('get sponsors lists', res.data)
        }).catch(e=>{
          console.debug('获取 sponsors lists 失败', e.message)
        })
      }
    },
    methods: {
      todoget(){
        if (this.tododata) return
        const hideloading = this.$message.loading('获取 todo lists 中...', 0)
        this.$axios.get("https://raw.githubusercontent.com/elecV2/elecV2P/master/Todo.md").then(res=>{
          this.$message.success('获取成功')
          this.tododata = res.data
        }).catch(e=>{
          this.$message.error('获取失败 ' + e.message)
          console.error(e)
          this.tododata = "点击前往：<a target='elecV2PGit' href='https://github.com/elecV2/elecV2P/blob/master/Todo.md'>https://github.com/elecV2/elecV2P</a> 查看"
        }).finally(hideloading)
      }
    }
  }
</script>

<style scoped>
.donation {
  padding: 24px;
  border-radius: var(--radius-bs);
  text-align: center;
  font-size: 16px;
  word-break: break-all;
  color: var(--main-fc);
}
.donationpic {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.donationpic_item {
  max-width: 100%;
  margin: auto;
  border-radius: 1.6em;
}
.todo {
  margin-top: 12px;
  padding: 16px 0;
  text-align: center;
  border: 1px solid var(--main-bk);
  border-radius: var(--radius-bs);
}
.todotitle {
  margin: 0;
  text-align: center;
  cursor: pointer;
  color: var(--main-cl);
}
.footer {
  display: inline-flex;
  justify-content: space-around;
  flex-wrap: wrap;
  line-height: 48px;
  padding: 0;
}
</style>