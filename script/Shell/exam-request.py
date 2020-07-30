import requests, json

re = requests.get("http://httpbin.org/json")
# re.encoding = 'UTF-8'

jsre = json.loads(re.text)
print(jsre)