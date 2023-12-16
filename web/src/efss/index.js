import Vue from 'vue';
import efss from './efss.vue'

import axios from 'axios'
Vue.prototype.$axios = axios

import * as string from '../utils/string.js'
Vue.prototype.$sType = string.sType
Vue.prototype.$sString = string.sString
Vue.prototype.$sJson = string.sJson
Vue.prototype.$sTime = string.sTime
Vue.prototype.$logHead = string.logHead
Vue.prototype.$uStr = string

import * as api from '../utils/api.js'
Vue.prototype.$uApi = api
Vue.prototype.$message = api.vue2Proto.message

import { t, ta } from '../i18n/lang'
Vue.prototype.$t = t
Vue.prototype.$ta = ta

Vue.config.productionTip = false

import '../assets/css/global.css'

new Vue({
  el: '#efss',
  render: h => h(efss),
})