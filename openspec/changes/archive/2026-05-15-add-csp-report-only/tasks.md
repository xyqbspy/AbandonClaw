# 任务清单

## Status
done

## 1. 配置 CSP 头

- [x] 1.1 在 `next.config.ts` 的 `headers()` 数组中增加 `Content-Security-Policy-Report-Only` 头。
- [x] 1.2 policy 至少覆盖：`default-src`、`script-src`、`style-src`、`img-src`、`font-src`、`connect-src`、`frame-ancestors`、`base-uri`、`form-action`、`object-src`。
- [x] 1.3 `connect-src` 显式列出 `https://*.supabase.co`、`https://*.upstash.io`、`https://*.sentry.io`、`https://o*.ingest.sentry.io`、GLM provider 域名。
- [x] 1.4 `report-uri` 指向 `/api/csp-report`。

## 2. CSP report 接收端

- [x] 2.1 新增 `src/app/api/csp-report/route.ts`：POST 接收 `application/csp-report` 与 `application/reports+json`。
- [x] 2.2 解析 violation 字段（document-uri / violated-directive / blocked-uri / source-file / line-number 等）。
- [x] 2.3 调用 `Sentry.captureMessage("CSP violation", { extra: {...} })` 上报到 Sentry（DSN 缺失时 no-op）。
- [x] 2.4 同时 `console.warn("[csp-report]", violation)` 留本地日志。
- [x] 2.5 返回 204 No Content。
- [x] 2.6 路由不需要 auth，但要做最小限流（防垃圾上报刷爆 Sentry quota）。

## 3. 测试

- [x] 3.1 `src/app/api/csp-report/route.test.ts`：合法 CSP violation 返回 204。
- [x] 3.2 非法 payload 返回 400。
- [x] 3.3 限流命中返回 429（按现有 rate-limit helper）。

## 4. 文档与收尾

- [x] 4.1 更新 `docs/dev/release-readiness-assessment.md`：P2-1 标记代码侧完成，列出观察期任务。
- [x] 4.2 更新 `docs/dev/dev-log.md`：留本轮接入摘要。
- [x] 4.3 spec delta `openspec/changes/add-csp-report-only/specs/api-operational-guardrails/spec.md` 反映「CSP report-only 与 violation 必须被收集」要求。
- [x] 4.4 完成态收尾归档 change 到 `openspec/changes/archive/2026-05-15-add-csp-report-only/`。
- [x] 4.5 同步更新主 stable spec `openspec/specs/api-operational-guardrails/spec.md`。
