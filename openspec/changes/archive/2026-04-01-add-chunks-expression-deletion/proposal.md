## Status

completed

## Why

当前 `chunks` 详情弹框已经支持查看、补全、改主表达、移簇和重新生成音频，但没有“删除当前表达资产”的正式契约。现状会带来几个直接问题：

- 用户无法在 `chunks` 详情里移除误存、重复或不再需要的主表达、同类表达或对照表达。
- 当前系统只有 `detach` 和 `move`，没有“删除表达后 cluster 如何重排”的明确规则；如果直接删除主表达，数据库只会把 `main_user_phrase_id` 置空，不会自动补位新的主表达。
- 表达删除还会影响 relation、review、cluster member、详情回退和列表刷新；如果只补一个按钮而不补完整语义，很容易造成空簇、悬空详情、残留关系或 review 数据解释不一致。
- 当前 TTS 资源更接近按文本共享缓存，而不是按 `user_phrase` 私有归属；如果误把“删表达”理解成“删所有关联音频文件”，会有误删共享资源的风险。

这个需求需要先通过一次 OpenSpec 变更，把删除契约、主表达补位规则、级联清理边界和前端回退逻辑写清楚，再决定 UI 和 API 的具体落地。

## What Changes

- 为 `chunks` 详情定义正式的“删除表达”能力，覆盖主表达、同类表达和对照表达的删除入口与交互反馈。
- 明确删除入口放在详情左下角 `...` 更多操作菜单中，且始终作用于“当前详情正在展示的表达”。
- 删除动作必须经过公共二次确认弹框，避免误触发高风险操作。
- 新增用户侧删除表达 API / service 契约，删除对象限定为当前用户的 `user_phrases` 资产，而不是全局 `phrases` 词典项。
- 明确删除主表达后的 cluster 处理规则：
  - 若 cluster 仍有其他成员，自动选择新的主表达并保留当前 cluster。
  - 若 cluster 已无剩余成员，删除空 cluster。
- 明确删除次要表达后的副作用处理规则，包括 relation、cluster member、review 相关数据与详情页 / 列表刷新。
- 明确音频删除边界：第一版删除表达时不物理删除共享 TTS 存储对象，只处理表达数据、关联状态和当前播放 / 详情回退。
- 同步更新 `chunks` 数据映射文档与回归测试，确保删除链路可维护、可验证。

## Capabilities

### Modified Capabilities

- `chunks-data-contract`: 补充 `chunks` 表达删除、cluster 主表达补位、级联清理和音频边界契约。

## Scope

### In Scope

- `chunks` 详情弹框中的删除动作方案
- 用户侧表达删除 API、后端 service 和 cluster 重排逻辑
- 删除后 relation / review / cluster member / 详情状态 / 列表刷新的语义
- `docs/chunks-data-mapping.md` 与相关测试更新

### Out of Scope

- 删除全局 `phrases` 词典项
- 删除服务端共享 TTS 存储对象或重构整套音频缓存策略
- 批量删除多个表达
- 管理后台表达删除流程改造

## Impact

- 影响的规范：
  - `chunks-data-contract`
- 影响的代码模块：
  - `src/features/chunks/components/focus-detail-*`
  - `src/components/shared/*`
  - `src/app/(app)/chunks/page.tsx`
  - `src/app/(app)/chunks/use-expression-cluster-actions.ts`
  - `src/lib/utils/phrases-api.ts`
  - `src/app/api/phrases/*`
  - `src/lib/server/phrases/service.ts`
  - `src/lib/server/expression-clusters/service.ts`
  - `docs/chunks-data-mapping.md`
- 是否涉及数据库迁移：待定，优先按现有表结构与级联约束实现；若现有 service 无法稳定完成主表达补位，再补充迁移评估
- 是否涉及 API 行为变更：是
- 是否影响前端交互：是
- 是否影响缓存策略：是，主要体现在详情状态、列表刷新和关系缓存失效
- 是否影响测试基线或回归范围：是
- 兼容性：以向后兼容为主，但会新增“删除表达后立即移除详情与相关数据”的显式行为
- 主要风险：
  - 主表达删除后的补位算法如果不稳定，会造成 cluster 视图跳动或错误主表达
  - 若误删共享音频资源，会影响其他仍在使用同文本的表达
  - 若只依赖数据库级联而不补 UI 回退，前端会出现悬空详情或旧数据残留
