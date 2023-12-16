<template>
  <section @keydown.ctrl.83.prevent.stop="saveAll()">
    <header class="header">{{ $t('setting') }}</header>
    <main class="content">
      <div class="setting setting--home">
        <div class="wp50 minw320 eflex_grow1" @keydown.ctrl.83.prevent.stop="homepageSave()">
          <label class="setting_label" title="可访问此后台界面的完整 URL。用于 RSS 订阅及脚本中的 __home 参数">{{ $t('homepage') }}：</label>
          <input v-model.trim="homepage" name="homepage" class="setting_input" :placeholder="init_url">
          <button @click="homepageSave()" class="elecBtn">{{ $t('save') }}</button>
        </div>
        <div class="wp50 minw320 eflex_grow1" @keydown.ctrl.83.prevent.stop="langSave()">
          <label class="setting_label" title="仅供参考">{{ $t('language') }}：</label>
          <select class="setting_select setting_select--short" v-model="lang">
            <option value="zh-CN">{{ $t('zh') }}</option>
            <option value="en">{{ $t('en') }}</option>
          </select>
          <span class="tip">（还有很多地方待翻译）</span>
          <button class="elecBtn" @click="langSave()">{{ $t('save') }}</button>
        </div>
      </div>
      <div class="setting setting--log">
        <div class="wp50 minw320 eflex_grow1" @keydown.ctrl.83.prevent.stop="glevelSet()">
        <label class="setting_label" title="后台日志输出等级">{{ $t('logs') }}{{ $t('level') }}：</label>
        <select v-model='gloglevel' class="setting_select">
          <option>error</option>
          <option>notify</option>
          <option>info</option>
          <option>debug</option>
        </select>
        <button @click="glevelSet()" class="elecBtn">{{ $t('save') }}</button>
        </div>
        <div class="wp50 minw320 eflex_grow1" @keydown.ctrl.83.prevent.stop="gsliceSet()">
          <label class="setting_label" title="后台日志输出格式">{{ $t('format') }}：</label>
          <select v-model='glogslicebegin' class="setting_select">
            <option value="0">YYYY-MM-DD HH:mm:ss.SSS</option>
            <option value="5">MM-DD HH:mm:ss.SSS</option>
            <option value="11">HH:mm:ss.SSS</option>
          </select>
          <button @click="gsliceSet()" class="elecBtn">{{ $t('save') }}</button>
        </div>
      </div>
      <div class="setting setting--webhook">
        <div class="wp50 minw320 eflex_grow1" @keydown.ctrl.83.prevent.stop="wbrtokenSave()">
        <label class="setting_label" title="服务器访问 token(非常重要)">WEBHOOK TOKEN：</label>
        <div class="incon">
          <input v-model.trim="wbrtoken" name="wbrtoken" class="setting_input incon_input">
          <span @click="wbrtoken=$uStr.UUID()" class="icon cursor incon_icon" v-html="icon.sync"></span>
        </div>
        <button @click="wbrtokenSave()" class="elecBtn">{{ $t('save') }}</button>
        </div>
        <div class="wp50 minw320 eflex_grow1" @keydown.ctrl.83.prevent.stop="wbrscriptSave()">
          <label title="webhook 其他 payload 处理脚本" class="setting_label">SCRIPT：</label>
          <checkbox :oCheck="wbrscript" />
          <input v-model.trim="wbrscript.target" name="wbrscript" class="setting_input setting_input--middle" placeholder="webhook.js">
          <button class="elecBtn" @click="wbrscriptSave()">{{ $t('save') }}</button>
        </div>
        <div v-show="userid" class="w100" title="基于 WEBHOOK TOKEN 自动生成 无法自定义及反推">
          <span>{{ $t('user') }} ID: </span><span>{{ userid }}</span>
        </div>
      </div>
      <div class="setting" :class="{ 'setting--collapsed': collapse.notify }">
        <h4 class="setting_title">
          <div class="title_main">
            <a href="https://github.com/elecV2/elecV2P-dei/tree/master/docs/07-feed&notify.md" target="elecV2PDoc" class="cursor--help main_fc">{{ $ta('notify', 'setting_of') }}</a>
            <span class="mleft30 cursor" @click="feedTest()" title="点击进行测试(先保存)" v-html="icon.plays"></span>
          </div>
          <span class="title_collapse" :class="{ 'title_collapse--collapsed': collapse.notify }" @click="collapse.notify=!collapse.notify"></span>
        </h4>
        <div class="setting--notify">
          <label class="setting_label">
            <a href="https://help.ifttt.com/hc/en-us/articles/115010230347-Webhooks-service-FAQ" target="_blank" class="cursor--help">IFTTT</a> KEY：</label>
          <checkbox :oCheck="CONFIG_FEED.iftttid" />
          <input v-model.trim="CONFIG_FEED.iftttid.key" name="ifttt" class="setting_input" placeholder="xxxxxxxxxxxxxxxxxxxxxx">
          <button @click="iftttSave()" class="elecBtn">{{ $t('save') }}</button>
        </div>
        <div class="setting--notify">
          <label class="setting_label"><a href="https://github.com/Finb/Bark" target="_blank" class="cursor--help">BARK</a> KEY：</label>
          <checkbox :oCheck="CONFIG_FEED.barkkey" />
          <input v-model.trim="CONFIG_FEED.barkkey.key" name="barkkey" class="setting_input" placeholder="xxxxxxxxxxxxxxxxxxxxxx">
          <button @click="barkeySave()" class="elecBtn">{{ $t('save') }}</button>
        </div>
        <div class="setting--notify">
          <label class="setting_label">自定义通知：</label>
          <checkbox :oCheck="CONFIG_FEED.custnotify" />
          <input v-model.trim="CONFIG_FEED.custnotify.url" name="custnotify" class="setting_input" placeholder="https://xxx.xx.xxx/xxxxxx">
          <select v-model='CONFIG_FEED.custnotify.type' class="setting_select setting_select--short">
            <option>GET</option>
            <option>POST</option>
          </select>
          <textarea v-if="CONFIG_FEED.custnotify.type=='POST'" v-model.lazy.trim="CONFIG_FEED.custnotify.data" class="editor_textarea editor_textarea--mini emargin--top" placeholder="使用 $title$ 代表通知标题，$body$ 代表通知内容，$url$ 代表附加链接。比如：
{
  &quot;text&quot;: `$title$`,
  &quot;desp&quot;: `$body$\n\n附加链接: $url$`
}
具体格式及使用参数，根据自定义通知的 API 说明进行调整（通知内容尽量使用反引号`包括）"></textarea>
          <button @click="custnotifySave()" class="elecBtn elecBtn--stlong">{{ $t('save') }}</button>
        </div>
        <div class="setting--notify">
          <label class="setting_label">通知触发脚本：</label>
          <checkbox :oCheck="CONFIG_FEED.runjs" />
          <input v-model.lazy.trim="CONFIG_FEED.runjs.list" name="runjs" class="setting_input" placeholder="notify.js, test.js（多个脚本使用英文逗号进行分隔，支持远程链接）">
          <button @click="notifyjsSave()" class="elecBtn">{{ $t('save') }}</button>
        </div>
        <div class="setting--notify">
          <label class="setting_label setting_label--flex">
            <span>当通知内容长度超过</span>
            <input type="number" name="maxbLength" v-model.number="CONFIG_FEED.maxbLength" class="setting_input setting_input--number" placeholder="0: 不分段">
            <span>时，分段发送</span>
          </label>
          <label class="setting_label setting_label--flex">
            <span>是否在前端网页显示通知：</span>
            <checkbox :oCheck="CONFIG_FEED.webmessage" />
          </label>
          <label class="setting_label setting_label--flex" title="默认通知内容包括：定时任务开始与停止，脚本运行达到指定次数等">
            <span>是否开启默认通知：</span>
            <checkbox :oCheck="CONFIG_FEED" />
          </label>
          <button class="elecBtn" @click="feedOp()">{{ $t('save') }}</button>
        </div>
      </div>
      <div class="setting" :class="{ 'setting--collapsed': collapse.other }" @keydown.ctrl.83.prevent.stop="mergeSave()">
        <h4 class="setting_title">
          <sapn class="title_main">{{ $ta('default', 'notify', 'setting_of') }}</sapn>
          <span class="title_collapse" @click="collapse.other=!collapse.other" :class="{ 'title_collapse--collapsed': collapse.other }"></span>
        </h4>
        <div class="setting setting--other">
          <div class="eflex eflex--wrap w100">
            <span class="tip">默认通知内容包括：定时任务开始与停止，脚本运行达到指定次数等</span>
            <label class="setting_label setting_label--flex" title="FEED/RSS 包含所有通知内容">是否输出 <a href="/feed" target="elecV2PFeed">FEED</a>：
              <checkbox :oCheck="CONFIG_FEED.rss" />
            </label>
            <button @click="feedClear()" class="elecBtn elecBtn--wave">清空 FEED 内容</button>
          </div>
          <div class="w100">
            <div class="setting setting--inline">
              <label class="setting_label setting_label--flex">
                <span class="setting_label">是否合并默认通知</span>
                <checkbox :oCheck="CONFIG_FEED.merge" />
              </label>
              <div>
                <label class="setting_label">合并时间（秒）：</label>
                <input type="number" v-model.number="CONFIG_FEED.merge.gaptime" name="mergetime" class="setting_input setting_input--number">
              </div>
              <div>
                <label class="setting_label">合并逻辑：</label>
                <span class="setting_andor" @click="CONFIG_FEED.merge.andor=!CONFIG_FEED.merge.andor">{{  CONFIG_FEED.merge.andor ? 'AND' : 'OR' }}</span>
              </div>
              <div>
                <label class="setting_label">合并条数：</label>
                <input type="number" v-model.number="CONFIG_FEED.merge.number" name="mergenum" class="setting_input setting_input--number">
              </div>
            </div>
            <i class="tip tip--small">当前设置表示：至少等 {{ CONFIG_FEED.merge.gaptime }} 秒 {{ CONFIG_FEED.merge.andor ? '且' : '或' }} 共有 {{ CONFIG_FEED.merge.number }} 条通知时合并发送（此设置对脚本内的通知函数无效，即脚本通知还是单独发送）</i>
          </div>
        </div>
        <button @click="mergeSave()" class="elecBtn elecBtn--stlong">{{ $t('save') }}</button>
      </div>
      <div class="setting setting--vflex" :class="{ 'setting--collapsed': collapse.runjs }" @keydown.ctrl.83.prevent.stop="runjsSave()">
        <h4 class="setting_title">
          <sapn class="title_main">{{ $ta('script', 'run', 'setting_of') }}</sapn>
          <span class="title_collapse" @click="collapse.runjs=!collapse.runjs" :class="{ 'title_collapse--collapsed': collapse.runjs }"></span>
        </h4>
        <div class="setting--other"><div class="eflex eflex--wrap w100">
          <div>
            <label title="0 ms 表示不设定超时时间">TIMEOUT(ms): </label>
            <input v-model.number="CONFIG_RUNJS.timeout" type="number" placeholder="0:不限制" class="setting_input setting_input--number">
          </div>
          <div>
            <label title="0 秒表示有则不更新">远程脚本更新最低时间间隔(秒):</label>
            <input v-model.number="CONFIG_RUNJS.intervals" type="number" placeholder="0:有则不更新" name="intervals" class="setting_input setting_input--number">
          </div>
          <div>
            <label title="0 次表示不通知">每运行 </label>
            <input v-model.number="CONFIG_RUNJS.numtofeed" type="number" placeholder="0:不通知" name="numtofeed" class="setting_input setting_input--number">
            <label> 次, 添加一个默认通知</label>
          </div>
        </div>
        <i class="tip tip--small">0 ms: 不设定超过时间，由 $done 控制返回， 0 秒: 表示如果有则不更新，  0 次: 表示不通知</i>
        <div class="eflex eflex--wrap w100">
          <div class="eflex">
            <label>保存日志</label>
            <input v-model="CONFIG_RUNJS.jslogfile" type="checkbox" name="jslogs" class="echeckbox">
          </div>
          <div class="eflex">
            <label title="打印并保存脚本运行时所发送的网络请求 url">保存网络请求 URL 到日志中</label>
            <input v-model="CONFIG_RUNJS.eaxioslog" type="checkbox" name="eaxioslog" class="echeckbox">
          </div>
          <div class="eflex">
            <label>使用网络请求相关设置中的代理(如有)</label>
            <input v-model="CONFIG_RUNJS.proxy" type="checkbox" name="runjsproxy" class="echeckbox">
          </div>
        </div>
        <div class="setting setting--inline">
          <div class="eflex">
            <label class="w120" title="白名单脚本不显示网络请求 url">白名单脚本</label>
            <checkbox :oCheck="CONFIG_RUNJS.white" />
          </div>
          <input v-model.lazy.trim="jswhitelist" placeholder="完整的脚本文件名，以英文逗号进行分隔，比如: test.js,softupdate.js" class="setting_input setting_input--middle" title="远程脚本只需填写文件名部分。本地次级目录文件需带目录填写">
          <span class="tip">该名单脚本内所有网络请求直接放行，不做屏蔽检测</span>
        </div>
      </div><button @click="runjsSave()" class="elecBtn elecBtn--stlong">{{ $t('save') }}</button></div>
      <eAxios :config="CONFIG_Axios" :uagent="uagent" />
      <webui :menunav="webUI.nav" :theme="webUI.theme" :logo="webUI.logo" v-on="$listeners" />
      <security :config="CONFIG_SECURITY" />
      <env :config="CONFIG_env" />
      <div :class="{ 'setting--collapsed': collapse.init }" class="setting setting--init">
        <h4 class="setting_title">
          <sapn class="title_main" title="重启后生效">初始化相关设置</sapn>
          <span @click="collapse.init=!collapse.init" class="title_collapse" :class="{ 'title_collapse--collapsed': collapse.init }"></span>
        </h4>
        <div class="setting setting--inline" @keydown.ctrl.83.prevent.stop="initSave()">
          <div class="eflex">
            <label class="setting_label">启动时检测新版本:</label>
            <checkbox :oCheck="CONFIG_init" oKey="checkupdate" />
          </div>
          <div class="eflex eflex_grow1 emargin--d5em">
            <label class="setting_label" title="在 elecV2P 启动时执行的脚本, 可用于配置基础执行环境，或发送启动通知等">启动时运行脚本:</label>
            <checkbox class="emargin--right" :oCheck="CONFIG_init" oKey="runjsenable" />
            <input v-model.lazy.trim="CONFIG_init.runjs" name="init" class="elecTable_input" placeholder="python-install.js, feed.js, process.env.js（多个脚本请使用英文逗号进行分隔）">
          </div>
          <button @click="initSave()" class="elecBtn emargin--d5em">{{ $t('save') }}</button>
        </div>
        <div class="setting setting--inline" @keydown.ctrl.83.prevent.stop="webUIPortSave()">
          <label class="setting_label">webUI 主界面端口:</label>
          <input v-model.number="webUI.port" type="number" name="webuiport" class="setting_input setting_input--number" placeholder="80">
          <label class="setting_label setting_label--flex" title="是否使用 https 访问">
            <span>TLS：</span>
            <checkbox :oCheck="webUI.tls" />
          </label>
          <label class="setting_label setting_label--flex" title="TLS 证书颁发对象，IP 或 域名">
            <span>HOST：</span>
            <input v-model="webUI.tls.host" name="tls_host" class="setting_input w220" placeholder="IP 或 域名">
          </label>
          <button @click="webUIPortSave()" class="elecBtn">{{ $t('save') }}</button>
        </div>
        <div class="setting setting--inline" @keydown.ctrl.83.prevent.stop="anyproxySave()">
          <label class="setting_label">ANYPROXY 设置:</label>
          <checkbox :oCheck="anyproxy" title="启动时 关闭/打开" />
          <label class="setting_label setting_label--flex">
            <span>代理端口：</span>
            <input v-model.number="anyproxy.port" type="number" name="anyport" class="setting_input setting_input--number" placeholder="8001">
          </label>
          <label class="setting_label setting_label--flex">
            <span>网络请求查看端口：</span>
            <input v-model.number="anyproxy.webPort" type="number" name="anywebport" class="setting_input setting_input--number" placeholder="8002">
          </label>
          <button @click="anyproxySave" class="elecBtn">{{ $t('save') }}</button>
        </div>
        <div class="setting setting--config" @keydown.ctrl.83.prevent.stop="pathSave()">
          <label class="title_inline" title="仅可在启动时通过 env.CONFIG 更改">
            <span class="elabel_text">当前配置文件</span>
            <input class="emargin elecTable_input wp50 minw320" :value="CONFIG_Path.config" disabled>
          </label>
          <div class="eflex eflex--wrap">
            <label class="w100">
              <span class="elabel_text" :title="'当前使用目录：'+CONFIG_Path.lists_final">规则任务列表等保存目录</span>
              <input class="elecTable_input wp50 minw320 emargin" v-model="CONFIG_Path.lists" :placeholder="CONFIG_Path.lists_final">
            </label>
            <label class="w100">
              <span class="elabel_text" :title="'当前使用目录：'+CONFIG_Path.script_final">脚本文件保存目录</span>
              <input class="elecTable_input wp50 minw320 emargin" v-model="CONFIG_Path.script" :placeholder="CONFIG_Path.script_final">
            </label>
            <label class="w100">
              <span class="elabel_text" :title="'当前使用目录：'+CONFIG_Path.store_final">store 常量保存目录</span>
              <input class="elecTable_input wp50 minw320 emargin" v-model="CONFIG_Path.store" :placeholder="CONFIG_Path.store_final">
            </label>
            <label class="w100">
              <span class="elabel_text" :title="'当前使用目录：'+CONFIG_Path.shell_final">shell 指令默认执行目录</span>
              <input class="elecTable_input wp50 minw320 emargin" v-model="CONFIG_Path.shell" :placeholder="CONFIG_Path.shell_final">
            </label>
            <button class="elecBtn elecBtn--stlong emargin--d5em" @click="pathSave()">{{ $t('save') }}</button>
          </div>
        </div>
        <i class="tip">以上设置将在 elecV2P 重启后正式应用</i>
        <div class="setting setting--inline">
          <button class="emargin elecBtn elecBtn--check w220" @click="updateCheck()">检测更新 elecV2P</button>
          <button class="emargin elecBtn greenbk w220" @click="evRestart()" title="请确认已保存好当前规则及任务列表">{{ $t('restart') }} elecV2P</button>
          <button class="emargin elecBtn elecBtn--clear w220" @click="evStop()" title="如只想关闭 ANYPROXY，可在首页双击 ANRPROXY 端口">{{ $t('stop') }} elecV2P</button>
          <button class="emargin elecBtn elecBtn--file" @click="configImport()">导入配置文件</button>
          <button class="emargin elecBtn" @click="configExport()" title="确保当前页面 WEBHOOK TOKEN 是和服务器匹配的">导出当前配置</button>
        </div>
      </div>
    </main>
    <footer class="footer">
      <ul class="footer_tip">
        <li>关于配置文件的完整说明，参考文档: <a href="https://github.com/elecV2/elecV2P-dei/blob/master/docs/10-config.md" target="elecV2PDoc">10-config.md</a></li>
        <li>通知及脚本运行和网络请求相关设置对使用 nodejs 模式运行的脚本无效</li>
        <li>除了初始化相关设置之外，其他设置保存后立即生效。CTRL+S 快捷保存</li>
        <li>关于通知类相关设置参考: <a href="https://github.com/elecV2/elecV2P-dei/tree/master/docs/07-feed&notify.md" target="elecV2PDoc">07-feed.md</a>。 其他参考: <a href="https://github.com/elecV2/elecV2P-dei/tree/master/docs" target="elecV2PDoc">全部说明文档</a> 相关项</li>
      </ul>
    </footer>
    <div v-if='bShowMinishell' is="minishell"></div>
  </section>
</template>

<script>
import minishell from './minishell.vue'
import eAxios from './eAxios.vue'
import security from './security.vue'
import checkbox from '../utils/checkbox.vue'
import icon from '../utils/icon.js'
import webui from './webui.vue'
import env from './env.vue'
import { langset, setLang } from '../i18n/lang'
import { CONFIG } from '../utils/config'

export default {
  name: "setting",
  props: [],
  data(){
    return {
      icon,
      collapse: {
        notify: this.$uStr.iRandom(0, 10) > 5,
        runjs: this.$uStr.iRandom(0, 10) > 5,
        other: this.$uStr.iRandom(0, 10) > 5,
        init: true,
      },
      init_url: CONFIG.base_url,
      homepage: CONFIG.base_url,
      lang: langset.locale,
      gloglevel: 'info',
      glogslicebegin: '0',
      wbrtoken: '',
      userid: this.$uApi.store.get('userid'),
      wbrscript: {
        enable: false,
        target: '',
      },
      CONFIG_FEED: {
        enable: true,
        rss: {
          enable: true,      // 关闭/开启 FEED/RSS
          homepage: 'https://github.com/elecV2/elecV2P',  // FEED/RSS 主页
        },
        iftttid: {enable: false, key: ''},
        barkkey: {enable: false, key: ''},
        custnotify: {
          enable: false,
          url: '',
          type: 'GET',
          data: ''
        },
        runjs: {
          enable: false,
          list: ''
        },
        merge: {
          enable: true,
          gaptime: 60,
          number: 10,
          andor: false,
        },
        maxbLength: 1200,            // 通知主体最大长度。（超过后会分段发送）
        webmessage: {
          enable: false,             // 是否在网页前端显示通知
        }
      },
      CONFIG_RUNJS: {
        timeout: 5000,
        intervals: 86400,
        numtofeed: 50,
        jslogfile: true,
        eaxioslog: false,
        proxy: true,
        white: {
          enable: false,
          list: []
        }
      },
      CONFIG_Axios: {
        proxy: {
          enable: false
        },
        timeout: 5000,
        uagent: '',
        block: {
          enable: false,
          regexp: ''
        },
        only: {
          enable: false,
          regexp: ''
        },
        reject_unauthorized: true,
      },
      bShowMinishell: false,
      uagent: Object.create(null),
      CONFIG_SECURITY: {
        enable: false,
        blacklist: [],
        whitelist: [],
        cookie: {
          enable: true,
        },
        numtofeed: 0,
        webhook_only: false,
        tokens: {},
      },
      CONFIG_init: {
        checkupdate: true,
        runjsenable: true,
        runjs: '',
      },
      CONFIG_env: {
        path: '',
        other: [],
        dable: [],
      },
      anyproxy: {
        enable: true,
        port: 8001,
        webPort: 8002
      },
      webUI: {
        port: 80,
        tls: {
          enable: false,
          host: '127.0.0.1'
        },
        nav: Object.create(null),
        logo: {
          enable: false,
          src: '',
          name: ''
        },
        theme: {
          simple: {
            enable: false,
            name: '',
            mainbk: '',
            maincl: '',
            appbk: '',
            style: '',
          },
          list: [{
            "name": "简单暗黑",
            "mainbk": "#000C",
            "maincl": "#6E77FB",
            "appbk": "#000C",
            "style": ""
          }, {
            "name": "简单透明",
            "mainbk": "#0000",
            "maincl": "#FFC107",
            "appbk": "url(https://images.unsplash.com/photo-1646505183416-f3301d2a8127?auto=format)",
            "style": ".content>div,.elecBtn--long,.efssset_container,.efsslist{border: 1px solid var(--tras-bk);}.eapp_item .eapp_name,.efsslist_content .efssa{color: var(--main-cl);}.loginfo.loginfo--full{background: var(--secd-bk);}.codeditor{--main-bk: var(--secd-bk);}"
          }],
        },
      },
      CONFIG_Path: {
        config: '',
        lists: '', lists_final: '',
        script: '', script_final: '',
        store: '', store_final: '',
        shell: '', shell_final: '',
      },
      newversion: ''
    }
  },
  computed: {
    jswhitelist: {
      get(){
        return this.CONFIG_RUNJS.white.list.join(', ')
      },
      set(val){
        this.CONFIG_RUNJS.white.list = val.split(/ ?, ?|，| /)
      }
    }
  },
  components: {
    minishell, eAxios, security, checkbox, webui, env,
  },
  created() {
    const hideloading = this.$message.loading('正在获取 设置 相关数据...', 0)
    this.$axios.get('/config?type=setting').then(res=>{
      this.$message.success('CONFIG 相关数据获取成功')
      this.homepage = res.data.homepage || CONFIG.base_url
      this.gloglevel = res.data.gloglevel
      this.glogslicebegin = String(res.data.glogslicebegin || '0')
      Object.assign(this.CONFIG_SECURITY, res.data.security || {})
      Object.assign(this.CONFIG_FEED, res.data.CONFIG_FEED || {})
      Object.assign(this.CONFIG_RUNJS, res.data.CONFIG_RUNJS || {})
      Object.assign(this.CONFIG_Axios, res.data.CONFIG_Axios || {})
      Object.assign(this.CONFIG_Path, res.data.CONFIG_Path || {})
      Object.assign(this.CONFIG_init, res.data.init || {})
      Object.assign(this.anyproxy, res.data.anyproxy || {})
      if (res.data.CONFIG_env) {
        const { path, ...cself } = res.data.CONFIG_env
        this.CONFIG_env.path = path
        for (const ek in cself) {
          this.CONFIG_env.dable.push(ek)
          this.CONFIG_env.other.push([ek, cself[ek]])
        }
      }
      if (res.data.uagent) {
        for (let ua in res.data.uagent) {
          if (res.data.uagent[ua].name) {
            this.$set(this.uagent, ua, {
              name: res.data.uagent[ua].name,
              header: res.data.uagent[ua].header
            })
          }
        }
      }
      this.wbrtoken = res.data.wbrtoken
      this.userid = res.data.userid
      if (this.userid !== this.$uApi.store.get('userid')) {
        this.$uApi.store.set('userid', this.userid)
      }
      this.$uApi.store.setCache('bSponsor', this.$uApi.store.getCache('sponsors').has(this.userid))
      if (res.data.webUI) {
        Object.assign(this.webUI, res.data.webUI)
        if (res.data.webUI.nav) {
          this.$emit('menunav', { ...res.data.webUI.nav })
        }
        if (res.data.webUI.logo) {
          this.$emit('theme', { type: 'logo', ...res.data.webUI.logo })
        }
        if (this.$uApi.store.getCache('bSponsor')) {
          let rtheme = res.data.webUI.theme
          rtheme && this.$emit('theme', rtheme.simple || rtheme)
        } else {
          this.$emit('theme', { enable: false })
        }
      }
      if (res.data.lang && this.lang !== res.data.lang) {
        this.lang = res.data.lang
        this.setLanguage()
      }
      if (typeof res.data.wbrscript === 'object') {
        Object.assign(this.wbrscript, res.data.wbrscript)
      }
      this.bShowMinishell = res.data.minishell
      this.newversion = res.data.newversion
    }).catch(e=>{
      this.$message.error('获取数据失败', e)
      console.error('获取数据失败', e)
    }).finally(hideloading)
  },
  methods: {
    homepageSave() {
      if (!(this.homepage === location.origin || confirm('设置主页和当前主页 ' + location.origin + ' 不匹配，确定保存？'))) {
        return
      }
      const hideloading = this.$message.loading('主页设置保存中...', 0)
      this.$axios.put("/config", { type: "homepage", data: this.homepage }).then((response) => {
        this.$message.success('设置成功', response.data.message)
      }).catch(e=>{
        this.$message.error('设置失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    glevelSet() {
      const hideloading = this.$message.loading('全局日志设置中...', 0)
      this.$axios.put("/config", { type: "gloglevel", data: this.gloglevel }).then((response) => {
        if (response.data.rescode === 0) {
          this.$message.success('设置成功', response.data.message)
        } else {
          this.$message.error('设置失败', response.data.message)
        }
      }).catch(e=>{
        this.$message.error('设置失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    gsliceSet() {
      const hideloading = this.$message.loading('日志格式设置中...', 0)
      this.$axios.put("/config", { type: "glogslicebegin", data: this.glogslicebegin }).then((response) => {
        if (response.data.rescode === 0) {
          this.$message.success('日志格式设置成功')
          CONFIG.glogslicebegin = this.glogslicebegin
        } else {
          this.$message.error('日志格式设置失败')
        }
      }).catch(e=>{
        this.$message.error('日志格式设置失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    feedOp() {
      const hideloading = this.$message.loading('设置保存中...', 0)
      this.$axios.put("/feed", { type: "op", data: {
        enable: this.CONFIG_FEED.enable,
        maxbLength: this.CONFIG_FEED.maxbLength,
        webmessage: this.CONFIG_FEED.webmessage,
      }}).then((response) => {
        this.$message.success(`设置已保存\n${response.data.message}`)
      }).catch(e=>{
        this.$message.error('设置保存失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    feedTest() {
      const hideloading = this.$message.loading('通知准备测试中...', 0)
      this.$axios.put("/feed", { type: "test" }).then((response) => {
        if (response.data.rescode === 0) {
          this.$message.success(response.data.message)
        } else {
          console.log(response.data)
        }
      }).catch(e=>{
        this.$message.error('通知测试失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    feedClear() {
      if (!confirm('确实清空 Feed 内容吗？')) {
        return
      }
      const hideloading = this.$message.loading('Feed 清空中...', 0)
      this.$axios.put("/feed", { type: "clear" }).then((response) => {
        this.$message.success('Feed 内容已重置', response.data.message)
      }).catch(e=>{
        this.$message.error('Feed 清空失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    iftttSave() {
      if (this.CONFIG_FEED.iftttid.enable && !this.CONFIG_FEED.iftttid.key) {
        this.$message.error('请输入 IFTTT KEY 值')
        return
      }
      if (this.CONFIG_FEED.iftttid.enable || confirm('确认关闭 IFTTT 通知？')) {
        const hideloading = this.$message.loading('IFTTT 设置中...', 0)
        this.$axios.put("/feed", { type: "ifttt", data: this.CONFIG_FEED.iftttid }).then((response) => {
          this.$message.success('IFTTT 设置已保存', response.data.message)
          console.debug(response.data)
        }).catch(e=>{
          this.$message.error('设置保存失败', (e.response ? e.response.data : e.message))
          console.error(e)
        }).finally(hideloading)
      }
    },
    barkeySave() {
      if (this.CONFIG_FEED.barkkey.enable && !this.CONFIG_FEED.barkkey.key) {
        this.$message.error('请输入 BARK KEY 值')
        return
      }
      if (this.CONFIG_FEED.barkkey.enable || confirm('确认关闭 BARK 通知？')) {
        const hideloading = this.$message.loading('barkkey 设置中...', 0)
        this.$axios.put("/feed", { type: "barkkey", data: this.CONFIG_FEED.barkkey }).then((response) => {
          this.$message.success('barkkey 设置已保存', response.data.message)
          console.debug(response.data)
        }).catch(e=>{
          this.$message.error('设置失败', (e.response ? e.response.data : e.message))
          console.error(e)
        }).finally(hideloading)
      }
    },
    custnotifySave() {
      if (this.CONFIG_FEED.custnotify.enable && !this.CONFIG_FEED.custnotify.url) {
        this.$message.error('请输入自定义通知链接')
        return
      }
      if (this.CONFIG_FEED.custnotify.enable || confirm('确认关闭自定义通知？')) {
        const hideloading = this.$message.loading('更新自定义通知相关设置中...', 0)
        this.$axios.put("/feed", { type: "custnotify", data: this.CONFIG_FEED.custnotify }).then((response) => {
          this.$message.success('自定义通知设置已保存', response.data.message)
          console.debug(response.data)
        }).catch(e=>{
          this.$message.error('设置失败', (e.response ? e.response.data : e.message))
          console.error(e)
        }).finally(hideloading)
      }
    },
    notifyjsSave() {
      if (this.CONFIG_FEED.runjs.enable && !this.CONFIG_FEED.runjs.list) {
        this.$message.error('请输入要触发的脚本')
        return
      }
      if (this.CONFIG_FEED.runjs.enable || confirm('确认关闭触发脚本？')) {
        const hideloading = this.$message.loading('通知触发脚本设置保存中...', 0)
        this.$axios.put('/feed', { type: 'runjs', data: this.CONFIG_FEED.runjs }).then((response) => {
          this.$message.success(`设置已保存\n${response.data.message}`)
          console.debug(response.data)
        }).catch(e=>{
          this.$message.error('设置保存失败', (e.response ? e.response.data : e.message))
          console.error(e)
        }).finally(hideloading)
      }
    },
    wbrtokenSave() {
      if (!this.wbrtoken) {
        this.$message.error('请先输入 TOKEN 值')
        return
      }
      if (this.wbrtoken.length < 12) {
        this.$message.error('当前设置 TOKEN 太短，请重新填写')
        return
      }
      const hideloading = this.$message.loading('TOKEN 上传设置中...', 0)
      this.$axios.put('/config', { type: 'wbrtoken', data: this.wbrtoken }).then((response) => {
        if (response.data.rescode === 0) {
          if (response.data.resdata && this.userid !== response.data.resdata.userid) {
            this.userid = response.data.resdata.userid
            this.$uApi.store.set('userid', this.userid)
          }
          this.$message.success('设置成功', response.data.message)
        } else {
          this.$message.error('WEBHOOK TOKEN 修改失败', response.data.message)
        }
        console.debug(response.data)
      }).catch(e=>{
        this.$message.error('设置失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    wbrscriptSave(){
      if (this.wbrscript.enable && !this.wbrscript.target) {
        this.$message.error('请先设置 WEBHOOK SCRIPT 处理脚本')
        return
      }
      const hideloading = this.$message.loading('WEBHOOK SCRIPT 设置中...', 0)
      this.$axios.put('/config', { type: 'wbrscript', data: this.wbrscript }).then((response) => {
        if (response.data.rescode === 0) {
          this.$message.success('设置成功', response.data.message)
        } else {
          this.$message.error('WEBHOOK SCRIPT 设置失败', response.data.message)
        }
      }).catch(e=>{
        this.$message.error('WEBHOOK SCRIPT 设置失败', e.message)
        console.error('WEBHOOK SCRIPT 设置', e)
      }).finally(hideloading)
    },
    mergeSave(){
      const hideloading = this.$message.loading('默认通知设置中...', 0)
      this.$axios.put('/feed', { type: 'merge', data: { rssenable: this.CONFIG_FEED.rss.enable, merge: this.CONFIG_FEED.merge }}).then((response) => {
        this.$message.success(`设置已保存\n${response.data.message}`)
        console.debug(response.data)
      }).catch(e=>{
        this.$message.error('设置失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    runjsSave(){
      const hideloading = this.$message.loading('脚本运行相关设置保存中...', 0)
      this.$axios.put('/config', { type: 'runjs', data: this.CONFIG_RUNJS }).then((response) => {
        if (response.data.rescode === 0) {
          this.$message.success('脚本运行相关设置保存成功', response.data.message)
        } else {
          this.$message.error('脚本运行相关设置保存失败', response.data.message)
          console.error(response.data)
        }
      }).catch(e=>{
        this.$message.error('脚本运行相关设置保存失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    initSave(){
      const hideloading = this.$message.loading('启动时 相关设置保存中...', 0)
      this.$axios.put("/config", {
        type: 'init',
        data: {
          CONFIG_init: this.CONFIG_init
        }
      }).then((response) => {
        if (response.data.rescode === 0) {
          this.$message.success('启动时相关设置保存成功', response.data.message)
        } else {
          this.$message.error('启动时相关设置修改失败')
        }
      }).catch(e=>{
        this.$message.error('启动时相关设置保存失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    anyproxySave(){
      if (!(this.anyproxy.port && this.anyproxy.webPort)) {
        this.$message.error('请正确填写端口相关数据')
        return
      }
      if (this.anyproxy.enable || confirm('确定在下次启动 elecV2P 时不打开 ANYPROXY 吗？')) {
        const hideloading = this.$message.loading('ANYPROXY 相关设置保存中...', 0)
        this.$axios.put("/config", { type: 'anyproxy', data: this.anyproxy }).then((response) => {
          if (response.data.rescode === 0) {
            this.$message.success('ANYPROXY 设置保存成功')
          } else {
            this.$message.error('ANYPROXY 设置修改失败', response.data.message)
            console.error(response.data)
          }
        }).catch(e=>{
          this.$message.error('设置失败', e.message)
          console.log(e)
        }).finally(hideloading)
      }
    },
    webUIPortSave(){
      if (confirm('确定将 webUI 主界面端口更改为: ' + this.webUI.port + ' 吗？(下次启动时应用)')) {
        const hideloading = this.$message.loading('webUI 主界面端口修改保存中...', 0)
        this.$axios.put("/config", { type: 'webUIPort', data: this.webUI }).then((response) => {
          if (response.data.rescode === 0) {
            this.$message.success('webUI 端口设置保存成功')
          } else {
            this.$message.error('webUI 端口设置修改失败', response.data.message)
            console.error(response.data)
          }
        }).catch(e=>{
          this.$message.error('webUI 端口设置失败', e.message)
          console.log(e)
        }).finally(hideloading)
      }
    },
    pathSave(){
      const hideloading = this.$message.loading('用户数据保存目录设置中...', 0)
      const { lists, script, store, shell } = this.CONFIG_Path
      this.$axios.put("/config", {
        type: 'datapath',
        data: {
          lists, script, store, shell,
        }
      }).then((response) => {
        if (response.data.rescode === 0) {
          this.$message.success(`用户数据保存目录设置成功 重启后正式生效`)
        } else {
          this.$message.error('用户数据保存目录设置失败', response.data.message)
        }
      }).catch(e=>{
        this.$message.error('设置保存失败', e.message)
        console.log(e)
      }).finally(hideloading)
    },
    saveAll(){
      const hideloading = this.$message.loading('配置数据上传中...', 0)
      this.$axios.put("/config", {
        type: "config",
        data: {
          homepage: this.homepage,
          lang: this.lang,
          gloglevel: this.gloglevel,
          glogslicebegin: this.glogslicebegin,
          CONFIG_FEED: this.CONFIG_FEED,
          CONFIG_RUNJS: this.CONFIG_RUNJS,
          CONFIG_Axios: this.CONFIG_Axios,
          wbrtoken: this.wbrtoken,
          webhook: {
            script: this.wbrscript,
          },
          path_lists: this.CONFIG_Path.lists,
          path_script: this.CONFIG_Path.script,
          path_store: this.CONFIG_Path.store,
          path_shell: this.CONFIG_Path.shell,
          webUI: this.webUI,
          SECURITY: this.CONFIG_SECURITY,
          init: this.CONFIG_init
        }
      }).then((response) => {
        this.$message.success(`当前设置保存成功\n${response.data.message}`)
      }).catch(e=>{
        this.$message.error('设置保存失败', e.message)
        console.log('设置保存失败', e)
      }).finally(hideloading)
    },
    configExport(){
      this.$uApi.downloadFile('/config?token='+this.wbrtoken, 'config.json')
    },
    async configImport(){
      if (!confirm('导入配置文件将会覆盖当前所有设置，并在重启后正式生效\n确认继续？')) {
        return
      }
      let file = await this.$uApi.getFile({ accept: '.json' })
      if (file) {
        file.content = this.$uStr.sJson(file.content);
        if (!file.content) {
          this.$message.error('当前导入文件并不是正确的 JSON 格式');
          return;
        }
        this.$axios.post('/config', { file }).then(res=>{
          if (res.data.rescode === 0) {
            this.$message.success('配置文件导入成功，将在重启后正式生效', res.data.message)
          } else {
            this.$message.error('配置文件导入失败', res.data.message)
          }
          console.debug('配置文件导入结果', res.data)
        }).catch(e=>{
          this.$message.error('配置文件导入失败', e.message)
          console.error('配置文件导入失败', e)
        })
      } else {
        this.$message.error('请选择正确的配置文件进行导入')
      }
    },
    setLanguage() {
      const clang = setLang(this.lang)
      this.$forceUpdate()
      return clang
    },
    langSave(){
      if (this.lang === langset.locale) {
        this.$message.success(`当前语言偏好为 ${this.lang} 未做修改`)
        return
      }
      const hideloading = this.$message.loading('语言偏好设置保存中...', 0)
      this.$axios.put('/config', { type: 'lang', data: this.lang }).then(response => {
        if (response.data.rescode === 0) {
          let clang = this.setLanguage()
          this.$message.success('成功设置当前语言偏好为', clang)
        } else {
          this.$message.error('语言偏好修改失败', response.data.message)
        }
      }).catch(e=>{
        this.$message.error('语言偏好设置失败', e.message)
        console.log('语言偏好设置失败', e)
      }).finally(hideloading)
    },
    evRestart(){
      if (confirm('即将尝试重启 elecV2P，请提前保存好规则及任务列表，确定继续？')) {
        this.$axios.post('/webhook', {
          token: this.wbrtoken, type: 'shell',
          command: 'pm2 restart elecV2P',
        }).then(res=>{
          // 有返回说明重启失败
          this.$message.error('重启失败', res.data.message)
        }).catch(e=>{
          this.$message.success('重启命令已发送，将在 5 秒后自动刷新该页面')
          setTimeout(()=>location.reload(), 5e3)
        })
      }
    },
    evStop(){
      if (confirm('关闭 elecV2P 后，当前网页、定时任务以及 ANYPROXY 都将不可用，确定继续？')){
        this.$axios.post('/webhook', {
          token: this.wbrtoken, type: 'shell',
          command: 'pm2 stop elecV2P',
        }).then(res=>{
          // 有返回说明关闭失败
          this.$message.error('关闭失败', res.data.message)
        }).catch(e=>{
          this.$message.success('关闭命令已发送，即将自动跳转到首页')
          setTimeout(()=>location.reload(), 5e3)
        })
      }
    },
    updateCheck(){
      if (this.newversion) {
        this.$message.success('检测到新版本 v' + this.newversion + '\n请手动运行 softupdate.js 或者使用 docker 命令进行更新\n（等 softupdate.js 稳定后将会集成到这里实现自动更新）')
        return
      }
      const hideloading = this.$message.loading('正在检测 elecV2P 是否有新的版本可供更新...', 0)
      this.$axios.get('/data?type=update&force=true').then(res=>{
        if (res.data.updateversion) {
          this.$message.success('检测到新版本 elecV2P v' + res.data.updateversion + '\n请手动运行 softupdate.js 或者使用 docker 命令进行更新\n（等 softupdate.js 稳定后将会集成到这部分以实现自动更新）')
          this.newversion = res.data.updateversion
        } else {
          this.$message.success(res.data.message + '\n当前 elecV2P v' + res.data.version + ' 已是最新版本')
        }
      }).catch(e=>{
        this.$message.error('检测更新失败', e.message)
        console.error('检测更新失败', e)
      }).finally(hideloading)
    }
  }
}
</script>

<style scoped>
:deep(.setting) {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  align-items: center;
  box-sizing: border-box;
  word-break: break-word;
  width: 100%;
  overflow: hidden;
  padding: .2em .5em;
  margin: 0;
  margin-bottom: .6em;
  border-radius: var(--radius-bs);
  font-size: 20px;
  text-align: center;
  background: var(--main-bk);
  color: var(--main-cl);
}

:deep(.setting--vflex) {
  flex-direction: column;
}

:deep(.setting--inline) {
  padding: 0;
  margin: 3px 0;
}

:deep(.setting_title) {
  display: inline-flex;
  width: 100%;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding-bottom: 3px;
  text-align: center;
  border-bottom: 1px solid;
  font-size: 24px;
  color: var(--main-fc);
}

:deep(.setting--collapsed > .setting_title) {
  border-bottom: none;
}

:deep(.setting_label) {
  width: 220px;
  min-width: 120px;
  font-size: 20px;
  color: var(--main-cl);
}

:deep(.setting_select),
:deep(.setting_input) {
  height: 40px;
  width: 60%;
  max-width: 100%;
  min-width: 100px;
  padding: 0 6px;
  text-align: center;
  border: none;
  border-radius: 8px;
  box-sizing: border-box;
  font-size: 20px;
  font-family: var(--font-fm);
  color: var(--main-cl);
}

:deep(.setting_input--middle) {
  width: 48%;
  min-width: 320px;
}

:deep(.setting_input--number) {
  width: 108px;
}

:deep(.setting--collapsed) {
  height: 42px;
  flex-flow: column;
}

.setting--home, .setting--log {
  margin-bottom: 0;
  border-radius: 0;
  border-bottom: 1px solid var(--main-fc);
  padding: .3em .5em;
}
.setting--home {
  padding-top: .5em;
  border-radius: var(--radius-bs) var(--radius-bs) 0 0;
}
.setting--webhook {
  border-radius: 0 0 var(--radius-bs) var(--radius-bs);
}
.setting--config {
  border: 1px solid;
  padding: 0;
  margin-bottom: 3px;
}

.incon {
  position: relative;
  display: inline-block;
  width: 60%;
}

.incon_input {
  width: 100%;
}

.incon_icon {
  position: absolute;
  margin-left: -28px;
  margin-top: 6px;
  font-size: 26px;
  color: var(--main-cl);
}

.setting--collapsed > .setting,
.setting--collapsed > .setting--notify,
.setting--collapsed > .setting--other,
.setting--collapsed > .tip,
.setting--collapsed > .elecBtn {
  display: none;
}

.setting--other {
  border: 1px solid var(--main-cl);
  border-radius: var(--radius-bs);
  margin: 8px 0 0;
  padding: 8px 0 0;
}

.setting--init {
  margin-bottom: 0;
}
.setting--init .setting--inline {
  border: 1px solid;
  padding: 8px 0;
}

.setting_title--flex {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 6px;
  font-size: 20px;
}

.setting_label--flex {
  display: inline-flex;
  align-items: center;
  width: fit-content;
}

.setting_select--short {
  width: 100px;
}

.setting_andor {
  display: inline-block;
  height: 40px;
  width: 72px;
  min-width: 72px;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0;
  text-align: center;
  line-height: 40px;
  border-radius: 8px;
  font-size: 20px;
  color: var(--main-fc);
  background: var(--secd-bk);
  cursor: pointer;
}

.setting--notify {
  display: inline-flex;
  align-content: center;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
  padding: 3px 0;
  border-bottom: 1px solid var(--main-fc);
}
.setting--notify:last-child {
  border: none;
}
</style>