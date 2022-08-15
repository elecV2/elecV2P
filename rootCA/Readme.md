### 根证书目录

- 根证书包含 rootCA.crt/rootCA.key 两部分
- 程序启用时会首先检测该目录是否存在根证书
- 如果有则启用该目录下的证书，否则将生成新的根证书
- 在生成新的根证书时，该目录下所有文件会被清空
- 所以请勿在该目录放置其他重要文件
- 以及及时备份该目录下的常用根证书

### .0 根证书

适用于安卓的根证书生成（.0 后缀
假如 **openssl** 命令可用，在生成新的根证书时会同时生成 .0 后缀证书

手动生成 .0 后缀证书的步骤

- 首先还是得获取到 rootCA.crt 证书
- 然后在 rootCA.crt 同目录下，使用命令 openssl x509 -in rootCA.crt -noout -subject_hash_old
- 得到一个长度为 8 的 hash 字符串，类似：7ea1bda4
- 然后复制一份 rootCA.crt 文件，重命名为 **7ea1bda4.0** (hash字符.0)
- **7ea1bda4.0** 即为适用于安卓的根证书

### webUI 开启 TLS

在 webUI->setting/设置->初始化相关设置 开启。

- 开启 TLS 时，建议使用默认 80 外的其他端口，比如 443
- HOST 项填写 IP 或者 域名，比如 192.168.1.102 或 x.xx.com
  - IP/域名 用于生成自签证书
  - 使用自签证书 https 访问时，设备需先信任根证书
  - 也可以使用其他合法域名证书，格式 x.xx.com.key/x.xx.com.crt，放置到此目录下
- 访问时注意带上端口，比如 https://192.168.1.102:8000 （使用 443 端口时，可省略
- 假如出现错误，可查看 errors.log 或 [open a issue](https://github.com/elecV2/elecV2P/issues)