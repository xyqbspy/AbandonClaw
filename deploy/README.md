# 部署模板

本目录存放生产部署需要的配置模板，**所有文件都是占位示例，不是直接生效的生产配置**。
拷贝到目标环境后必须替换占位符（域名 / 证书路径 / upstream 等）。

为什么放在仓库：
让 `release-marginal-gaps.md` M1-2 / `incident-response-runbook.md` 第 2 节中描述的
"Nginx + 限流"防护可以在部署时一行命令套上，不用现场拼配置，降低首次部署出错率。

## 文件清单

| 文件 | 用途 |
| --- | --- |
| `nginx.example.conf` | Nginx 反向代理 + 限流主配置（per-site） |
| `nginx.proxy_common.example.conf` | 复用 proxy 头（被主配置 include） |

## 启用步骤（腾讯云 CVM + PM2 主线）

### 1. 准备 SSL 证书

腾讯云控制台 → SSL 证书管理 → 签发 / 上传证书 → 下载 Nginx 格式，放到
`/etc/nginx/ssl/your-domain.{pem,key}`。

### 2. 把限流 zone 加进 nginx.conf

打开 `/etc/nginx/nginx.conf` 找到 `http {}` 块，在其内部添加：

```nginx
limit_req_zone   $binary_remote_addr zone=api_general:10m   rate=60r/m;
limit_req_zone   $binary_remote_addr zone=api_signup:10m    rate=5r/10m;
limit_req_zone   $binary_remote_addr zone=api_high_cost:10m rate=20r/m;
limit_conn_zone  $binary_remote_addr zone=conn_per_ip:10m;
```

> 这一步必须放 `http {}`，不能放 `server {}`，否则 zone 无法被多 server 复用。

### 3. 部署 site 配置

```bash
sudo cp deploy/nginx.example.conf            /etc/nginx/conf.d/abandonclaw.conf
sudo cp deploy/nginx.proxy_common.example.conf /etc/nginx/conf.d/proxy_common.conf
sudo vi /etc/nginx/conf.d/abandonclaw.conf
# 改：
#   server_name             -> 真实域名
#   ssl_certificate{,_key}  -> 步骤 1 中证书路径
#   127.0.0.1:3000          -> 如果 Next.js 不在本机，改 upstream 地址
```

### 4. 验证并 reload

```bash
sudo nginx -t              # 语法检查
sudo nginx -s reload       # 热加载，不中断现有连接
```

### 5. 冒烟验证

```bash
# 1) 命中 signup 限流（同一 IP 短时间内连发 > 5 次应得 429）
for i in $(seq 1 10); do
  curl -sk -o /dev/null -w "%{http_code}\n" \
    -X POST https://your-domain.example.com/api/auth/signup
done

# 2) 应用层能读到真实 IP
curl -sk https://your-domain.example.com/api/admin/status | grep -E "(rateLimit|requestId)"

# 3) HSTS / TLS 健康
curl -sIk https://your-domain.example.com/ | grep -iE "strict-transport-security|server"
```

## 调阈值

限流阈值不要随便往大调。当前默认值匹配应用层 env 默认：

| zone | rate | 对应应用 env / 场景 |
| --- | --- | --- |
| `api_general` | 60r/m | 普通页面与读接口，应用层另有 user/IP 维度护栏 |
| `api_signup` | 5r/10m | 匹配 `REGISTRATION_IP_LIMIT_MAX_ATTEMPTS` 默认值 |
| `api_high_cost` | 20r/m | 匹配 `DAILY_QUOTA_PRACTICE_GENERATE` 默认值的分钟级守门 |
| `conn_per_ip` | 50 | 每 IP 并发连接上限，防 SYN 半连接占满 |

调整时同步：
- `src/lib/server/rate-limit.ts` 中的应用层阈值（保持 Nginx ≥ 应用层）。
- `docs/dev/incident-response-runbook.md` §3.1 中的"关键指标"阈值。

## 失败时怎么办

事故响应剧本看 `docs/dev/incident-response-runbook.md` §4：
- 单账号刷接口
- 单 IP 多账号攻击（含 `deny <ip>;` 临时封禁示例）
- 全站流量异常
- GLM 账单暴涨

## 触发后再做（M2-2）

`release-marginal-gaps.md` M2-2 说明：用户量 > 100 日活 / 被脚本扫描后再启用腾讯云 WAF
或 Cloudflare 前置，作为这层 Nginx 的外圈防护。当前 Nginx 这一层已经足以挡 99% 的
脚本流量。
