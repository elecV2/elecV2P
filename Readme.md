## 简介

elecV2P - customize personal network.
一款基于 NodeJS，可通过 JS 修改网络请求，以及定时运行脚本或 SHELL 指令的网络工具。

![elecV2P overview/预览](https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/docs/res/overview.png)

### 基础功能

- 查看/修改网络请求 (MITM)
- 定时执行 JS/SHELL 脚本
- FEED/IFTTT/自定义 通知
- EFSS 基础文件管理

## 安装/INSTALL

***程序开放权限极大，建议局域网使用。公网部署（务必参考 [Advanced.md](https://github.com/elecV2/elecV2P-dei/blob/master/docs/Advanced.md)），风险自负***

*elecV2P 所有文件及依赖总大小约 90 M。初始运行时内存占用约 90 M，运行 100 个定时任务时总内存占用约 150 M（仅供参考，不同软硬件条件下程序调用资源可能有所不同）*

**在可使用 Docker 的情况下，推荐使用方法三进行安装**

### 方法一：直接 NODEJS 运行

**需求 NODEJS 版本 (node -v) >= 14.17.0**

``` sh
git clone https://github.com/elecV2/elecV2P.git
cd elecV2P

# 安装依赖库（根据网络环境和硬盘读写速度，需要 1-10 分钟不等
yarn

# elecV2P 默认以 pm2 的方式启动，需要先安装好 pm2
# pm2 的安装方式:
# 1. 添加 elecV2P 所在目录/node_modules/.bin 到系统环境变量 PATH 中
# 2. 或者直接执行 yarn global add pm2
# 然后执行命令
yarn start

# 其他基础方式启动命令
node index.js
# 假如提示 80 端口不可用，尝试命令
# windows 平台 CMD:
# set PORT=8000 && node index.js
# windows 平台 PowerShell:
# $env:PORT="8000";node index.js
# 其他平台：
# PORT=8000 TZ=Asia/Shanghai node index.js
## TZ=Asia/Shanghai 用于设置程序运行时区
```

#### 升级

方式一：使用 [softupdate.js](https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/softupdate.js) 软更新升级

- 首先在 webUI/JSMANAGE 脚本管理中找到 softupdate.js 文件，假如不存在就远程推送或本地上传一下
- 然后按照文件内的说明，根据自身需求更改 CONFIG 设置项
- 最后点击测试运行即可

方式二：手动升级（不推荐

- 先备份好个人数据，比如 根证书，以及 efss、script/JSFile、Store、Lists、Shell 等文件夹
- （推荐在 webUI/efss 界面，右键对应文件夹，然后 zip 打包下载。）
- 然后在项目目录下执行命令 git pull，拉取最新的代码进行覆盖升级
- 最后再把备份好的文件上传/复制还原到之前的位置

### 其他 PM2 相关指令

``` sh
pm2 stop elecV2P  # 停止 elecV2P
pm2 stop all      # 停止所有程序

pm2 restart elecV2P   # 重启 elecV2P
pm2 restart 0

pm2 ls      # 查看运行状态
pm2 logs --raw    # 查看运行日志

pm2 -h      # 查看 PM2 帮助列表
```

### 方法二：DOCKER

镜像名称: elecv2/elecv2p
镜像地址: https://hub.docker.com/r/elecv2/elecv2p

``` sh
# 基础使用命令
docker run --restart=always -d --name elecv2p -e TZ=Asia/Shanghai -p 80:80 -p 8001:8001 -p 8002:8002 elecv2/elecv2p

# 推荐使用命令
docker run --restart=always \
  -d --name elecv2p \
  -e TZ=Asia/Shanghai \
  -p 8100:80 -p 8101:8001 -p 8102:8002 \
  -v /elecv2p/JSFile:/usr/local/app/script/JSFile \
  -v /elecv2p/Lists:/usr/local/app/script/Lists \
  -v /elecv2p/Store:/usr/local/app/script/Store \
  -v /elecv2p/Shell:/usr/local/app/script/Shell \
  -v /elecv2p/rootCA:/usr/local/app/rootCA \
  -v /elecv2p/efss:/usr/local/app/efss \
  elecv2/elecv2p

# -p/-v 对应参数 宿主:容器
# 如需更改默认的 80 端口，可在 -e 后面加上 PORT=8000
# 升级 Docker 镜像（如果没有使用 -v 持久化存储，容器内数据会丢失，请提前备份）
docker rm -f elecv2p           # 先删除旧的容器
docker pull elecv2/elecv2p     # 再拉取新的镜像
# 再使用之前的 docker run xxxx 命令重新启动一下
# 如果拉取到的镜像不是最新的版本，请修改 Docker 当前使用的仓库地址
```

- ARM32 平台如果出错，参考 [issues #78](https://github.com/elecV2/elecV2P/issues/78)
- v3.7.3 之后 Github Actions 一直无法生成 ARM32 平台的 Docker。建议通过软更新脚本进行升级 [softupdate.js](https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/softupdate.js) 。（其他平台的 Docker 不受影响）

### 方法三：DOCKER-COMPOSE （推荐）

``` sh
# 创建 elecV2P 持久化数据保存目录
mkdir /elecv2p && cd /elecv2p
# 假如失败，请尝试在其他有权限的目录进行创建
# 后面 docker-compose.yaml 映射目录保持和创建的目录一致

# 下载 docker-compose.yaml 文件
curl -sL https://git.io/JLw7s > docker-compose.yaml
# 启动运行 elecV2P
docker-compose up -d

# 注意: 需提前安装好 docker-compose 管理器
# 默认将 80/8001/8002 端口分别映射到了宿主机的 8100/8101/8102 端口，以防出现占用的情况
# 如果需要设置为其他端口，请自行修改 docker-compose.yaml 文件内容，然后重新启动
```

以下为 docker-compose.yaml 文件内容，可根据自身需求进行修改。

``` yaml
version: '3.7'
services:
  elecv2p:
    image: elecv2/elecv2p
    container_name: elecv2p
    restart: always
    environment:
      - TZ=Asia/Shanghai
    ports:
      - "8100:80"
      - "8101:8001"
      - "8102:8002"
    volumes:
      - "/elecv2p/JSFile:/usr/local/app/script/JSFile"
      - "/elecv2p/Lists:/usr/local/app/script/Lists"
      - "/elecv2p/Store:/usr/local/app/script/Store"
      - "/elecv2p/Shell:/usr/local/app/script/Shell"
      - "/elecv2p/rootCA:/usr/local/app/rootCA"
      - "/elecv2p/efss:/usr/local/app/efss"
```

修改后保存文件，然后在 docker-compose.yaml 文件所在目录下执行以下任一命令

``` sh
# 直接启动（首次启动命令）
docker-compose up -d

# 更新镜像并重新启动
docker-compose pull elecv2p && docker-compose up -d
```

- 如果在某些设备上无法启动，尝试把文件开头的 version: '3.7' 更改为 version: '3.3'
- ARM32 平台如果出错，参考 [issues #78](https://github.com/elecV2/elecV2P/issues/78)

其他 docker 相关指令

``` sh
# 查看是否启动及对应端口
docker ps

# 查看 elecV2P 运行日志
docker logs elecv2p -f
```

## 默认端口

- 80：    webUI 后台管理界面。用于添加规则/管理脚本/定时任务/MITM 证书 等
- 8001：  ANYPROXY HTTP 代理端口。（*代理端口不是网页，不能通过浏览器直接访问*）
- 8002：  ANYPROXY 代理请求查看端口

**ANYPROXY 相关端口默认关闭。可在 webUI 首页双击 ANYPROXY 临时开启。**
**如需在启动时自动开启，请前往 webUI->SETTING->初始化相关设置 中进行设置。**
**80/8002 对应端口需要用到 websocket，在使用 nginx 等反代工具时注意设置。参考 [ev2p-nginx.conf](https://github.com/elecV2/elecV2P-dei/blob/master/examples/ev2p-nginx.conf)**

- *80 端口可使用环境变量 **PORT** 进行修改(比如: PORT=8000 node index.js)*
- *在 elecV2P 已经启动时，可在 webUI->SETTING->初始化相关设置 中修改其他端口*
- *在 elecV2P 尚未启动时，可在 script/Lists/config.json 文件中修改对应端口*

## 根证书相关 - HTTPS 解密

- *如果不使用 RULES/REWRITE 等 MITM 相关功能，此步骤可跳过。*
- *升级启动后，如果不是使用之前的证书，需要重新下载安装信任根证书。*
- *根证书包含两个文件 rootCA.crt/rootCA.key，文件名不可修改。*

### 安装证书

选择以下任意一种方式下载证书，然后安装并信任

- 直接打开 :80/crt
- :80 -> MITM -> 安装证书
- :8002 -> RootCA

根证书物理存储目录位于 `$HOME/.anyproxy/certificates`。

*windows 平台的证书存储位置选择 浏览->受信任的根证书颁发机构*

### 使用自签根证书

在 webUI->MITM 界面上传自签根证书，然后重启 elecV2P

**注意：使用新的证书后，记得重新下载安装信任证书，并清除由之前根证书签发的域名证书。**

## RULES - 网络请求修改

![rules](https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/docs/res/rules.png)

详细说明参考: [docs/03-rules.md](https://github.com/elecV2/elecV2P-dei/tree/master/docs/03-rules.md)

## 定时任务

![task](https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/docs/res/taskall.png)

支持两种定时方式：

- 倒计时
- cron 定时

### 时间格式：

- 倒计时 30 999 3 2  (以空格分开的四个数字，后三项可省略)

|    30（秒）    |     999（次）   |      3（秒）         |       2（次）       
:--------------: | :-------------: | :------------------: | :------------------:
| 基础倒计时时间 | 重复次数（可选）| 增加随机时间（可选） | 增加随机重复次数（可选）  


- *当重复次数大于等于 **999** 时，无限循环*

示例: 40 8 10 3 ，表示倒计时40秒，随机10秒，所以具体倒计时时间位于 40-50 秒之间，重复运行 8-11 次

- cron 定时 

时间格式：* * * * * * （五/六位 cron 时间格式）

| * (0-59)   |  * (0-59)  |  * (0-23)  |  * (1-31)  |  * (1-12)  |  * (0-7)      
:----------: | :--------: | :--------: | :--------: | :--------: | :---------:
| 秒（可选） |    分      |    小时    |     日     |     月     |    星期


### 可执行任务类型

- 运行 JS
- 开始/停止 其他定时任务
- 基础 shell 指令。比如 *rm -f \**, *python test.py*, *reboot* 等等

更多说明参考：[docs/06-task.md](https://github.com/elecV2/elecV2P-dei/tree/master/docs/06-task.md)

## 通知

目前支持通知方式：
- FEED/RSS 订阅
- IFTTT WEBHOOK
- BARK 通知
- 自定义通知

FEED/RSS 订阅地址为 webUI/feed。

通知内容：
- 定时任务开始/结束
- 定时任务 JS 运行次数
- 脚本中的自主调用通知

IFTTT/BARK/自定义通知等相关设置参考: [07-feed&notify](https://github.com/elecV2/elecV2P-dei/tree/master/docs/07-feed&notify.md)

## DOCUMENTS&EXAMPLES

说明文档及一些例程: [https://github.com/elecV2/elecV2P-dei](https://github.com/elecV2/elecV2P-dei)

如果遇到问题欢迎 [open a issue](https://github.com/elecV2/elecV2P/issues)。尽量说明使用平台，版本，以及附上相关的错误日志（提供的信息越详细，越有助于解决问题）。

TG 频道: https://t.me/elecV2
TG 交流群: https://t.me/elecV2G

## 更新日志

查看: https://github.com/elecV2/elecV2P/blob/master/logs/update.log

## 贡献参考

- [anyproxy](https://github.com/alibaba/anyproxy)
- [axios](https://github.com/axios/axios)
- [expressjs](https://expressjs.com)
- [node-cron](https://github.com/merencia/node-cron)
- [node-rss](https://github.com/dylang/node-rss)
- [pm2](https://pm2.keymetrics.io)
- [vue](https://vuejs.org)
- [vue-draggable-resizable](https://github.com/mauricius/vue-draggable-resizable)
- [ace](https://github.com/ajaxorg/ace)
- [adm-zip](https://github.com/cthackers/adm-zip)
- [Ant Design Vue](https://www.antdv.com)