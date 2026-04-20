# Dev

本目录用于维护“开发流程与维护约定”文档。

这里回答的是：

- 这个项目平时怎么改
- 什么情况要走 OpenSpec
- 测试和验证该怎么收敛
- 变更过程记录在哪里

如果你已经通过 `docs/README.md` 理解了模块、链路、规则和实现，但还需要知道“应该按什么流程动手”，再看这里。

使用约定：

- 本文件负责目录导航，不重复展开所有流程细节
- `docs/README.md` 是仓库总入口；`project-maintenance-playbook.md` 是 `dev` 目录下的日常维护主入口
- `openspec/specs/project-maintenance/spec.md` 是开发流程与维护约定的稳定约束入口
- `openspec-workflow.md` 是 Spec-Driven 阶段规则的唯一细化说明
- 开始做需求前，先按维护手册做一次“稳定性收口检查”，不要把已识别的不稳定点留到后续零散修补

## 当前目录

- [project-maintenance-playbook.md](/d:/WorkCode/AbandonClaw/docs/dev/project-maintenance-playbook.md)
  - 项目维护主入口，适合新维护者先读
- [testing-policy.md](/d:/WorkCode/AbandonClaw/docs/dev/testing-policy.md)
  - 测试策略与验证边界
- [openspec-workflow.md](/d:/WorkCode/AbandonClaw/docs/dev/openspec-workflow.md)
  - Spec-Driven 变更流程说明
- [change-intake-template.md](/d:/WorkCode/AbandonClaw/docs/dev/change-intake-template.md)
  - 需求接入与变更梳理模板
- [backend-release-readiness-checklist.md](/d:/WorkCode/AbandonClaw/docs/dev/backend-release-readiness-checklist.md)
  - 服务端治理上线前检查入口，对应运行护栏与真实 HTTP baseline
- [server-data-boundary-audit.md](/d:/WorkCode/AbandonClaw/docs/dev/server-data-boundary-audit.md)
  - 用户态数据边界、RLS / SQL 映射与后台白名单审计记录
- [dev-log.md](/d:/WorkCode/AbandonClaw/docs/dev/dev-log.md)
  - 开发过程记录，不是正式 CHANGELOG

## 推荐使用方式

- 第一次接手项目
  - 先看 `docs/README.md`
  - 再看 `project-maintenance-playbook.md`
- 需要确认哪些开发约束属于长期稳定规则
  - 先看 `openspec/specs/project-maintenance/spec.md`
  - 再回到 `project-maintenance-playbook.md` 或 `openspec-workflow.md` 看执行细节
- 判断这次要不要走规范变更
  - 先看 `project-maintenance-playbook.md` 的判断口径
  - 进入 Spec-Driven 后再看 `openspec-workflow.md`
- 做测试、补测试或判断验证范围
  - 看 `testing-policy.md`
- 做服务端治理上线检查或真实 HTTP baseline
  - 看 `backend-release-readiness-checklist.md`
- 盘点用户态数据边界、白名单入口或 RLS / SQL 映射
  - 看 `server-data-boundary-audit.md`
- 需要记录本轮改动和中间态决策
  - 追加到 `dev-log.md`

如果这次改动同时涉及稳定 spec 分工，建议这样找：

- 认证入口、来源校验、用户态数据边界
  - 先看 `openspec/specs/auth-api-boundaries/spec.md`
- 接口失败保护、最小可观测性、运行护栏
  - 先看 `openspec/specs/api-operational-guardrails/spec.md`
  - 再看 `backend-release-readiness-checklist.md`
- 开发过程记录与正式 CHANGELOG 规则
  - 先看 `openspec/specs/project-maintenance/spec.md`
  - 再看 `openspec-workflow.md` 与 `dev-log.md`

如果你只想记一条最小路径，可以这样理解：

- `docs/README.md`
  - 负责先定位问题属于系统哪一层
- `docs/dev/project-maintenance-playbook.md`
  - 负责日常维护怎么判断、怎么落地
- `openspec/specs/project-maintenance/spec.md`
  - 负责哪些维护规则属于长期稳定约束
- `docs/dev/openspec-workflow.md`
  - 负责进入 Spec-Driven 后每个阶段具体怎么走

## 使用原则

出现这些情况时，应优先补或改 `dev`：

- 开发流程变化
- 测试策略变化
- OpenSpec 使用规则变化
- 维护入口或交接方式变化

以下内容通常不应单独写在这里：

- 业务规则定义
- 页面字段映射
- 模块职责说明
- 主链路本身的产品语义

## 建议正文模板

新增或重写 `dev` 文档时，优先按这组章节组织：

1. 文档目标
2. 适用范围
3. 使用原则
4. 操作流程或决策规则
5. 常见风险
6. 相关入口
