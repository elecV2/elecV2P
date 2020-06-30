<div style="display: flex;justify-content: space-around;align-items: flex-start;box-sizing: border-box;color: white;font-size: 20px;">
  <div style="width: 50%;margin: 0 12px;">
    <div style="background-color: #1890ff;list-style: none;border-radius: 8px;padding: 0;margin: 0;">
      <h3 style="font-size: 24px;text-align: center;border-bottom: 1px solid;color: white;padding: 6px;margin-bottom: 0;">Todo</h3>
      <pre style="white-space: pre-line;padding: 6px 1em;text-align: left;">
        - [ ] $hold web ui
        - [ ] $hold 初测试
      </pre>
    </div>
    <div style="background-color: #003153;margin-top: 12px;border-radius: 8px;">
      <h3 style="font-size: 24px;text-align: center;border-bottom: 1px solid;color: white;padding: 6px;margin-bottom: 0;">Project</h3>
      <pre style="margin-bottom: 0;white-space: pre-line;padding: 6px 1em;text-align: left;">
        - 说明文档 [progressing...]
        - 内存使用优化 [progressing...]
        - $HOLD. hold返回结果到前端页面进行编辑
        - tg bot 日志查看/删除 feed通知 远程JS 任务开始/暂停
        - text editor
        - mongoDB 或者 其他 nosql 数据保存
        - 自签证书自定义生成
        - webpack 分包(?)
        - 多语言 [一个可能永远不填的坑...]
        - anyproxy 替换，使用其他库或原生代码，增强可定制性
      </pre>
    </div>
  </div>
  <div style="width: 50%;background-color: #2d8800;border-radius: 8px;margin: 0 12px;">
    <h3 style="font-size: 24px;text-align: center;border-bottom: 1px solid;color: white;padding: 6px;margin-bottom: 0;">Done</h3>
    <pre style="margin-bottom: 0;white-space: pre-line;padding: 6px 1em;text-align: left;">
      - [x] context req 优化
      - [x] webhook start/stop task
      - [x] webhook task info
      - [x] logs permission denied fix
      - [x] package 精简
      - [x] textarea 网线
      - [x] uploadjs 优化
      - [x] webhook deletelogs/get status
      - [x] mitm 开启/关闭 全部
      - [x] webrunjs to webhook
      - [x] setting homepage
      - [x] websocket 断开 status 显示
      - [x] JS 文件列表刷新
      - [x] require './xxx'
      - [x] 停止任务 出错 fixed
      - [x] 初始 lists/jsfile 添加
      - [x] overview jsrunstatus
      - [x] $request/$response 测试运行 错误提醒
      - [x] exec 编码 fix
      - [x] cat/type regex
      - [x] recver ready 调整
      - [x] setTimeout/setInterval context
      - [x] exec cross platform 简单命令转化
      - [x] exec 取消 iconv 编码转换
      - [x] minishell cd command 问题
      - [x] websocket 单独端口取消
      - [x] websocket recver readystatus
      - [x] websocket reconncet ready 重载
      - [x] minishell history
      - [x] shell cd
      - [x] websocket clientID(euid)
      - [X] (P)mini shell 1.0
      - [ ] lists 订阅（订个锤子，用 JS 和定时任务代替）
      - [x] exec cwd
      - [x] recver muti
      - [x] config_port 整理
      - [x] runstatus 修复
      - [x] 订阅更新 单个添加
      - [x] JSLISTS push 重复的问题
      - [x] 说明文档前 备注更新日期和版本
      - [x] logger 日志调整取消
      - [x] logger 全局日志调整分离
      - [x] exec stream 同步/片断 输出
      - [x] exec to ondata
      - [x] contextBase class 化
      - [x] feed.ifttt
      - [x] store delete
      - [x] overview logs/feed
      - [x] 服务器端 websocket 优化(setInterval)
      - [x] webUI collapse/logo
      - [x] context __dirname
      - [x] webws 终极优化
      - [x] setting.vue feed 优化
      - [x] task.md(exec)
      - [x] webws connecting 细节优化
      - [x] webrecv 优化 基本完成
      - [x] context @exec
      - [x] reconnect 逻辑优化
      - [x] exec task cb
      - [x] js.md 说明文档(@exec/@feed 等)
      - [x] feed 不更新问题
      - [x] // @require  nodejs module 0.1
      - [x] web websocket 分离
      - [x] websocket 重连后 message 续传
      - [x] 任务 exec 类型
      - [X] (P)overview 显示 precess 内存使用
      - [x] websocket 自动重连
      - [x] websocket 延时加载问题
      - [x] initdata 整理
      - [x] 远程 runjs token 设置
      - [X] (P)代码规范化（尽量） [done?, progressing...]
      - [x] 网页添加 docs 链接
      - [x] js 远程运行/token  :/runjs?token=2223sdd&fn=test.js
      - [x] task time 默认值自动调整
      - [x] web #tag 直达
      - [x] 任务初始化 ifttt 不通知的问题
      - [x] webmodule.js 拆分
      - [x] 代码规范化初步（尽力了）
      - [x] vue websocket 移动到最上层
      - [x] 清除 logs 部分/全部
      - [x] webmodules task 移动到 task
      - [x] websocket 断连问题
      - [x] random repeat
      - [x] 定时任务 时间合理检测
      - [x] mitm host 子域名通配符（*）
      - [x] JS context 添加 feed 通知 $feed
      - [x] feed 一定时间内（1 min）合并通知
      - [x] 自动启用 rootCA 证书
      - [x] JS context 分离为 module
      - [x] task stat
      - [x] mitm *
      - [x] 任务 运行 log 返回
      - [x] 客户端 websocket
      - [x] logger 添加 cb(websocket)
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
    </pre>
  </div>
</div>