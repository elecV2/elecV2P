<template>
  <div class="sponsors" v-if="sponsors_show">
    <div class="sponsors_tip" title="赞助 10 元永久关闭此页面广告">
      <span data-method="nav" data-param="donation">{{ $t('sponsors') }}</span>
      <span class="tip tip--close" @click="sponsors_all=[]" data-method="nav" data-param="donation">X</span>
    </div>
    <div class="sponsors_main" v-if="main_sponsors.length">
      <a class="sponsor_item" v-for="sponsor in main_sponsors" :href="sponsor.link || '#'" :target="sponsor.link ? '_blank' : ''" rel="noreferrer">
        <img class="sponsor_img" :src="sponsor.show" :alt="sponsor.text">
      </a>
    </div>
    <div class="sponsors_text" v-if="text_sponsors.length">
      <a class="sponsors_link" v-for="sponsor in text_sponsors" :href="sponsor.link || '#'" :target="sponsor.link ? '_blank' : ''" rel="noreferrer">
        <span>{{ sponsor.text }}</span>
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'sponsors',
  data(){
    return {
      sponsors_show: true,
      sponsors_all: [],
    }
  },
  computed:{
    main_sponsors(){
      return this.sponsors_all.filter(spon=>{
        return !spon.hide && spon.type === 'pic'
      }).slice(0, 2)
    },
    text_sponsors(){
      return this.sponsors_all.filter(spon=>{
        return !spon.hide && spon.type === 'txt'
      })
    },
  },
  beforeCreate(){
    if (!this.$uApi.store.getCache('bSponsor')) {
      let b_fail = false;
      this.$axios.get('./data?type=sponsors&param=lists').then(res=>{
        let resdata = res.data.resdata
        if (resdata.sponsors) {
          this.sponsors_deal(resdata.sponsors);
        } else {
          b_fail = true;
        }
        console.debug('get sponsors lists', res.data)
      }).catch(e=>{
        b_fail = true;
        console.debug('获取 sponsors lists 失败', e.message)
      }).finally(()=>{
        if (!b_fail) {
          return;
        }
        this.$axios.get(`https://sponsors.elecv2.workers.dev/lists?userid=${ this.$uApi.store.get('userid') || '' }`).then(res=>{
          this.sponsors_deal(res.data);
          console.debug('get sponsors lists', res.data);
        }).catch(e=>{
          console.debug('获取 sponsors lists 失败', e.message);
        })
      })
    }
  },
  methods: {
    sponsors_deal(sponsors){
      if (sponsors.bSponsor) {
        this.$uApi.store.setCache('bSponsor', true)
        this.sponsors_show = false
      }
      if (sponsors.sponsors_ids) {
        this.$uApi.store.set('sponsors', this.$uStr.ebufEncrypt(JSON.stringify(sponsors.sponsors_ids), 'elecV2P_sponsors'))
      }
      if (this.sponsors_show && sponsors.sponsors_all) {
        this.sponsors_all = sponsors.sponsors_all
      }
    }
  },
}
</script>

<style scoped>
.sponsors {
  position: absolute;
  bottom: 0px;
  width: 100%;
  background: var(--tras-bk);
}
.sponsors_tip {
  position: absolute;
  right: 0;
  top: -18px;
  height: 18px;
  padding: 0 0.5em;
  border-radius: 1em 0.5em 0 0;
  font-size: 12px;
  color: var(--main-cl);
  background: var(--tras-bk);
  cursor: pointer;
}
.sponsors_main {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
}
.sponsor_item {
  display: inline-flex;
  min-width: 345px;
  width: 50%;
  height: 100%;
  text-align: center;
}
.sponsor_img {
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 50px;
  min-height: 32px;
}
.sponsors_text {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
  border-top: 1px solid var(--main-bk);
}
.sponsors_link {
  color: var(--main-bk);
  font-weight: bold;
}
</style>