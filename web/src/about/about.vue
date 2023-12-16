<template>
  <section>
    <header class="header">{{ header }}</header>
    <main class="content">
      <div class="about">
        <h4 class="about_title">简介</h4>
        <p>elecV2P - customize personal network.</p>
        <p>elecV2P 是一款基于 NodeJS，可通过 JS 修改网络请求，以及定时运行脚本或 SHELL 指令的网络工具。</p>
        <br>
        <p>项目地址：<a href="https://github.com/elecV2/elecV2P" target="elecV2PGit">https://github.com/elecV2/elecV2P</a><br>说明文档：<a href="https://github.com/elecV2/elecV2P-dei/tree/master/docs" target="elecV2PDoc">https://github.com/elecV2/elecV2P-dei/tree/master/docs</a></p>

        <h4 class="about_title">功能</h4>
        <ul>
          <li>查看/修改 网络请求 (MITM)</li>
          <li>定时执行 JS/SHELL 脚本</li>
          <li>FEED/IFTTT/自定义 通知</li>
          <li>EFSS 基础文件管理</li>
        </ul>

        <h4 class="about_title">项目已开源</h4>
        <p>前端源文件位于 web/src 目录，修改后使用 yarn build 命令进行打包。</p>
        <p>在使用时，如果有任何问题或建议，欢迎一起交流 <a href="https://github.com/elecV2/elecV2P/issues" target="elecV2PGit">open a issue</a>。</p>

        <h4 class="about_title">贡献/参考</h4>
        <ul>
          <li><a href="https://github.com/alibaba/anyproxy" target="_blank">anyproxy</a></li>
          <li><a href="https://github.com/axios/axios" target="_blank">axios</a></li>
          <li><a href="https://github.com/cheeriojs/cheerio" target="_blank">cheerio</a></li>
          <li><a href="https://expressjs.com" target="_blank">express</a></li>
          <li><a href="https://github.com/merencia/node-cron" target="_blank">node-cron</a></li>
          <li><a href="https://github.com/dylang/node-rss" target="_blank">node-rss</a></li>
          <li><a href="https://pm2.keymetrics.io/" target="_blank">pm2</a></li>
          <li><a href="https://vuejs.org" target="_blank">vue</a></li>
          <li><a href="https://github.com/mauricius/vue-draggable-resizable" target="_blank">vue-draggable-resizable</a></li>
          <li><a href="https://github.com/ajaxorg/ace" target="_blank">ace</a></li>
          <li><a href="https://github.com/cthackers/adm-zip" target="_blank">adm-zip</a></li>
          <li><a href="https://www.antdv.com" target="_blank">Ant Design Vue</a></li>
        </ul>
      
        <h5 class="about_tip">
          <i> • Don't be evil. <small>(Because I am already one)</small></i>
        </h5>
      </div>
    </main>
    <footer class="footer footer--h48">
      <a href="https://github.com/elecV2/elecV2P" target="elecV2PGit"><i aria-label="icon: github" class="icon icon-github"><svg viewBox="64 64 896 896" data-icon="github" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false" class=""><path d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"></path></svg></i> Github </a>
      <a href="https://t.me/elecV2" target="elecV2PTG"><i aria-label="icon: robot" class="icon icon-robot"><svg viewBox="64 64 896 896" data-icon="robot" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false" class=""><path d="M300 328a60 60 0 1 0 120 0 60 60 0 1 0-120 0zM852 64H172c-17.7 0-32 14.3-32 32v660c0 17.7 14.3 32 32 32h680c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32zm-32 660H204V128h616v596zM604 328a60 60 0 1 0 120 0 60 60 0 1 0-120 0zm250.2 556H169.8c-16.5 0-29.8 14.3-29.8 32v36c0 4.4 3.3 8 7.4 8h729.1c4.1 0 7.4-3.6 7.4-8v-36c.1-17.7-13.2-32-29.7-32zM664 508H360c-4.4 0-8 3.6-8 8v60c0 4.4 3.6 8 8 8h304c4.4 0 8-3.6 8-8v-60c0-4.4-3.6-8-8-8z"></path></svg></i> Telegram </a>
    </footer>
  </section>
</template>

<script>
  export default {
    name: "about",
    data(){
      return {
        header: 'ABOUT'
      }
    }
  }
</script>

<style scoped>
.about {
  padding: .5em 1.5em;
  border-radius: var(--radius-bs);
  color: var(--main-fc);
}

.about_title {
  font-size: 20px;
  margin: 1.5em 0 .3em;
}
.about_title:first-child {
  margin-top: 0;
}

.about_tip {
  margin-top: 1em;
}
</style>