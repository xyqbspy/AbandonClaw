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

**如果 `http {}` 里没有显式 `large_client_header_buffers`，也强烈建议同时加上：**

```nginx
large_client_header_buffers 8 32k;
client_header_buffer_size 16k;
```

> Supabase 的 auth cookie 通常 4-8KB，多个 cookie 叠加后容易超过 nginx 默认 buffer (4 8k)。
> 一旦超过，nginx 在请求头解析阶段就返回 502/400，**应用根本接不到请求**，用户会看到
> "登录过的浏览器进不去，无痕能进" 的诡异现象。site 配置里也已经加了同样的两行作为兜底。

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

## 常见 502 / 网关错误排障

### 现象 A：登录过的浏览器 502，无痕模式正常

**根因**：Supabase auth cookie 太大，超过 nginx 默认 `large_client_header_buffers`。
nginx 在请求头解析阶段就拒绝，应用根本接不到请求 → 用户以为项目挂了。

**快速验证**：

```bash
# 看 nginx error log，如果出现 "upstream sent too big header" / "client sent too large header"
# 就是这个问题
sudo tail -n 100 /var/log/nginx/error.log | grep -iE "header|buffer|too large"
```

**热修**：

```bash
sudo vi /etc/nginx/nginx.conf
# 在 http {} 段加（或调大现有值）:
#   large_client_header_buffers 8 32k;
#   client_header_buffer_size 16k;

sudo nginx -t && sudo nginx -s reload
```

reload 后无需重启 PM2，所有用户（包括带大 cookie 的）立刻能进。

### 现象 B：所有人都 502，包括无痕模式

**根因**：PM2 进程未启动、应用刚 reload 还没就绪、或上游 OOM。

**快速验证**：

```bash
pm2 status
pm2 logs abandonclaw --lines 200
curl -sI http://127.0.0.1:3000/api/admin/status
```

**热修**：

```bash
pm2 reload abandonclaw --update-env
# 如果直接挂在 OOM，先看：
free -h
dmesg | tail -50 | grep -i "killed process"
```

### 现象 C：用户看到的是 nginx 裸错误页

site 配置已经把 502/504 重写为友好的中文提示页面（含"清 cookie 或无痕模式"指引），
并返回 503 状态码。如果生产 nginx 仍然显示 nginx 默认错误页，多半是 site 配置没 reload，
跑 `sudo nginx -t && sudo nginx -s reload` 即可生效。

## 触发后再做（M2-2）

`release-marginal-gaps.md` M2-2 说明：用户量 > 100 日活 / 被脚本扫描后再启用腾讯云 WAF
或 Cloudflare 前置，作为这层 Nginx 的外圈防护。当前 Nginx 这一层已经足以挡 99% 的
脚本流量。
