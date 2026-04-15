# 设计说明：补齐数据库防护与上线准备

## Status
draft

## Current Flow
当前入口：
- 用户态读写主链路已经大多走 `createSupabaseServerClient`
- 高成本接口已具备 requestId、Origin 校验、统一校验和共享限流优先能力
- 压测脚本同时支持 in-process handler baseline 与 HTTP baseline

当前处理链路：
- 服务层负责用户身份约束、幂等与统一错误收口
- 数据库侧仍存在“服务层已收紧，但 RLS / SQL 规则未完全补齐”的缺口
- 真实 HTTP baseline 仅有脚本，没有稳定记录的执行流程与环境检查清单

当前回写：
- 已有 `docs/dev/dev-log.md`
- 已有 `docs/dev/server-data-boundary-audit.md`
- 已有第二阶段基线与收口记录

当前回退路径：
- 仍可通过白名单后台入口保留必要的 `service role` 任务
- RLS / SQL 变更需要具备可回滚说明，避免直接阻断主链路

## Problem
当前问题：
- 服务层边界已经明显收紧，但数据库侧缺少同等级的最小权限兜底。
- 现有基线更偏进程内，不能完整反映 HTTP 入口上的认证、Origin、Cookie、限流头和 429 行为。
- 上线前缺少统一检查入口，环境变量、白名单边界和风险接受项容易散落在聊天与代码注释里。

不一致点 / 不稳定点：
- “服务层允许但数据库未约束” 与 “数据库收紧后缺少验证” 两类风险同时存在。
- 压测脚本已具备能力，但还没有被纳入稳定的交付检查。
- 第二阶段遗留的 `1.3` 仍未真正关闭。

## Decision
设计决策 1：
只补“已切到用户上下文”的关键用户态表的最小 RLS / SQL，不做全库清洗。

设计决策 2：
真实 HTTP baseline 复用现有 `load-api-baseline`，不再引入新压测框架；以最小可重复执行为主。

设计决策 3：
新增一份“上线前检查清单”，明确：
- Redis 共享限流环境变量
- 允许的 Origin
- 仍保留 `service role` 的白名单入口
- 需要接受的剩余风险
- 必跑验证命令

设计决策 4：
数据库策略、真实压测和上线清单都在同一个 change 中完成，因为三者共同决定“当前治理能力是否可上线”。

## Risks
风险 1：
RLS / SQL 收紧可能导致现有测试以外的链路读写失败。

风险 2：
真实 HTTP baseline 需要可用的本地或 preview 服务，环境不齐时会阻塞验证。

风险 3：
如果上线清单只描述“理想状态”而不写剩余白名单与已知例外，后续维护者会误判当前安全边界。

## Validation
验证方式：
- 最小相关接口测试
- 数据库策略覆盖的冒烟验证
- 真实 HTTP baseline 执行记录
- 环境清单与白名单入口核对

回归范围：
- `review submit`
- `learning progress / complete`
- `phrases save / save-all`
- `practice generate`
- `tts`

未覆盖风险：
- 多实例真实线上流量形态仍与本地 baseline 不同
- 后台脚本和历史数据兼容性仍需结合部署环境确认
