## 简介

一款网络工具。 - customize personal network

### 基础功能

- 获取/查看  网络请求
- 拦截/自定义网络请求
- MITM（需安装证书）
- JS 脚本运行
- 定时任务（倒计时/cron 定时）
- 定时任务通知

## 安装/install

### nodejs （不推荐）

``` sh
yarn
yarn start
```

如果要在移动设备上使用 MITM 功能，可能需要手动将 `node_modules/node-easy-cert/dist/certGenerator.js` 第 30 行的 **1024** 改为 **2048**

``` js
function getKeysAndCert(serialNumber) {
  var keys = forge.pki.rsa.generateKeyPair(1024);    // before
  var keys = forge.pki.rsa.generateKeyPair(2048);    // before
  ...
}
```

*docker 已进行修改，无需进行以上操作*

### docker

``` sh
docker run --restart=always -d --name elecv2p -p 80:80 -p 8001:8001 -p 8002:8002 -p 8005:8005 elecv2/elecv2p
```

### docker-compose （推荐）

docker-compose.yaml
```
version: '3.7'
services:
  elecv2p:
    image: elecv2/elecv2p
    restart: always
    environment:
      - TZ=Asia/Shanghai
    ports:
      - "8100:80"
      - "8101:8001"
      - "8102:8002"
      - "8005:8005"
    volumes:
      - "/elecv2p/JSFile:/usr/local/app/runjs/JSFile"
      - "/elecv2p/Lists:/usr/local/app/runjs/Lists"
      - "/elecv2p/Store:/usr/local/app/runjs/Store"
```

``` sh
docker-compose up -d
```

*建议在本地运行（旁路由/软路由 等）*

## 端口说明

- 80：    软件主界面。添加规则/JS 文件管理/定时任务管理/MITM 证书 等
- 8001：  anyproxy 代理端口
- 8002：  anyproxy 连接查看
- 8005：  websocket 通信


## 使用说明

### 根证书相关 - https 解密

#### 安装证书

选择以下任一种方式下载证书，然后安装信任证书

- 直接打开 :80/crt
- :80 -> MITM -> 安装证书
- :8001 -> RootCA

根证书位于 `$HOME/.anyproxy/certificates` 目录，可用自签证书替换

#### 启用自签证书

任选一种方式

- 将根证书（rootCA.crt/rootCA.key）复制到本项目 **rootCA** 目录，然后 :80 -> MITM -> 启用自签证书
- 直接将根证书复制到 **$HOME/.anyproxy/certificates** 目录下

使用新的证书后，记得重新下载安装信任，并清除由之前根证书签发的域名证书。

### rules - 网络请求修改规则

![rules](https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/docs/res/rules.png)

详见 [docs/rules.md](https://github.com/elecV2/elecV2P-dei/tree/master/docs/03-rules.md) （龟速完成中）

## 定时任务

![task](https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/docs/res/task.png)

目前支持两种定时方式：
- 倒计时 schedule
- 定时 cron

### 时间格式：

- 倒计时 30 999 3 2  (以空格分开的四个数字，后三项可省略)

    30（秒）    |     999（次）   |      3（秒）         |       2（次）       
:-------------: | :-------------: | :------------------: | :------------------:
 基础倒计时时间 | 重复次数（可选）| 增加随机时间（可选） | 增加随机重复次数（可选）  

*当重复次数大于等于 **999** 时，无限循环。*

示例： 400 8 10 3 ，表示倒计时40秒，随机10秒，所以具体倒计时时间位于 40-50 秒之间，重复运行 8-11 次

- cron 定时 

时间格式：* * * * * * （五/六位 cron 时间格式）

  * (0-59)   |  * (0-59)  |  * (0-23)  |  * (1-12)  |  * (1-31)  |  * (0-7)      
:----------: | :--------: | :--------: | :--------: | :--------: | :---------:
  秒（可选） |    分      |    小时    |      月    |     日     |    星期


### 可执行任务类型

- 运行 JS
- 开始/停止 其他定时任务

## 通知

目前支持两种通知模式： feed/rss 和 ifttt

feed/rss 地址为 :80/feed。

ifttt 通知需先在设置（setting）面板添加 key。目前 ifttt 通知是整合到 feed 模块里面的，即两项通知内容一样。

通知内容：

- 定时任务开始/结束
- 定时任务 JS 运行次数（默认运行 50 次通知一次）

## docs

更多： [说明文档](https://github.com/elecV2/elecV2P-dei) - 龟速完成中

### 简单声明

该项目仅用于学习交流，任何使用一切后果自负。

## 贡献

- [anyproxy](https://github.com/alibaba/anyproxy)
- [axios](https://github.com/axios/axios)
- [expressjs](https://expressjs.com)
- [node-rss](https://github.com/dylang/node-rss)
- [vue](http://vuejs.org/)
- [Ant Design Vue](https://www.antdv.com)