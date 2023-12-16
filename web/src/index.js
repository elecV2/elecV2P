import Vue from 'vue';
import App from './App.vue';

import axios from 'axios'
// axios.defaults.timeout = 5000
Vue.prototype.$axios = axios

import wsrecv from './utils/webws'
Vue.prototype.$wsrecv = wsrecv

import * as string from './utils/string.js'
Vue.prototype.$sType = string.sType
Vue.prototype.$sString = string.sString
Vue.prototype.$sJson = string.sJson
Vue.prototype.$sTime = string.sTime
Vue.prototype.$logHead = string.logHead
Vue.prototype.$uStr = string

import * as api from './utils/api.js'
Vue.prototype.$uApi = api
Vue.prototype.$evui = e=>api.vue2Proto.evui(e)
Vue.prototype.$message = api.vue2Proto.message

import { t, ta } from './i18n/lang'
Vue.prototype.$t = t
Vue.prototype.$ta = ta

import './assets/css/global.css'

Vue.config.productionTip = false

new Vue({
  el: '#app',
  render: h => h(App),
})