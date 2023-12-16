<template>
  <ul class="menu" :style="{ left: (pos ? pos[0] : 0) + 'px', top: (pos ? pos[1] : 0) + 'px' }">
    <li class="menu_item" v-for="(menu, idx) in menus"
    @click.prevent="click(idx)"
    @contextmenu.prevent="rclick(idx)"
    @dblclick.prevent="dclick(idx)"
    :data-method="menu.method"
    :data-param="menu.param"
    :style="{ color: menu.color, backgroundColor: menu.bkcolor, fontSize: menu.fontsize, height: menu.height }">{{ menu.label }}</li>
  </ul>
</template>

<script>
export default {
  name: 'contextmenu',
  props: ['menus', 'pos'],
  methods: {
    click(idx){
      if (this.menus.length && this.menus[idx].click) {
        this.menus[idx].click()
      } else {
        console.debug('点击暂无对应处理函数')
      }
      this.menus.splice(0)
    },
    rclick(idx){
      if (this.menus.length && this.menus[idx].rclick) {
        this.menus[idx].rclick()
      } else {
        console.debug('右键暂无对应处理函数')
      }
      this.menus.splice(0)
    },
    dclick(idx){
      if (this.menus.length && this.menus[idx].dclick) {
        this.menus[idx].dclick()
      } else {
        console.debug('双击暂无对应处理函数')
      }
      this.menus.splice(0)
    }
  }
}
</script>

<style scoped>
.menu {
  position: absolute;
  display: flex;
  min-width: 160px;
  list-style: none;
  justify-content: center;
  flex-direction: column;
  align-content: center;
  align-items: center;
  padding: 0;
  border-radius: 12px;
  color: var(--main-fc);
  background: var(--main-cl);
  z-index: 999;
}

.menu_item {
  height: 32px;
  width: 100%;
  padding: 3px 12px;
  box-sizing: border-box;
  border-bottom: 1px solid;
  user-select: none;
  cursor: pointer;
}

.menu_item:first-child {
  border-radius: 12px 12px 0 0;
}

.menu_item:last-child {
  border-bottom: none;
  border-radius: 0 0 12px 12px;
}
</style>