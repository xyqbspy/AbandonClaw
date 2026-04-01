## Status

completed

## Current Flow

当前 `chunks` 详情链路已经支持表达查看、补全、改主表达、移簇和重新生成音频，但还没有正式的“删除当前表达”语义。

- 前端详情动作主要集中在 `focus-detail-sheet`、`focus-detail-sheet-footer` 和 `use-expression-cluster-actions`
- 现有 cluster service 已覆盖 `ensure / set main / merge / move / detach`
- `detach` 只会把表达拆成独立 cluster，不会删除 `user_phrases`
- 用户侧 `phrases` API 原本没有 delete 契约，实际删除能力主要停留在 admin 侧
- 数据库层面对 `user_phrase_relations`、`user_expression_cluster_members`、review 相关记录已有 `ON DELETE CASCADE`
- 但 `user_expression_clusters.main_user_phrase_id` 只有 `ON DELETE SET NULL`

这意味着直接删除 `user_phrases` 时，大部分从属关系会被数据库自动清理，但如果删掉的是 cluster 主表达，cluster 会进入“还存在，但没有主表达”的中间状态，必须由应用层显式补位。

## Problem

如果只补一个“删除按钮”，而不定义完整契约，会出现几类不完整行为：

1. 主表达删除后 cluster 丢失主表达，详情和列表无法稳定解释当前焦点。
2. 次要表达删除后，虽然数据库会 cascade 掉部分记录，但前端 detail tab、saved relations 和 focus trail 不会自动回退。
3. review / relation / cluster 三类副作用如果不统一收口到同一条删除 service，后续维护会重新出现“只修局部”的问题。
4. TTS 资源当前更接近按文本共享缓存，而不是按 `user_phrase` 私有归属；如果误把“删表达”理解成“删所有关联音频文件”，会误删共享资源。

## Decisions

### 1. 删除对象限定为当前用户表达资产

- 第一版删除的是 `user_phrases.id`，不是全局 `phrases.id`
- 删除接口必须校验当前用户拥有该 `user_phrase`
- 后端 service 统一承担删除、cluster 修复和结果返回
- 前端不自行拼装 cluster 补位语义，只消费标准化返回结果

### 2. 主表达删除时由应用层显式补位

- 删除前先识别目标表达是否为所在 cluster 的 `main_user_phrase_id`
- 若删除后 cluster 仍有剩余成员：
  - 后端必须先计算 `nextMain`
  - 再把 `main_user_phrase_id` 更新到新的成员
  - 第一版按稳定顺序补位，优先选择剩余成员中的当前主表达候选或列表首项
- 若删除后 cluster 已无成员：
  - 后端必须删除空 cluster
  - 不允许留下“无主空簇”

当前实现已经把这层规则收口到删除逻辑 helper，并由删除 service 复用。

### 3. 次要表达删除遵循“删资产 + 刷上下文”

- 无论当前详情打开的是 similar 还是 contrast，本质上删除的都是对应 `user_phrase`
- 删除后依赖数据库级联清理 relation、cluster member、review 相关记录
- 前端必须显式刷新：
  - `chunks` 列表
  - 当前 focus detail 数据
  - saved relations 缓存
  - 当前 detail trail / sibling 导航

### 4. 详情回退规则必须显式定义

- 删除入口固定放在详情左下角 `...` 更多操作菜单中，语义绑定当前详情对象
- 删除前必须弹出公共确认弹框，不使用浏览器原生 `window.confirm`

删除当前打开的主表达时：

- 若 cluster 还有新主表达，详情自动切换到新主表达
- 若 cluster 被删空，详情关闭

删除当前打开的次要表达时：

- 优先切到另一条可展示表达
- 若当前 cluster 里没有可切换项，则关闭详情

删除列表中的 related row 但当前详情未切到该行时：

- 当前主详情保持不变
- 只刷新 tab 列表、计数和导航状态

当前实现已经把删除成功回退收口到页面级 helper：

- `clusterDeleted = true` 时关闭详情
- `nextFocusUserPhraseId` / `nextMainUserPhraseId` 存在时优先切到后端补位目标
- 不再由页面自己猜“删完应该跳到谁”

### 5. 第一版不物理删除共享 TTS 音频对象

- 删除表达时不删除服务端共享 TTS 存储资源
- 若当前 detail 音频正在播放，需要停止播放并清理前端临时状态
- 后续若要做音频垃圾回收，应单独立项，按“引用计数 + 可回收缓存”处理，不与表达删除流程绑定

### 6. 删除结果必须返回足够的前端回退信息

删除 API 需要返回标准化结果，至少包括：

- `deletedUserPhraseId`
- `deletedClusterId`
- `clusterDeleted`
- `nextMainUserPhraseId`
- `nextFocusUserPhraseId`

前端依据这组结果决定：

- 是否关闭详情
- 是否切到新主表达
- 是否只刷新 related rows

## Risks

- 若 `nextMain` 选择规则不稳定，用户会感知到主表达频繁跳变
- 若 service 层只依赖数据库级联、不返回显式语义，前端很难稳定处理详情回退
- 若删除后刷新链路不完整，`chunks` 页面容易残留旧 focus 状态或旧 relation 计数

## Validation

- service 单测：
  - 删除主表达且 cluster 仍有成员时，正确补位新主表达
  - 删除主表达且 cluster 只剩自身时，删除空 cluster
  - 删除次要表达时，cluster 主表达不被错误改写
- route 单测：
  - 未登录、越权、删除不存在表达、删除成功
  - 返回 payload 包含前端回退所需信息
- 前端测试：
  - 删除动作从 `...` 更多操作菜单进入，并显示公共确认弹框
  - 删除主表达后切到新主表达
  - 删除空簇最后一个表达后关闭详情
  - 删除成功回调会拿到后端结果和刷新后的 rows
  - similar / contrast tab 删除后列表即时刷新
- 文档验证：
  - `docs/chunks-data-mapping.md` 补充删除链路
  - OpenSpec delta 与实现保持一致

## 删除表达链路补充说明（2026-04-01）

- 删除当前 cluster 的主表达时，如果 cluster 还有剩余成员，后端必须先显式补位新的 `main_user_phrase_id`，前端详情随后切换到新的主表达。
- 删除的是 cluster 中最后一个表达时，后端必须删除空 cluster，并把 `clusterDeleted = true` 返回给前端；详情侧应关闭当前弹框，而不是停留在一个已不存在的空簇上。
- 这一层规则由删除 service 返回的 `clusterDeleted`、`nextMainUserPhraseId`、`nextFocusUserPhraseId` 驱动，避免前端自行猜测补位结果。
