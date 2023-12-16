<template>
  <div class="pacset">
    <div class="pacaddr eflex">
      <label class="elabel" title="根据上面的 MITM HOST 列表自动生成 base on mitmhost list">PAC {{ $t('file') }}</label>
      <span class="elecBtn" @click="pacCopy()">{{ config.addr }}</span>
    </div>
    <div class="pacproxy eflex emargin">
      <label class="elabel" title="需要 MITM 的网络请求分流代理地址">{{ $t('proxy') }}</label>
      <input class="elecTable_input" placeholder="127.0.0.1:8001" v-model.trim="config.proxy">
    </div>
    <div class="pacproxy eflex emargin">
      <label class="elabel" title="未匹配到的网络请求走向">{{ $t('non-matched') }}</label>
      <input class="elecTable_input" placeholder="DIRECT" v-model.trim="config.final">
    </div>
    <button class="elecBtn" @click="pacSave()">{{ $t('save') }}</button>
  </div>
</template>

<script>
export default {
  name: "mitm",
  props: ["config"],
  data(){
    return {

    }
  },
  methods: {
    pacCopy(){
      this.$uApi.copyToClipboard(this.config.addr + '?u=' + Date.now() + '&token=')
      this.$message.success('成功复制 PAC 文件链接')
    },
    pacSave(){
      const hideloading = this.$message.loading('正在更新 PAC 默认代理...', 0)
      this.$axios.put('/pac', {
        proxy: this.config.proxy,
        final: this.config.final,
      }).then((res)=>{
        console.debug('PAC SAVE 返回结果', res.data)
        if (res.data.rescode === 0) {
          this.$message.success('成功更新 PAC 默认代理', res.data.message)
        } else {
          this.$message.error('更新 PAC 默认代理失败', res.data.message)
        }
      }).catch((e)=>{
        this.$message.error('更新 PAC 默认代理失败', e.message)
        console.error(e)
      }).finally(hideloading)
    },
  },
}
</script>

<style type="scoped">
.pacset {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin-top: 1em;
  padding: 3px 1em;
  border-radius: var(--radius-bs);
  background: var(--main-bk);
}
</style>