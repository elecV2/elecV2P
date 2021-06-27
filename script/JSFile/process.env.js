// 添加/查看 当前 process.env 变量
// 要求 elecV2P 版本 >=v3.4.0
// 该脚本只需在 elecV2P 启动时运行一次即可，之后可在其他脚本中直接使用修改后的 process.env
// process.env 相关参数仅在使用 node xxxx.js 运行，或添加了 @grant nodejs 的脚本中有效
// 脚本地址: https://raw.githubusercontent.com/elecV2/elecV2P/master/script/JSFile/process.env.js
// 最近更新: 2021-06-24
// @grant nodejs

const config = {
  show: true,            // 是否显示修改的 process.env 参数
  replace: true,         // 如原变量名存在，是否进行覆盖。默认: true (覆盖), false: 不覆盖
  myenv: {               // 即将添加/修改的环境变量
    aenv: '必须是字符类型。hello, elecV2P',
    aobj: '{"key": "其他类型先转换为字符格式，然后在获取时再进行转换"}',
    anub: 90,      // 数字会被自动转化为字符类型 '90',
    bool: true,    // 其他类型也会被转为字符类型 'true'
    othr: $store.get('cookieKEY', 'string'),      // 可以使用 $store.get 函数读取 cookie/store 常量进行赋值
  }
}

if (config.replace === false) {
  for (let key in config.myenv) {
    if (process.env[key]) {
      console.log('已存在环境变量', key, '根据设置，不对此项进行更改')
      delete config.myenv[key]
    }
  }
}

Object.assign(process.env, config.myenv)

console.log('process.env 修改完成')
if (config.show) {
  console.log(process.env)
}