# 设计说明：强化 AI 协作中文输出规则

## Status
draft

## Current Flow
当前入口：`AGENTS.md` 要求所有输出使用中文。
当前处理链路：模型读取 `AGENTS.md` 后应按中文输出，但 stable spec、接需求模板和部分 OpenSpec 产物没有显式重复这条长期契约。
当前回退路径：用户发现英文输出后只能在对话中纠正，项目文件本身没有足够多的稳定锚点。

## Problem
- 语言规则只在入口强约束中出现，其他模型如果读取不完整上下文，容易输出纯英文。
- OpenSpec proposal / design / tasks 没有统一说明默认中文，容易出现英文任务项。
- 需要保留代码、命令、API 名和错误原文中的英文，不能简单禁止所有英文字符。

## Stability Closure
### In This Round
- 在 `AGENTS.md` 增强强约束入口。
- 在 `docs/dev/change-intake-template.md` 增加接需求阶段的语言检查。
- 在 `openspec/specs/project-maintenance/spec.md` 增加长期稳定 requirement。
- 用本 change 记录原因、范围和不收项。

### Not In This Round
- 不重写历史 archive 和历史 dev-log。
- 不做自动检测脚本，避免为了文档语言引入新的维护脚本负担。

## Decision
把语言规则定义为“默认中文、禁止纯英文回答、允许必要英文原文”的维护契约。

规则分层：
- `AGENTS.md`：给模型最先读到的硬约束。
- `docs/dev/change-intake-template.md`：让接需求阶段显式检查语言要求。
- `openspec/specs/project-maintenance/spec.md`：作为长期稳定契约，避免规则只留在入口文档。
- change delta：记录本次规范变更的新增要求。

## Risks
- 风险 1：模型误以为所有英文都要翻译，导致代码、API、命令或错误原文失真。
- 缓解：规则中明确这些内容可以保留英文。
- 风险 2：历史文档仍存在英文或乱码，可能让模型误判。
- 缓解：本轮明确历史内容不是默认输出语言，后续回答与新增维护产物以中文为准。

## Validation
验证方式：
- 检查新增规则是否出现在强约束入口、接需求模板、stable spec 和 change delta。
- 运行 `git diff --check`。

回归范围：
- 文档规范变更，不跑业务测试。

未覆盖风险：
- 不验证所有历史文档是否已经中文化。
