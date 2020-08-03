#!/usr/bin/python
# -*- coding: UTF-8 -*-

import sys
from urllib.parse import unquote

if sys.argv[1]:
  data = unquote(sys.argv[1])
else:
  data = '\nhello from python'

print(data, ', life is short - Python')