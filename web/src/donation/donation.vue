<template>
  <section>
    <header class="header">{{ $t('donation') }}</header>
    <main class="content">
      <div class="donation">
        <p>{{ $t('support_text') }} <a href="https://github.com/elecV2/elecV2P" target="elecV2PGit">Star</a></p>
        <div class="donationpic">
          <img class="donationpic_item" alt="wechat" src="https://elecv2.github.io/src/wechat.png"/>
          <img class="donationpic_item" alt="alipay" src="https://elecv2.github.io/src/alipay.png"/>
        </div>
        <div v-show="userid" :title="$t('support_text')">
          <p>{{ $t('current_user_id') }} {{ userid }}</p>
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