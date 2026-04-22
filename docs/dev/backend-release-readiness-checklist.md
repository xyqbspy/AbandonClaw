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
- [ ] 外部模型调用已配置可控超时，且超时后会主动终止并返回受控失败
- [ ] 外部模型空响应、非成功状态与异常抛出都会被统一收敛，不会直接裸透传到接口层
- [ ] 统一参数校验入口仍覆盖 `review / learning / phrases / practice / scenes`

## 数据边界

- [ ] 用户态读写继续优先走 `createSupabaseServerClient`
- [ ] 关键用户态表的现有 RLS / SQL 映射已核对
- [ ] 共享 `phrases` 表仍只通过后台白名单入口访问
- [ ] AI enrich 仍只保留在后台白名单路径
- [ ] 回滚方案已明确：若数据库策略与服务层边界不一致，优先回退服务层调用路径，再单独修复 SQL

## 真实 HTTP 验证

- [ ] 本地开发服务或目标环境已启动
- [ ] baseline 脚本使用的 `Origin` 与服务端允许域一致
- [ ] 认证 cookie 已通过真实登录流程获取
- [ ] `review submit` baseline 已执行
- [ ] `learning progress` baseline 已执行
- [ ] `practice generate` baseline 已执行
- [ ] `tts` baseline 已执行
- [ ] 限流命中与异常结果已记录，不只保留终端输出
- [ ] 至少验证过一组模型调用超时或上游异常时的受控失败表现
- [ ] 已按 [real-learning-loop-acceptance-checklist.md](/d:/WorkCode/AbandonClaw/docs/dev/real-learning-loop-acceptance-checklist.md) 走完一轮真实学习闭环

## 第四阶段补充

- [ ] 响应头已包含 `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` 与 `Strict-Transport-Security`
- [ ] `today` 首要任务解释已在页面显示，并确认 continue / repeat / review 三类来源文案正确
- [ ] `scene full` 播放失败时已返回受控提示，不再直接暴露原始错误
- [ ] `tts/regenerate` 批量重生成失败会记录结构化日志，并汇总失败项
- [ ] 已复核当前仍保留后台白名单的入口只剩共享 `phrases` 和 AI enrich
- [ ] 若真实环境再出现 `Connect Error: {}`，已具备 `requestId` 与 TTS 服务端日志可追踪链路
- [ ] `/admin/observability` 能看到最近关键学习动作与失败摘要

## 最小验证命令

```bash
pnpm run validate:db-guardrails
node --import tsx --test src/app/api/review/handlers.test.ts src/app/api/learning/handlers.test.ts src/app/api/practice/generate/route.test.ts src/lib/server/rate-limit.test.ts
node --import tsx --test src/features/today/components/today-page-selectors.test.ts src/lib/utils/tts-api.test.ts src/lib/utils/tts-api.scene-loop.test.ts src/lib/server/tts/service.test.ts src/app/api/tts/regenerate/route.test.ts
node --import tsx -e "const mod = await import('./next.config.ts'); const config = mod.default?.default ?? mod.default; console.log(typeof config.headers)"
pnpm run text:check-mojibake
pnpm load:api-baseline --dry-run --path=/api/practice/generate --method=POST --body-file=scripts/load-samples/practice-generate.sample.json
```

## 当前已知风险

- 本地环境的真实 HTTP baseline 依赖临时登录 cookie 与临时测试数据，不是正式生产容量结果
- `practice generate` 在当前阈值下会按预期触发 `429`
- `tts` 在当前环境里出现过单次 `500`，日志表现为 `Connect Error: {}`
- 数据库策略仍缺少独立的真实环境冒烟验证，这一项需要在可用数据库环境下单独补齐
