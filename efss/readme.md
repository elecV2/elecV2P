EFSS - ElecV2P File Storage System

elecV2P 文件存储系统

### 访问路径 - /efss

**http://127.0.0.1/efss**

*无论物理目录如何改变，网络访问地址不变*

默认物理存储目录为: 当前工作路径/efss。

如需修改为其他目录，比如 ./script/Shell , 可在 EFSS 页面直接修改。

### 功能

用于上传文件到服务器，或者共享服务器任意目录以供查看/下载。

### efss 目录设置

默认目录：当前工作路径/efss

可手动设置为其他任意目录

**./** - 相对目录。相对当前工作路径。 例如：./script/Shell, ./logs, ./script/JSFile, ./rootCA 等等

**/**  - 绝对目录。 例如： /etc, /usr/local/html, D:/Video 等等

**注意：**

* 如果目录中包含大量文件，例如直接设置为根目录 **/**，在引用时会使用大量资源（CPU/内存）去建立索引，请合理设置 efss 目录*
* 默认限制最大读取文件数为 600 （2021-02-20 更新添加）

## EFSS favend (v3.4.2 添加)

EFSS favorite&backend，用于快速打开/查看某个目录的文件，以及将 JS 作为 backend 返回执行结果。

![favend](https://raw.githubusercontent.com/elecV2/elecV2P-dei/master/docs/res/favend.png)

其中关键字表示 favedn 访问路径，比如: **http://127.0.0.1/efss/test**, **http://127.0.0.1/efss/cloudbk**

**favend 的优先级高于 EFSS 目录中的文件**

比如: 假如 EFSS 默认目录中有一个文件 **mytest**, 如果没有设置 favend，当访问 /efss/mytest 的时候，直接返回 mytest 文件内容。但如果存在某个 favend 的关键字同样为 **mytest**，那么会返回 favend 中的对应结果。

### favend - favorite 收藏目录

返回某个文件夹下的所有文件列表。

默认最大返回文件数 **1000**，可在 url 中使用 max 参数来进行更改，比如: **http://127.0.0.1/efss/logs?max=8**
默认是否显示 dot(.) 开头文件共用 EFSS 中相关设置，也可以在 url 中使用参数 dotfiles 来设置，比如: **http://127.0.0.1/efss/logs?dotfiles=allow** (除 dotfiles=deny 外，其他任意值都表示 allow 允许)

### favend - backend 运行 JS

作为 backend 运行的 JS 默认 timeout 为 5000ms，也可以在 url 中使用参数 timeout 来修改，比如: **http://127.0.0.1/efss/body?timeout=20000**

该模式下的 JS 包含 **$request** 默认变量，且应该返回如下 object:

``` JS
console.log($request)   // 查看默认变量 $request 内容。（该模式下的 console.log 内容前端不可见，只能在后台看到
// $request.method, $request.protocol, $request.url, $request.hostname, $request.path, $request.headers, $request.body
// bakend 特有属性 $env.key 表示访问该 backend 的关键字，$env.name 表示该 backend 名称
console.log(__version, 'cookieKEY:', $store.get('cookieKEY'))   // 其他默认变量/函数也可直接调用

// 最终网页返回结果
$done({
  statusCode: 200,    // 网页状态码，其他状态码也可以。比如: 404, 301, 502 等。可省略，默认为: 200
  headers: {          // 网页 response.headers 相关信息。可省略，默认为: {'Content-Type': 'text/html;charset=utf-8'}
    'Content-Type': 'application/json;charset=utf-8'
  },
  body: {             // 网页内容
    elecV2P: 'hello favend',
    request: $request,   // 这里面的内容会直接显示到网页中
  }
})

// === $done({ response: { statusCode, headers, body } })
```

## 使用 PM2 运行 (v3.4.3 beta 测试阶段...)

使用方式：在需要运行的程序文件右键，然后选择 PM2 运行

建议执行程序:
- 简单的测试 js 文件
- 普通可使用 pm2 start xxxx 运行的程序

关于 PM2 的管理可参考: [官方文档 PM2.io 部分](https://pm2.keymetrics.io/docs/usage/monitoring/)

*另外，可以也可在 elecV2P 的 $exec/Shell 指令/minishell 中，使用 pm2 命令对这些程序进行管理。（minishell 的开启，参考: [说明文档 Advanced.md](https://github.com/elecV2/elecV2P-dei/tree/master/docs/Advanced.md) ）*

### 增加此选项的原因

*可使用此方式运行一些提供 web ui 管理界面的程序，比如 aria2/clash 等。未来可能扩展到这些程序和 elecV2P 进行交互。*