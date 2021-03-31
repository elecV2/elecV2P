# 请先在系统中安装好 python 的执行环境
# 然后可在定时任务列表，任务栏选择 Shell 指令，后面内容填写 python test.py 或 python3 -u test.py, 相应 python 文件即可在定时时间执行
# v3.2.8 支持直接远程调用: python3 https://raw.githubusercontent.com/elecV2/elecV2P/master/script/Shell/test.py

import sys, io

# windows 环境下中文乱码修复（可能，如果还是乱码，请根据自身使用环境搜索解决方法
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print('hello elecV2P')
print('当前 python 版本', sys.version)
print('a message frome Python.')