# 服务端治理上线前检查清单

## 环境

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已配置且与目标项目一致
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已配置
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 仅服务端环境可用
- [ ] `UPSTASH_REDIS_REST_URL` 已配置
- [ ] `UPSTASH_REDIS_REST_TOKEN` 已配置
- [ ] `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` / `APP_ORIGIN` 至少有一项与实际部署域名一致

## 接口治理

- [ ] 高成本接口确认已接入统一限流
- [ ] 受保护写接口确认已接入 `Origin` 校验
- [ ] 关键写接口确认已接入幂等保护
- [ ] 未知异常确认会统一返回受控错误并带 `requestId`
- [ ] 统一参数校验入口仍覆盖 `review / learning / phrases / practice / scenes`

## 数据边界

- [ ] 用户态读写继续优先走 `createSupabaseServerClient`
- [ ] 关键用户态表的现有 RLS / SQL 映射已核对
- [ ] 共享 `phrases` 表仍只通过后台白名单入口访问
- [ ] AI enrich 仍只保留在后台白名单路径
- [ ] 回滚方案已明确：若数据库策略与服务层边界不一致，优先回退服务层调用路径，再单独修复 SQL

## 真实 HTTP 验证

- [ ] preview 或目标环境已启动
- [ ] 基线脚本使用的 `Origin` 与服务端允许域一致
- [ ] 认证 cookie 已通过真实登录流程获取
- [ ] `review submit` 基线已执行
- [ ] `learning progress` 基线已执行
- [ ] `practice generate` 基线已执行
- [ ] `tts` 基线已执行
- [ ] 限流命中与异常结果已记录，不只保留终端输出

## 最小验证命令

```bash
pnpm preview:status
pnpm run validate:db-guardrails
node --import tsx --test src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts src/app/api/practice/generate/route.test.ts src/lib/server/rate-limit.test.ts
pnpm run text:check-mojibake
pnpm load:api-baseline --dry-run --path=/api/practice/generate --method=POST --body-file=scripts/load-samples/practice-generate.sample.json
```

## 当前已知风险

- preview / 本地环境的真实 HTTP baseline 依赖临时登录 cookie 与临时测试数据，不是正式生产容量结果
- `practice generate` 在当前阈值下会按预期触发 `429`
- `tts` 在当前环境里出现过单次 `500`，日志表现为 `Connect Error: {}`
- 数据库策略仍缺少独立的真实环境冒烟验证，这一项需要在可用数据库环境下单独补齐
