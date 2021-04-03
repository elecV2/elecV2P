#!/usr/bin/env python
# -*- coding: utf-8 -*-
# 最近更新: 2021-04-02
# 更新地址: https://github.com/elecV2/elecV2P/blob/master/script/Shell/elecV2P.py

'''
elecV2P python module - elecV2P pyhton 库函数 v0.2

说明:
  1. axios/feed 网络通信基于 httpx，使用前需提前安装好相关模块 (pip install httpx asyncio)
  2. 该文件仅在 elecV2P 环境下，且位于 script/Shell 目录时才有效
  3. feed 网络和通知模块应用了 webUI->SETTING 中的相关设置
PS: 对 python 不是很熟悉，如有错误，欢迎指正 https://github.com/elecV2/elecV2P

功能:
  定义一些常量和函数方便与 elecV2P 进行交互。（初版，扩展优化中
  
目前实现的常量及函数:
cwd      - elecV2P 目录
version  - 当前 elecV2P 版本

********* console 日志打印 ***********
console:
  console.log()
  console.error()
  console.debug()
  console.notify()

# 日志输出等级接受 webUI->SETTING 全局日志设置控制
# 输出日志不会自动保存到相关日志文件
# 如需保存日志到 logs 文件夹，新建函数
console = clog({
  'head': 'ePython.py',   # 日志头部显示名称
  'file': 'mypython'      # 日志保存文件名。如果省略，则不保存
})
********* console end ***********

********* store ***********
store:
  store.get(key)          - 获取 store/cookie 常量值
  store.put(value, key)   - 新增一个 store/cookie 常量
  store.delete(key)       - 删除一个 store/cookie 常量

# 注意: 在 python 中使用 store 函数对数据的修改是和 JS 同步的
# 在 python 中使用 store.put('test string', 'apy') 新增一个 cookie 常量，可以在 JS 中使用 $store.get('apy') 来直接获取的。反过来也一样
********* store end *******

********* axios ***********
axios:
  axios(request<object>)  - 发送网络请求

返回结果: { status, headers, data }

# 调用
req = {
  'url': 'https://httpbin.org/post',
  'method': 'post',
  'headers': { 'content-type': 'application/json; charset=UTF-8' },
  'data': { 'hello': 'elecV2P' }
}
res = axios(req)
sPrint(res['data'], res['status'], res['headers'])

# python 中 axios 没有 .then/.catch 等方法，不可进行链式调用
# 当有错误时 status == -1
********* axios end ***********

********* feed 通知模块 *******
feed:
  feed.push(title, description, url)   - python feed.push 不会添加 RSS item，只会调用设置的 ifttt/bark 进行通知 
  feed.ifttt(title, description, url)  - 发送一条 IFTTT 通知。应用 webUI->SETTING 通知中的相关设置，下同
  feed.bark(title, description, url)   - 发送一条 bark 通知

# 自定义通知较复杂，暂未实现
# feed.push 不会触发 JS
********* feed end ************

done:
  done(data)      - 退出 Python 执行，并返回数据 data

********* 使用示例 ********
# 在其他 .py 中引用本文件
from elecV2P import *

# 然后就可以直接调用相关变量和函数
print(version)  # 打印当前 elecV2P 版本

cook = store.get('CookieKEY')   # 使用 store 函数获取某个保存好的 cookie 值

sPrint(cook)    # sPrint 是一个自定义的打印函数，也可以直接使用 print

store.put('新的值，一个新的 cookie', 'apycookie')    # 使用 store.put 函数新增一个 cookie
sPrint(store.get('apycookie'))
store.delete('apycookie')       # 删除刚才创建的 cookie
'''

import json, os, httpx, re, sys
from datetime import datetime
from os.path import dirname, abspath
from urllib.parse import quote

def formArgs(args):
  result = ''
  for x in args:
    result += ' ' + str(x)
  return result.strip()

def sPrint(*args):
  print('[elecV2Python log]' + datetime.now().strftime('[%Y-%m-%d %H:%M:%S.%f')[:-3] + ']', formArgs(args))

if __name__ == '__main__':
  sPrint('elecV2P.py 适用于在其他 python 文件中进行调用，请勿直接运行')
  sys.exit()

cwd = dirname(dirname(dirname(abspath(__file__))))

with open(cwd + '/script/Lists/config.json', 'r', encoding='UTF-8') as f:
  CONFIG = json.load(f)
  version = CONFIG['version']

with open(cwd + '/script/Lists/useragent.list', 'r', encoding='UTF-8') as f:
  uagent = json.load(f)

# 简易的 console log/info/debug/error #
class clog():
  def __init__(self, arg={}):
    if 'head' in arg:
      self.head = arg['head']
    else:
      self.head = 'elecV2Python'
    if 'level' in arg:    # 暂时没什么用
      self.level = arg['level']
    else:
      self.level = 'info'
    if 'file' in arg and arg['file']:
      if re.search(r'\.log$', arg['file']):
        self.file = arg['file']
      else:
        self.file = arg['file'] + '.log'

  levels = {
    'error': 0,
    'notify': 1,
    'info': 2,
    'debug': 3
  }
  def alignHead(self, head = 'elecV2Python log', length = 16):
    if len(head) == length:
      return head
    if len(head) < length:
      nstr = head.split(' ')
      space = length - len(head)
      while space > 0:
        nstr[0] += ' '
        space -= 1
      return ' '.join(nstr)
    if len(head) > length:
      sp = re.split(r'\/|\\', head)
      if len(sp) > 1:
        head = sp[0][0:1] + '/' + sp.pop()
      nstr = head.split(' ').pop()
      return head[0:length-6-len(nstr)] + '...' + head[-len(nstr)-3:]

  def info(self, *args):
    if self.levels['info'] <= self.levels[CONFIG['gloglevel']]:
      loginfo = f'[{self.alignHead(self.head + " log")}]' + datetime.now().strftime('[%Y-%m-%d %H:%M:%S.%f')[:-3] + '] ' + formArgs(args)
      print(loginfo)
      if hasattr(self, 'file'):
        with open(cwd + '/logs/' + self.file, 'a', encoding='UTF-8') as f:
          f.write(loginfo + '\n')
  def debug(self, *args):
    if self.levels['debug'] <= self.levels[CONFIG['gloglevel']]:
      loginfo = f'[{self.alignHead(self.head + " debug")}]' + datetime.now().strftime('[%Y-%m-%d %H:%M:%S.%f')[:-3] + '] ' + formArgs(args)
      print(loginfo)
      if hasattr(self, 'file'):
        with open(cwd + '/logs/' + self.file, 'a', encoding='UTF-8') as f:
          f.write(loginfo + '\n')
  def notify(self, *args):
    if self.levels['notify'] <= self.levels[CONFIG['gloglevel']]:
      loginfo = f'[{self.alignHead(self.head + " notify")}]' + datetime.now().strftime('[%Y-%m-%d %H:%M:%S.%f')[:-3] + '] ' + formArgs(args)
      print(loginfo)
      if hasattr(self, 'file'):
        with open(cwd + '/logs/' + self.file, 'a', encoding='UTF-8') as f:
          f.write(loginfo + '\n')
  def error(self, *args):
    if self.levels['error'] <= self.levels[CONFIG['gloglevel']]:
      loginfo = f'[{self.alignHead(self.head + " error")}]' + datetime.now().strftime('[%Y-%m-%d %H:%M:%S.%f')[:-3] + '] ' + formArgs(args)
      print(loginfo)
      if hasattr(self, 'file'):
        with open(cwd + '/logs/' + self.file, 'a', encoding='UTF-8') as f:
          f.write(loginfo + '\n')
  log = info

console = clog()
''' 其他自定义
console = clog({
  'head': 'ePython.py',   # 自定义日志头部显示名称
  'file': 'mypython'      # 日志保存文件名。如果省略，则不保存
})
'''
#******* console 函数结束 ***********#

#******* axiox 网络请求 *************#
def axios(req):
  fres = {
    'status': 200,
    'headers': {},
    'data': ''
  }

  headers = {}
  if 'headers' in req:
    headers = req['headers']
  if 'content-type' not in headers or 'Content-Type' not in headers:
    headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
  if 'user-agent' not in headers:
    try:
      headers['user-agent'] = uagent[CONFIG['CONFIG_Axios']['uagent']]['header']
    except Exception as e:
      console.error(e)
      headers['user-agent'] = 'Mozilla/5.0 (Linux; U; elecV2P; x64) ePhone Super Max Plus++'

  proxies = {}
  timeout = 5
  try:
    if CONFIG['CONFIG_Axios']['proxy']:
      proxy = CONFIG['CONFIG_Axios']['proxy']
      if 'host' not in proxy:
        proxy['host'] = 'localhost'
      if 'port' not in proxy:
        proxy['port'] = 8001
      phttp = proxy['host'] + ':' + str(proxy['port'])

      if 'auth' in proxy and 'username' in proxy['auth'] and 'password' in proxy['auth']:
        phttp = proxy['auth']['username'] + ':' + proxy['auth']['password'] + '@' + phttp

      proxies['http://'] = 'http://' + phttp

    if CONFIG['CONFIG_Axios']['timeout']:
      timeout = round(CONFIG['CONFIG_Axios']['timeout']/1000, 2)
  except Exception as e:
    console.error(e)

  if isinstance(req, str):
    req = {
      'url': req,
      'method': 'get'
    }

  if 'url' not in req:
    fres['status'] = -1
    fres['data'] = 'axios error: a request url is expect'
    console.error(fres['data'])
    return fres

  if 'body' in req:
    req['data'] = req['body']
  if 'data' not in req:
    req['data'] = ''
  if 'method' not in req:
    req['method'] = 'get'
  console.debug('axios request:', req, 'proxies:', proxies, 'timeout:', timeout)
  try:
    req['method'] = req['method'].lower()
    if req['method'] == 'get':
      res = httpx.get(req['url'], headers=headers, proxies=proxies, timeout=timeout)
    elif req['method'] == 'post':
      res = httpx.post(req['url'], headers=headers, data=req['data'], proxies=proxies, timeout=timeout)
    elif req['method'] == 'put':
      res = httpx.put(req['url'], headers=headers, data=req['data'], proxies=proxies, timeout=timeout)
    elif req['method'] == 'delete':
      res = httpx.delete(req['url'], headers=headers, data=req['data'], proxies=proxies, timeout=timeout)
    elif req['method'] == 'options':
      res = httpx.options(req['url'], headers=headers, data=req['data'], proxies=proxies, timeout=timeout)
    else:
      class res:
        status_code = -1
        headers = {}
        text = 'unknow request method ' + req['method']

      console.error('unknow request method', req['method'])

    fres['status'] = res.status_code
    fres['headers'] = res.headers
    fres['data'] = res.text
  except Exception as e:
    console.error(e)
    fres['status'] = -1
    fres['data'] = 'axios ' + req['method'] + ' ' + req['url'] + ' error: ' + str(e)

  return fres

class estore:
  """store/cookie 常量获取及修改"""
  basepath = cwd + '/script/Store/'

  def get(self, key):
    try:
      with open(self.basepath + key, 'r', encoding='UTF-8') as f:
        return f.read()
    except Exception as e:
      console.error(e)
      return False

  def put(self, value, key):
    try:
      with open(self.basepath + key, 'w', encoding='UTF-8') as f:
        return f.write(str(value))
    except Exception as e:
      console.error(e)
      return False

  def delete(self, key):
    try:
      os.remove(self.basepath + key)
      return True
    except Exception as e:
      console.error(e)
      return False

class efeed():
  """elecV2P python 通知模块"""
  CONFIG_FEED = CONFIG['CONFIG_FEED']
  def push(self, title='【elecV2Python notify】', description='a empty message\n没有任何通知内容', url='https://github.com/elecV2/elecV2P'):
    self.ifttt(title, description, url)
    self.bark(title, description, url)
    self.cust(title, description, url)

  def ifttt(self, title='【elecV2Python ifttt notify】', description='a empty message\n没有任何通知内容', url='https://github.com/elecV2/elecV2P'):
    if 'iftttid' in self.CONFIG_FEED and 'enable' in self.CONFIG_FEED['iftttid'] and 'key' in self.CONFIG_FEED['iftttid'] and (self.CONFIG_FEED['iftttid']['enable'] or re.search(r'^\$enable\$', title)):
      title = re.sub(r'^\$enable\$', '', title)
      body = {
        'value1': title,
        'value2': description,
        'value3': url
      }
      req = {
          'method': 'post',
          'url': 'https://maker.ifttt.com/trigger/elecV2P/with/key/' + self.CONFIG_FEED['iftttid']['key'],
          'headers': {
            'content-type': 'application/json; charset=UTF-8'
          },
          'data': body,
        }
      res = axios(req)
      if res['status'] == 200:
        console.info('iftttPush result:', res['data'])
      else:
        console.error('iftttPush error:', res['data'])
    else:
      console.debug('IFTTT not available yet, skip IFTTT push')

  def bark(self, title='【elecV2Python bark notify】', description='a empty message\n没有任何通知内容', url='https://github.com/elecV2/elecV2P'):
    if 'barkkey' in self.CONFIG_FEED and 'enable' in self.CONFIG_FEED['barkkey'] and 'key' in self.CONFIG_FEED['barkkey'] and (self.CONFIG_FEED['barkkey']['enable'] or re.search(r'^\$enable\$', title)):
      if self.CONFIG_FEED['barkkey']['key'].startswith('http'):
        pushurl = self.CONFIG_FEED['barkkey']['key']
        if pushurl.endswith('/') == False:
          pushurl += '/'
      else:
        pushurl = 'https://api.day.app/' + self.CONFIG_FEED['barkkey']['key'] + '/'
      pushurl += '?url=' + url

      title = re.sub(r'^\$enable\$', '', title)
      title = quote(title, safe='~@#$&()*!+=:;,.?/\'')
      description = quote(description, safe='~@#$&()*!+=:;,.?/\'')
      req = {
          'method': 'post',
          'url': pushurl,
          'headers': {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          'data': f'title={title}&body={description}'
        }
      res = axios(req)
      if res['status'] == 200:
        console.info('barkPush result:', res['data'])
      else:
        console.error('barkPush error:', res['data'])
    else:
      console.debug('barkPush not available yet, skip barkPush')

  def cust(self, title='【elecV2Python customize notify】', description='a empty message\n没有任何通知内容', url='https://github.com/elecV2/elecV2P'):
    console.notify('自定义通知有点复杂，python 环境下待完成')
    console.notify(title, description, url)

def done(data = 0):
  console.debug('使用 done 退出当前 python 执行，data:', data)
  sys.exit(data)

store = estore()
feed  = efeed()

__all__ = ['sPrint', 'cwd', 'version', 'store', 'axios', 'feed', 'clog', 'console', 'done']