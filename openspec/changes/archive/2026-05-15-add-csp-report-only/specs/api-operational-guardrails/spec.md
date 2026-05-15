# 规范文档：api-operational-guardrails

## ADDED Requirements

### Requirement: 浏览器层 XSS 防御必须由 CSP 提供
系统 MUST 通过 Content-Security-Policy 头为浏览器提供 XSS 防御能力，并在切换到正式 enforce 模式前以 report-only 方式收集真实违规，避免误拦正常资源。

#### Scenario: 应用响应包含 CSP report-only 头
- **WHEN** 浏览器请求任意应用页面
- **THEN** 响应 MUST 包含 `Content-Security-Policy-Report-Only` 头
- **AND** policy MUST 至少覆盖 default-src、script-src、style-src、img-src、connect-src、frame-ancestors

#### Scenario: 浏览器上报 CSP violation
- **WHEN** 浏览器检测到资源加载违反 CSP policy
- **AND** 上报到 `/api/csp-report` 端点
- **THEN** 系统 MUST 接收并解析 violation report
- **AND** 系统 MUST 把 violation 上报到错误追踪系统（Sentry）
- **AND** 系统 MUST 返回 204 No Content
- **AND** 上报频率超过限流时 MUST 返回 429
