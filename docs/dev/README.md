# 开发维护入口

本目录只回答一个问题：这次改动应该按什么维护流程推进。

它不承载业务规则本身。业务链路、字段来源、缓存、权限和页面语义仍从 `docs/README.md` 定位，再进入对应 feature-flow、domain-rules、system-design 或 stable spec。

## 先走哪条路

| 场景 | 先看 | 收尾 |
| --- | --- | --- |
| Fast Track 小改动 | `change-intake-template.md` 的最小填写块 | 最小相关测试，必要文档同步即可 |
| Cleanup / Removal | `project-maintenance-playbook.md` 的快速入口和影响范围 | 说明删除依据、影响范围和测试 |
| Spec-Driven | `openspec-workflow.md`，再看 stable spec | proposal / design / spec / tasks / 文档 / archive |
| 发布或完成态收尾 | `project-maintenance-playbook.md` 的收尾清单 | `pnpm run maintenance:check` |

## 入口职责

- `AGENTS.md`：强制红线和任务分流。
- `docs/README.md`：定位该读哪类业务文档。
- `docs/dev/ai-token-efficiency-playbook.md`：AI 智能体 token 节省强制约束与高 ROI 做法（每次新会话或新任务第一时间读完）。
- `openspec/specs/project-maintenance/spec.md`：长期稳定维护契约。
- `project-maintenance-playbook.md`：日常执行清单和深读说明。
- `change-intake-template.md`：接需求阶段的最小问题分析骨架。
- `openspec-workflow.md`：进入 Spec-Driven 后的阶段细节。

## 当前目录

- [ai-token-efficiency-playbook.md](/d:/WorkCode/AbandonClaw/docs/dev/ai-token-efficiency-playbook.md)
  - **AI 智能体必读**。每次新会话或拿到新任务第一时间读完。汇总读文件 / 工具调用 / 编辑 / 输出 / 验证 / subagent 等环节的高 ROI token 节省做法，违反 §1 强制约束需要在最终答复说明原因。
- [project-maintenance-playbook.md](/d:/WorkCode/AbandonClaw/docs/dev/project-maintenance-playbook.md)
  - 日常维护手册；Fast Track 不需要默认通读全文。
- [change-intake-template.md](/d:/WorkCode/AbandonClaw/docs/dev/change-intake-template.md)
  - 接需求时填写；顶部短块优先，复杂变更再补详细检查。
- [openspec-workflow.md](/d:/WorkCode/AbandonClaw/docs/dev/openspec-workflow.md)
  - Spec-Driven proposal、implementation、archive 阶段说明。
- [testing-policy.md](/d:/WorkCode/AbandonClaw/docs/dev/testing-policy.md)
  - 测试策略、最小验证和回归边界。
- [backend-release-readiness-checklist.md](/d:/WorkCode/AbandonClaw/docs/dev/backend-release-readiness-checklist.md)
  - 服务端上线前检查、运行护栏和真实 HTTP baseline。
- [release-readiness-assessment.md](/d:/WorkCode/AbandonClaw/docs/dev/release-readiness-assessment.md)
  - 上线准备评估与缺口跟踪：业务防护层之外、平台运维层缺口的统一入口。每个缺口包含背景、原因、方案、效果、验收。
- [disaster-recovery.md](/d:/WorkCode/AbandonClaw/docs/dev/disaster-recovery.md)
  - 灾备与数据恢复手册：备份策略、RPO/RTO、恢复操作步骤、自建 pg_dump 兜底、季度演练 checklist。
- [incident-response-runbook.md](/d:/WorkCode/AbandonClaw/docs/dev/incident-response-runbook.md)
  - 平台层防护与事故响应手册：Nginx / 腾讯云 WAF / Cloudflare 推荐配置、异常流量识别、4 类事故响应剧本、日常巡检节奏。
- [docs-audit-2026-05-15.md](/d:/WorkCode/AbandonClaw/docs/dev/docs-audit-2026-05-15.md)
  - 文档与 OpenSpec 关联性 / 冲突 audit：腾讯云 vs Vercel 部署平台对应翻译表、路径死链、命名错位、需求覆盖缺口的处置结论。
- [public-registration-http-baseline-runbook.md](/d:/WorkCode/AbandonClaw/docs/dev/public-registration-http-baseline-runbook.md)
  - 公网开放注册相关 baseline 的准备、执行、blocked 判断和结果留证手册。
- [public-registration-feature-verification-guide.md](/d:/WorkCode/AbandonClaw/docs/dev/public-registration-feature-verification-guide.md)
  - 公网开放注册前各项防护能力的验证方法、通过标准和失败排查入口。
- [public-registration-readiness-plan.md](/d:/WorkCode/AbandonClaw/docs/dev/public-registration-readiness-plan.md)
  - 公网开放注册、滥用防护、学习数据可信化和运营处置的优先级执行计划。
- [server-data-boundary-audit.md](/d:/WorkCode/AbandonClaw/docs/dev/server-data-boundary-audit.md)
  - 用户态数据边界、RLS、SQL 映射和服务端白名单审计。
- [dev-log.md](/d:/WorkCode/AbandonClaw/docs/dev/dev-log.md)
  - 开发过程记录；不是正式 CHANGELOG。

## 常用命令

```bash
pnpm run maintenance:check
pnpm exec openspec validate --all --strict
pnpm run text:check-mojibake
git diff --check
```

## 测试账号与 P0 smoke

```bash
pnpm run seed:test-users
pnpm run reset:test-user -- --email=<test-email>
pnpm run smoke:p0-auth-loop -- --base-url=http://127.0.0.1:3000
pnpm run test:scripts
```

- `seed:test-users` 需要：
  - `ALLOW_TEST_USER_SEED=true`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TEST_NORMAL_EMAIL`
  - `TEST_RESTRICTED_EMAIL`
  - `TEST_ADMIN_EMAIL`
  - `TEST_USER_PASSWORD`
- `reset:test-user` 需要：
  - `ALLOW_TEST_USER_RESET=true`
  - 上述测试账号 email 白名单，或 `TEST_USER_ALLOWED_DOMAIN`
- `smoke:p0-auth-loop` 会先 reset `TEST_NORMAL_EMAIL`，再用正式 Supabase 登录 session 跑 `/today -> scene -> save phrase -> review -> complete scene -> today` 的 API 级闭环，并验证 admin 可访问 `/admin`、restricted 访问 `/admin` 被拒绝或重定向。
- `TEST_ADMIN_EMAIL` 还需要同时出现在 `ADMIN_EMAILS`，否则账号虽然会被 seed，但仍不能访问 `/admin`。

## 深读触发

只有出现以下情况时，才继续深读维护手册或专项文档：

- 改动影响主链路、状态流、数据流、缓存、权限或稳定规则。
- Fast Track / Cleanup 处理中暴露了规则漂移、重复语义、缺失文档、缺失测试或边界不清。
- 准备做 Spec-Driven 完成态提交或 archive。
- 需要判断正式 `CHANGELOG.md`、dev-log、stable spec 是否要同步。
