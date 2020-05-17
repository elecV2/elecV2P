# 注意!!!
- 暂时没有开源的计划
- HTTPS 解密需要安装/信任一个根证书，其中的使用风险请知悉。（根证书可用自己的替换）
- 这注定是一个很折腾过程

- # 总之，不要代理敏感网站数据

## 功能说明

- ### mitm 中间代理，运行 surge/quanx 等 js 脚本（把 surge/quantumultx 等软件的 MITM 功能通过代理实现，且无任何限制）
- 端口：
  - 8001：代理端口
  - 8002：连接查看
  - 80： 软件设置（debug: 12521）

每成功匹配并运行一次 js ，服务器都会显示 `runjs: 对应 JS 文件`

#### *建议运行在本地（旁路由/软路由 等）*

## 根证书相关

- 首次启动会在 `$HOME/.anyproxy/certificates` 目录下生成一个新的根证书
- 此根证书可用自签证书手动替换（注意信任新的根证书）

### 项目目录 rootCA

你的根证书，可不放置，后期会自动生成

- 放置自签证书
- rootCA/rootCA.crt
- rootCA/rootCA.key
- 后面在设置页面（8003 端口）点击同步根证书，启用

访问服务器 8002 端口，下载证书，解密https


## 使用前

- ### node-easy-cert 改2048
- ### 证书复制（免重复下载） 
-- docker exec -it kfAnyproxy /bin/sh
-- mv /usr/local/app/rootCA/* /root/.anyproxy/certificates


## 一些说明

- 保证80端口畅通，否则 Docker 会启动（原因排查中）
- js 上传文件限制 2M
- 代理是针对整个域名的流量。比如 api.weibo.cn, 那么这个域名的流量都会走代理服务器，但 rewrite 规则只改写匹配到的请求链接，比如: `^https://api\.rr\.tv/v3plus/index/(channel|todayChoice)$`，该规则匹配到相关请求后，会运行对应的 JS , 对结果进行更改（去广告/fake vip 等），其他请求信息直接原样返回。

# web 重构

## 左侧导航栏菜单 menu

- OVERVIEW
  - Port web/proxy/查看请求（anyproxy）
  - rules/rewrite/task/mitm list lenght
- RULES
  - elecproxy default.list
- REWRITE
  - Table url file.js
- JSMANAGE
  - JS upload
  - filelist editor
- TASK
  - overview task list/table name,type,time,job,stat/controll
  - new task form table
- MITM
  - rootCA
  - mitm host

- ABOUT
- DONATION

## To-do

- [ ] overview 请求/任务 log 显示
- [ ] task job type JS 下载订阅/单文件 订阅文件
- [ ] jsmanage 添加运行测试
- [ ] webpack 分包

- [ ] ad.list (启用开关)/ 链接添加/订阅
- [ ] js 商店（订阅/单文件）/ 一键添加
- [ ] 客户端 websocket

## Done!

- [x] list 更改 重载
- [x] logger level 统一管理
- [x] antd 精简
- [x] vue 分拆重构
- [x] web UI
- [x] config 配置对象
- [x] mitmhost.list
- [x] schedule repeat 无数次
- [x] 任务执行不影响原始任务数据
- [x] utils 内容整理
- [x] schedule 任务多元化
- [x] clog 前缀自定义，多参数输入  .header
- [x] clog 级别控制 .debug, .info, .error
- [x] logger 库初级
- [x] runJSFile Post/Get cb 处理
- [x] axios callback/response 处理
- [x] surger/qx $request/$response 兼容
- [x] 单个域名 对应 user-agent
- [x] rootCA 清空
- [x] js 编写 默认模板
- [x] filter.list 编辑
- [x] help 页面（延迟加载）
- [x] 设置页面 help
- [x] 保存规则下移
- [x] rule.list 编辑
- [x] 保存规则去空，去无对应 js
- [x] js 手动编写
- [x] js 内容查看管理
- [x] filter.list 生成
- [x] js 删除
- [x] menu lists （小图标）（请求信息查看/保存列表/。。。）
- [x] rule.list 订阅（更新hook)(rewrite)
- [x] js 远程下载
- [x] 根证书只同步，不上传
- [x] js 文件上传
- [x] 同步证书/清空历史已签发证书

# Project

- 设置页面 授权访问
- req 修改/res 各项参数修改 
- 精简版/高级版/。。。silver/gold

## match/modify

    match    |        example        |   modify  |         example 
 :---------: | --------------------- | :-------: | -----------------------
 ip          | 192.168.1.1           | 301/302   | 302(https://google.com)
 url         | ^https://api.b.com/v2 | js        | file.js
 host        | api.bilibili.com      | useragent | iPhone 6s
 useragent   | neteaseMusic | aliApp | block     | reject|tinyimg
 reqmethod   | GET|POST|PUT|DELETE   |           | 
 reqbody     | queryPara|word string |           |
 resstatus   | 200 | 404 | 301       |           |
 restype     | text/html | text/json | -----     |
 resbody     | Keyword(string)       | all - JS  |

match 多项合一 (and or)

### request 修改内容

- user-agent
- block/reject
- body/garameter
- response 任意值（提前返回）
- 30x 重定向

### response 修改内容

- body


### 自言自语

当初在一个群里看到远程代理注入 JS 的玩法，当时觉得很神奇，心想代理还能这么玩。
然后接下来了解了一下 [mitmproxy](https://mitmproxy.org/)，接触了 [anyproxy](https://github.com/alibaba/anyproxy)。

尝试在 anyproxy 上移植了一些 surge/quantumult X 的 JS 文件，发现了一片新的大陆。

为了进一步加深对 `自签证书/MITM/https 加密/解密` 等知识了解，尝试写了本项目。

了解得越多，越能感受到网络的不安全性。

不开源的原因，一方面是安全性。
另一方面是因为这毕竟是个学习项目，代码都是生肉，懒得去系统性的整理优化了。代码质量远远达不到开源的标准，就拿来自己和喜欢折腾的人玩玩。

总之，安全第一，希望你做每一步都知道自己在干什么，以及可能带来的风险。

## 感谢

- [anyproxy](https://github.com/alibaba/anyproxy)

