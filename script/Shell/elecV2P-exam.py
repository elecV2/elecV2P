#!/usr/bin/env python
# -*- coding: utf-8 -*-

# elecV2P.py 库文件简单使用小例子
# 详情: https://github.com/elecV2/elecV2P/blob/master/script/Shell/elecV2P.py
# 远程引用(v3.2.8)，在 TASK 中选择 shell指令，内容填写: python3 https://raw.githubusercontent.com/elecV2/elecV2P/master/script/Shell/elecV2P-exam.py

# from elecV2P import *
from elecV2P import sPrint, cwd, version, store, axios, feed, console, clog, done
import sys, os, io

# windows 环境下中文乱码修复（可能，如果还是乱码，请根据自身使用环境搜索解决方法
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# sPrint 简单日志输出函数
sPrint('当前 elecV2P 版本', version, 'python 版本', sys.version)

name = os.path.basename(__file__)
# 仿 javascript 中的 console 函数
console.log('当前 elecV2P 工作目录', cwd, '当前脚本名称', name)
console.debug('a debug log infomation', '输出受 webUI->SETTING 服务器日志等级控制')
console.error('一个错误的信息', 'console 接受参数个数不限制', '可随意添加')
console.notify('a notify level log', '日志输出级别可在 webUI->SETTING 界面调整')
# 目前输出分以上四个等级，当前输出级别可在 webUI->SETTING 界面调整
# 自定义 console 函数
console = clog({
  'head': name,        # 日志头部显示名称
  'file': 'mypython'   # 保存日志内容到 logs 文件夹，此为文件名。如果省略，则不保存
})
console.log('通过 python console.log 输出日志', '并保存到 logs 目录的文件中')

# store 数据读取/存储函数（数据内容和 javascript 共享，可直接在 webUI->JSMANAGE 查看/编辑）
store.put('通过 python store.put 函数写入数据到 pydata 关键字中', 'pydata')  # 写入

key = 'cookieKEY'
data = store.get(key)  # 读取
if data:
  console.log('通过 python store.get 函数读取数据', key, 'value:', data)
else:
  console.log('并没有在 store/cookie 库中找到', key, '相关值')
# store.delete('pydata')   # 删除

# done - 直接退出当前 py 运行
# done()
# done 之后的代码不会执行

# axios - 发送网络请求
req = {
  'url': 'https://httpbin.org/post',
  'method': 'post',
  'headers': { 'content-type': 'application/json; charset=UTF-8' },
  'data': { 'hello': 'elecV2P' }
}
# req = 'https://httpbin.org/get?hello=elecV2P'
res = axios(req)
if res['status'] == -1:
  console.error(res['data'], res['status'], res['headers'])
else:
  console.notify('axios 网络请求返回结果', res['data'])

# feed - 通知模块（使用了 webUI->SETTING 通知相关参数）
feed.push('a python notify', '一条来自 python feed.push 的通知', 'https://github.com/elecV2/elecV2P/blob/master/script/Shell/elecV2P.py')
# feed.ifttt('PYTHON IFTTT 单独通知', '单独发送一条 IFTTT 通知')
# feed.bark('$enable$a python bark notify', '通过 $enable$ 强制开启 bark 通知（如果 bark key 等参数已设置）', 'https://github.com/elecV2/elecV2P-dei/tree/master/docs/07-feed&notify.md')