# 变更提案：接入 CSP report-only 与 violation 收集

## Status
draft

## Why

按 `docs/dev/release-readiness-assessment.md` P2-1 评估，`next.config.ts` 当前安全头只覆盖 `X-Frame-Options` / `X-Content-Type-Options` / `Referrer-Policy` / `Permissions-Policy` / `Strict-Transport-Security`，**没有 Content-Security-Policy**。

CSP 是 XSS 攻击的最后一道防线：

- 即使代码层有 XSS（用户输入未严格 escape），CSP 可以在浏览器层阻止 payload 执行或外发数据。
- Sentry 接入后还能利用 CSP report-uri 把 violation 自动收到 Sentry，发现潜在脚本注入路径。

公开开放前补 CSP 是平台级安全底线。直接上线严格 policy 风险高（可能误拦正常资源），按 OWASP 推荐先用 report-only 模式收集 1-2 周违规，再切正式。

## What Changes

- 在 `next.config.ts` 增加 `Content-Security-Policy-Report-Only` 头，覆盖 default-src / script-src / style-src / img-src / font-src / connect-src / frame-ancestors。
- 初始 policy 偏宽松（包含 `unsafe-inline` / `unsafe-eval`），优先保证业务无中断；正式切换前再收紧。
- connect-src 显式列出 Supabase / Upstash / Sentry / GLM 上游域名。
- 新增 `/api/csp-report` route 接收 violation report，转发到 Sentry（如配置 DSN）并 console.warn 留痕。
- 不切换为正式 `Content-Security-Policy`：等 1-2 周观察期收集真实 violation，由人工判断后再做。

## Capabilities

### Modified Capabilities

- `api-operational-guardrails`: 补充 CSP report-only 与 violation 收集要求；不替换现有安全头要求。

## Impact

- 影响文件：`next.config.ts`、`src/app/api/csp-report/route.ts`（新文件）。
- 不改变页面行为：report-only 模式下浏览器只上报，不阻塞资源加载。
- 不改变 API 响应结构。
- 上报数量预估：初期可能较多（首次评估业务实际依赖）；通过 Sentry quota / sample rate 控制成本。
- 浏览器兼容性：CSP Level 2 主流浏览器全支持。

## Stability Closure

### 本轮收口项

- 浏览器层 XSS 防御：从「无 CSP」升级到「report-only 收集真实违规」。
- CSP violation 自动接入 Sentry + console，可视化潜在 XSS 路径。

### 明确不收项

- 不切换为正式 `Content-Security-Policy`：留给观察期后人工评估。
- 不去掉 `unsafe-inline` / `unsafe-eval`：会破坏 Next.js / 现有第三方组件，需要单独重构（P2 后期）。
- 不接入第三方 CSP 评分服务（Mozilla Observatory）：等正式 policy 稳定后再做。
- 不补 nonce-based script policy：Next.js App Router 16 对 nonce 支持仍在演进，等更稳定再加。

### 延后原因

- 正式 CSP 切换的成本是「小心评估每条 violation 是真威胁还是误报」，需要至少 1-2 周真实流量；本轮只做基础设施。
- nonce 支持需要修改 Next.js script tag 注入逻辑，工作量与本期目标不匹配。

## Validation

- 单测验证 `/api/csp-report` 接收合法 CSP violation payload 并返回 204。
- 单测验证非法 payload 返回 400。
- 本地手工触发：在 dev 环境打开 DevTools，确认 Response Header 包含 `Content-Security-Policy-Report-Only`，且现有页面无功能受影响。

## Out of Scope

- Sentry 后台的 CSP filter / inbound rules 配置。
- 真实 violation 数据收集后的 policy 调优。
- 切换为正式 `Content-Security-Policy` 头。
