<template>
  <div class="checkbox" :class="{ 'checkbox--checked': bChecked }" @click="bChecked=!bChecked">
    <span class="checkbox_status"></span>
  </div>
</template>

<script>
export default {
  name: "checkbox",
  props: ["oCheck", "oKey", "oInit"],
  computed: {
    bKey(){
      return this.oKey || 'enable'
    },
    bChecked: {
      get() {
        if (this.oCheck[this.bKey] === undefined) {
          return this.oInit !== 'false'
        }
        return !!this.oCheck[this.bKey]
      },
      set(val) {
        this.$set(this.oCheck, this.bKey, val)
      }
    }
  }
}
</script>

<style scoped>
.checkbox {
  display: inline-block;
  height: 30px;
  width: 60px;
  min-width: 60px;
  border-radius: 16px;
  text-align: center;
  vertical-align: text-bottom;
  box-shadow: 0 0 8px var(--main-bk);
  cursor: pointer;
  background-color: var(--main-fc);
  transition: background-color .2s;
}
.checkbox--checked {
  background-color: var(--main-cl);
}

.checkbox_status {
  display: inline-block;
  height: 32px;
  width: 32px;
  border-radius: 50%;
  margin-top: -1px;
  transform: translate(-15px, 0px);
  transition-property: transform, background-color;
  transition-duration: .2s;
  background-color: var(--main-cl);
}
.checkbox--checked .checkbox_status {
  transform: translate(15px, 0px);
  background-color: var(--icon-bk);
}
</style>