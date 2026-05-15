# 灾备与数据恢复手册

本文档回答一个问题：

> 当数据库出事故（误删、误改、损坏、回滚），怎么用最短时间恢复到可服务状态。

它是 `docs/dev/release-readiness-assessment.md` P1-3 的具体落地，与 `backend-release-readiness-checklist.md` 共同构成上线后的运维底线。

## 1. 备份策略

### 1.1 主要数据载体

项目主数据全部在 Supabase（包含 Auth users、profiles、scenes、user_phrases、user_scene_progress、registration_invite_codes 等关键表）。

### 1.2 当前依赖的备份机制

Supabase 不同计划下的自动备份能力：

| 计划 | 自动备份频率 | 保留期 | PITR | 恢复操作 |
| --- | --- | --- | --- | --- |
| Free | 每日一次 | 7 天 | 不支持 | 后台手工恢复到指定快照 |
| Pro ($25/月) | 每日一次 | 7 天 | 支持（按秒级） | PITR 任意时点 + 快照恢复 |
| Team / Enterprise | 每日 + PITR | 14-30 天 | 支持 | 同上，更长保留期 |

**项目当前 Supabase 计划**：__待用户确认__（在 Supabase 后台 Project Settings → Billing 查看）

### 1.3 RPO / RTO 目标

按当前小范围内测阶段定义：

| 指标 | 目标值 | 说明 |
| --- | --- | --- |
| RPO（数据丢失容忍） | <= 24 小时 | 依赖 Supabase 每日自动备份；启用 PITR 后可降到 <= 5 分钟 |
| RTO（恢复到可服务） | <= 2 小时 | 单库恢复，包含识别问题、备份选择、恢复执行、应用层重启 |

公网开放后建议升级 Pro 计划启用 PITR，RPO 降到分钟级。

## 2. 触发恢复的事故类型

### 2.0 应用进程崩溃 / 部署回滚（不涉及数据库）

- PM2 进程异常退出、CPU/内存爆掉、新部署版本有 bug。
- **响应**：
  - `pm2 status` 看进程状态。
  - `pm2 logs abandonclaw --lines 500` 查最近日志。
  - 异常时 `pm2 reload abandonclaw` 软重载（保持连接），或 `pm2 restart abandonclaw` 硬重启。
  - 新部署版本有 bug 时回滚：`git checkout <stable-tag> && pnpm install --frozen-lockfile && pnpm run build && pm2 reload abandonclaw`。
  - 始终保留至少 1 个已知稳定的 build 目录或 git tag 作为回滚目标。

### 2.1 误删数据（最常见）

- 管理员或脚本误执行 DELETE / TRUNCATE。
- 应用层 bug 导致大量记录被错误删除。
- 用户态行为绕过 RLS（理论上不应发生，但要防）。

**响应**：从最近备份恢复目标表。

### 2.2 误改数据

- 字段被错误更新（例如批量改 user.access_status）。
- 迁移脚本写错条件导致全表更新。

**响应**：用 PITR 回到误改前时点；如无 PITR，从最近备份导出对比，手工或脚本回滚字段。

### 2.3 数据损坏

- 索引损坏、字符编码异常、外键引用错乱。
- 极少见，通常 Supabase 平台层会先告警。

**响应**：联系 Supabase 支持；准备从最近备份完整恢复整个 project。

### 2.4 灾难性事故

- Supabase 区域级故障（多 AZ 同时挂）。
- 账号被攻击导致项目被删。

**响应**：依赖 Supabase 跨区域备份策略（仅 Enterprise 默认提供）；自建 `pg_dump` 异地副本作为兜底。

## 3. 恢复操作步骤

### 3.1 从 Supabase 后台快照恢复（最常见路径）

1. **识别事故**：
   - 进入 Sentry / PM2 logs (`pm2 logs abandonclaw --lines 500`) / 用户反馈渠道，确认事故时间窗口。
   - 在 Supabase 后台 Project Settings → Logs 查看异常 SQL。
2. **暂停应用**（可选，避免新写入污染）：
   - 在 `/admin/invites` 把 `REGISTRATION_MODE=closed`。
   - 在 `/admin` 关闭高成本 capability。
   - 必要时直接 `pm2 stop abandonclaw` 停应用，等 Nginx 返回 502；恢复时 `pm2 start abandonclaw`。
3. **打开 Supabase 后台 → Project Settings → Backups**：
   - 选择事故发生前最近的快照。
   - 点 Restore，确认目标 project（**绝不能选错 project**）。
4. **等待恢复完成**（通常 5-15 分钟，视库大小）。
5. **验证**：
   - 跑 `pnpm run smoke:p0-auth-loop` 确认主链路恢复。
   - 跑 `pnpm run validate:db-guardrails` 确认 RLS / 表结构完整。
   - 检查关键表行数与事故前是否一致。
6. **恢复应用**：
   - 重新打开注册模式 / 高成本 capability。
   - 如果之前 `pm2 stop` 过，`pm2 start abandonclaw && pm2 logs --lines 100` 确认健康。
   - 在 dev-log 记录事故时间、影响范围、恢复时间、根因。
7. **复盘**：
   - 24 小时内补 post-mortem（`docs/dev/incidents/YYYY-MM-DD-<title>.md`）。

### 3.2 PITR 恢复（如启用 Pro 计划）

1. 同 3.1 第 1-2 步。
2. **打开 Supabase 后台 → Project Settings → Database → Point in Time Recovery**：
   - 选择目标时点（精确到秒）。
   - 通常选事故发生前 30 秒。
3. 等待恢复（5-30 分钟，视库大小与时间跨度）。
4. 同 3.1 第 5-7 步。

### 3.3 单表 / 局部数据恢复（不重建整个 project）

适用于：只有一张表被误改，不想全库回滚。

1. **从 Supabase 后台导出最近备份**：
   - Database → Backups → Download backup（Pro 及以上提供 download，Free 只能在后台 restore）。
2. **本地用 `pg_restore` 导入到独立 schema**：
   ```bash
   psql $LOCAL_DB -c "CREATE SCHEMA recovery_tmp;"
   pg_restore -d $LOCAL_DB --schema=public --no-owner --no-acl backup.dump
   # 或用 supabase CLI
   supabase db dump -f backup.sql --linked
   ```
3. **对比目标表**：
   - 用 SQL JOIN 对比 prod 当前数据与 recovery_tmp 数据。
   - 写迁移脚本只更新差异行，不动其他行。
4. **在维护窗口执行迁移脚本**。
5. **验证 + dev-log 记录**。

## 4. 自建 pg_dump 兜底（推荐）

依赖 Supabase 备份是单点风险。建议在 GitHub Actions 配置定时任务做异地备份。

### 4.1 GitHub Action 示例（如代码托管在 GitHub）

```yaml
# .github/workflows/db-backup.yml
name: DB Backup
on:
  schedule:
    - cron: "13 3 * * *"  # 每日 UTC 03:13（北京 11:13）
  workflow_dispatch:
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install postgresql-client
        run: sudo apt-get install -y postgresql-client-16
      - name: Dump database
        env:
          PGPASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
        run: |
          pg_dump \
            -h ${{ secrets.SUPABASE_DB_HOST }} \
            -U ${{ secrets.SUPABASE_DB_USER }} \
            -d ${{ secrets.SUPABASE_DB_NAME }} \
            --no-owner --no-acl --format=custom \
            -f backup-$(date +%Y%m%d).dump
      - name: Upload to S3 / OSS / COS
        run: |
          # 视存储后端选用对应 CLI
          aws s3 cp backup-$(date +%Y%m%d).dump \
            s3://${{ secrets.BACKUP_BUCKET }}/supabase/$(date +%Y/%m/)/
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### 4.2 腾讯云 CVM cron + COS 上传（推荐：与生产部署同台节省网络）

适合腾讯云部署主线。在生产 CVM（或单独的备份 CVM）上配 cron：

```bash
# 安装依赖
sudo apt-get install -y postgresql-client-16
# 安装 COS CLI（coscmd）
pip3 install coscmd
coscmd config -a <SecretId> -s <SecretKey> -b <bucket-name> -r <region>
```

`/usr/local/bin/abandonclaw-backup.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

DATE=$(date +%Y%m%d-%H%M%S)
DUMP_DIR=/var/backups/abandonclaw
DUMP_FILE="$DUMP_DIR/backup-$DATE.dump"

mkdir -p "$DUMP_DIR"

# Supabase 连接信息从 systemd EnvironmentFile 或 .env 读取
source /etc/abandonclaw/backup.env

PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  -h "$SUPABASE_DB_HOST" \
  -U "$SUPABASE_DB_USER" \
  -d "$SUPABASE_DB_NAME" \
  --no-owner --no-acl --format=custom \
  -f "$DUMP_FILE"

# 上传到腾讯云 COS
coscmd upload "$DUMP_FILE" "/supabase-backup/$(date +%Y/%m/)/"

# 本地保留最近 7 天
find "$DUMP_DIR" -name "backup-*.dump" -mtime +7 -delete
```

crontab：

```
13 3 * * * /usr/local/bin/abandonclaw-backup.sh >> /var/log/abandonclaw-backup.log 2>&1
```

`/etc/abandonclaw/backup.env` 权限设为 600，仅 root 可读。

### 4.3 备份保留策略

- 7 天日备份：保留全部
- 4 周周备份：每周第一份保留
- 12 个月月备份：每月第一份保留

腾讯云 COS lifecycle 规则可自动归档到「归档存储 / 深度归档存储」降低成本（控制台 → COS → 存储桶 → 生命周期）。S3 同理。

### 4.4 必需配置

GitHub Action 模式（4.1）：在 GitHub repo Settings → Secrets and variables 添加 `SUPABASE_DB_HOST` / `SUPABASE_DB_USER` / `SUPABASE_DB_PASSWORD` / `SUPABASE_DB_NAME` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `BACKUP_BUCKET`。

腾讯云 cron 模式（4.2）：在 `/etc/abandonclaw/backup.env`（root 600）配置 `SUPABASE_DB_HOST` / `SUPABASE_DB_USER` / `SUPABASE_DB_PASSWORD` / `SUPABASE_DB_NAME`，并通过 `coscmd config` 配置 COS 凭证。

## 5. 演练

备份不演练 = 出事时才发现备份是坏的或恢复脚本不可执行。

### 5.1 季度演练（推荐）

每季度执行一次：

1. 在 Supabase 创建一个 staging project（或复用现有 staging）。
2. 模拟事故：在 staging 删一张表的 50% 数据。
3. 按本文档第 3 节步骤恢复。
4. 记录实际 RTO，并和目标值对比。
5. 在 dev-log 留摘要：`docs/dev/dev-log.md` → `[YYYY-MM-DD] DR 演练`。

### 5.2 演练 checklist

- [ ] 事故场景已明确（哪张表、影响多少行）
- [ ] 暂停应用入口已演练
- [ ] 恢复目标快照已选定
- [ ] 恢复完成后 smoke 通过
- [ ] 应用恢复已演练
- [ ] 实际 RTO 已记录
- [ ] 发现的问题已记录到 dev-log

## 6. 应急联系人

| 角色 | 联系人 | 备注 |
| --- | --- | --- |
| Supabase 项目 owner | __待用户填写__ | 拥有 Supabase 后台完整权限 |
| 腾讯云 CVM owner | __待用户填写__ | SSH / PM2 / Nginx 权限 |
| 域名管理 | __待用户填写__ | DNS 切换权限（腾讯云 / Cloudflare） |
| 灾备演练负责人 | __待用户填写__ | 季度演练 + 文档维护 |

## 7. 不解决的事情

本文档不解决：

- 不重写 Supabase 备份机制：依赖平台能力。
- 不承诺 0 数据丢失：Free 计划下 RPO 最多 24 小时。
- 不承诺 0 停机恢复：单库恢复必须暂停写入。
- 不替代 Supabase 平台层告警：仍需 Sentry / 用户反馈触发响应。
- 不防 DDoS：见 release-readiness-assessment.md P2-3 WAF 章节。

## 8. 待用户首次执行

第一次准备上线前，必须：

- [ ] 在 Supabase 后台确认当前计划（Free / Pro / Team）。
- [ ] 如果是 Free，评估是否升级 Pro 启用 PITR；公开开放前强烈推荐升级。
- [ ] 记录当前 RPO / RTO 实际值到本文档第 1.3 节。
- [ ] 至少演练一次完整恢复流程（在 staging / 等价环境）。
- [ ] 在第 6 节填写应急联系人。
- [ ] 评估是否启用 GitHub Action 定时备份（第 4 节）。

## 9. 相关文档

- `docs/dev/release-readiness-assessment.md` P1-3
- `docs/dev/backend-release-readiness-checklist.md`
- `docs/dev/server-data-boundary-audit.md`
- `docs/dev/dev-log.md`
- Supabase 官方备份文档：https://supabase.com/docs/guides/platform/backups
