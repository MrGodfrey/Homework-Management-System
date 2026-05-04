# 记录如何添加 SSL 连接

## 通过 Cloudflare 进行连接

1. 在 Cloudflare 的域名管理中，添加一项：
   (a) 类型为 A
   (b) Name 为 homework
   (c) 地址为服务器的地址
2. 将 Proxy 代理打开（显示为橙色的小云朵）
3. 在 Cloudflare 的 SSL 配置中选择 Flexible，即允许 Cloudflare 通过不安全的 HTTP 连接来访问服务器

这样就可以通过我的域名来访问了