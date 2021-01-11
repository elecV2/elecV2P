## 简介

Docker 地址：https://hub.docker.com/r/elecv2/elecv2p

基础镜像：elecv2/elecv2p
ARM 镜像：（适用于 N1/OPENWRT/树莓派等 ARM 架构的系统）
- elecv2/elecv2p:arm64
- elecv2/elecv2p:arm32

## docker 及 docker-compose 的安装

``` sh
# 不同平台的安装方式不一样，仅供参考
# docker 安装
wget -qO- https://get.docker.com/ | sh

# docker-compose 安装
curl -L "https://github.com/docker/compose/releases/download/1.27.0-rc1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
```

## 相关命令

*以下命令仅作为参考，具体映射端口和卷根据实际情况进行调整*
```sh
# 基础启动命令
docker run --restart=always -d --name elecv2p -p 80:80 -p 8001:8001 -p 8002:8002 elecv2/elecv2p

# 宿主机保留 JS 文件/规则/任务/复写等列表/Store 文件等
docker run --restart=always -d --name elecv2p -v /elecv2p:/usr/local/app/script -p 8100:80 -p 8101:8001 -p 8102:8002 elecv2/elecv2p

# 使用 ARM 镜像，时区更改以及持久化存储
docker run --restart=always -d --name elecv2p -e TZ=Asia/Shanghai -p 8100:80 -p 8101:8001 -p 8102:8002 -v /elecv2p/JSFile:/usr/local/app/script/JSFile -v /elecv2p/Store:/usr/local/app/script/Store elecv2/elecv2p:arm32

# 拉取最新的镜像
docker pull elecv2/elecv2p

# 进入镜像内部
docker exec -it elecv2p /bin/sh

# Docker 的启动暂停
docker start elecv2p
docker stop elecv2p
docker restart elecv2p

# 查看日志
docker logs elecv2p -f
docker logs elecv2p --tail 20

# 清空日志
echo "" > $(docker inspect --format='{{.LogPath}}' elecv2p)

# 移除容器
docker rm -f elecv2p
```