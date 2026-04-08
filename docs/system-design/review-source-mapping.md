# Review 页面来源与场景关联维护说明

## 1. 文档目的

这份文档专门说明 `review` 页面里的两类复习项分别来自哪里、页面展示字段和后端数据怎么对应，以及“查看原场景”什么时候能跳、什么时候只能降级提示。

后续如果要调整 `review` 的来源范围、原场景入口策略或回补链路，应该先更新这份文档，再同步对应的 OpenSpec change。

如果要维护单次复习内部“从识别到输出”的阶段训练，请同时查看：

- `docs/system-design/review-progressive-practice.md`

## 2. 当前复习项分成两类

### 2.1 普通表达复习

普通表达复习来自 `user_phrases`。

当前后端入口：

- `src/lib/server/review/service.ts`
- `getDueReviewItems(userId, { limit })`

当前筛选规则：

- `review_status` 属于 `saved` 或 `reviewing`
- 已到复习时间，或允许立即进入当前复习队列
- 不要求来源场景已经全部完成

这条契约的重点是：

- `review` 普通表达复习的真实来源是“已保存且到期的表达”
- 不是“所有学过的场景”
- 也不是“仅已完成场景里的表达”

如果后续要把普通表达复习改成“仅来自已完成场景”，那会是显式产品行为变化，必须单独走新的 OpenSpec change。

### 2.2 场景回补复习

场景回补来自 `user_scene_practice_attempts` 联合 `scenes`。

当前后端入口：

- `src/lib/server/review/service.ts`
- `getDueScenePracticeReviewItems(userId, { limit })`

这条链路会直接关联当前仍可见的场景，所以当场景已经不可见时，这类回补项不会继续进入 `review` 列表。

## 3. 页面展示字段与后端关系

前端主要消费：

- `src/lib/utils/review-api.ts`
- `DueReviewItemResponse`
- `DueScenePracticeReviewItemResponse`

普通表达复习里与原场景跳转相关的字段有：

- `sourceSceneSlug`
  - 历史来源场景的 slug
  - 这是辅助跳转信息，不等于“该场景当前一定可访问”
- `sourceSceneAvailable`
  - 服务端根据当前用户可见场景集合额外计算出的布尔值
  - 用来决定页面是否真的展示“查看原场景”按钮
- `sourceSentenceText`
  - 来源句子文本，用于在复习页里辅助回忆

对应前端页面：

- `src/app/(app)/review/page.tsx`

## 4. 查看原场景的展示规则

### 4.1 可访问来源场景

当一条普通表达复习项同时满足：

- `sourceSceneSlug` 有值
- `sourceSceneAvailable === true`

页面才展示“查看原场景”按钮，并允许跳转到 `/scene/[slug]`。

### 4.2 来源场景已失效

当一条普通表达复习项满足：

- `sourceSceneSlug` 有值
- `sourceSceneAvailable === false`

页面不能继续展示可点击跳转按钮，而是展示降级提示：

- 来源场景已不可用
- 这条表达仍可继续复习，但原始场景当前已无法访问

这样可以保留这条表达的复习能力，同时避免用户被直接送到“不存在的场景”。

### 4.3 没有来源场景

当 `sourceSceneSlug` 为空时，页面不展示原场景入口，也不额外展示失效提示。

这类表达通常来自：

- 手动加入表达库
- 历史数据没有场景来源
- 其他不依赖具体场景的保存链路

## 5. 与 today / chunks / scene 的边界

- `scene` 负责产生真实语境和学习上下文，但不直接决定一条表达是否进入 `review`
- `chunks` 负责保存、整理、补全和管理表达；表达一旦进入 `saved/reviewing`，后续是否进入 `review` 由复习队列规则决定
- `today` 只展示复习数量与入口，不重新解释 `review` 的来源规则

这意味着：

- 场景完成与否，不是普通表达能否进入 `review` 的前置条件
- 进入 `review` 的关键条件仍然是表达是否已进入复习体系，以及当前是否到期

## 6. 后续维护注意点

- 如果修改 `getDueReviewItems()` 的筛选条件，必须同步检查这份文档和 `review-source-contract` 规范
- 如果修改 `sourceSceneSlug` 的写入来源，必须验证 `sourceSceneAvailable` 计算是否仍然可靠
- 如果要让“查看原场景”支持更多回退策略，例如跳转到 `chunks` 详情或来源句子详情，也应先补 OpenSpec proposal

## 7. 建议回归点

- 普通表达复习：有来源场景且当前可访问
- 普通表达复习：有来源场景但当前不可访问
- 普通表达复习：没有来源场景
- 场景回补复习：正常进入场景复现与提交
- `review` 页面下拉刷新后，来源场景可访问性字段仍正确刷新
