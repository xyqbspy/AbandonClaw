# Design: Chunks 必备表达与 builtin core phrase 体系

## 现状

当前系统已经具备两段可复用能力：

1. starter / builtin scenes 数据
   - `builtin-scene-seeds.ts` 已沉淀真实 starter scenes 与 chunk 文本。
   - P0 scene 元字段已经能表达 `level / category / source_type / is_starter / sort_order / learning_goal`。

2. user phrase 保存闭环
   - `savePhraseForUser` 已能：
     - 复用或创建 `phrases`
     - 幂等 upsert `user_phrases`
     - 初始化 review due
     - 写入 daily stats / scene saved phrase count
   - `review` 与 `today` 继续消费 `user_phrases.review_status / next_review_at`

因此 P3 不需要重造 phrase 保存或 review 初始化，而是要在它之前补一层“系统内置表达库”。

## 决策

### 决策 1：builtin phrases 仍然落在 `phrases`，用户资产继续只落 `user_phrases`

做法：

- 复用现有 `phrases` 作为共享 phrase 实体。
- 给 `phrases` 增加最小 builtin/core 元字段：
  - `is_builtin`
  - `is_core`
  - `level`
  - `category`
  - `phrase_type`
  - `source_scene_slug`
  - `frequency_rank`
  - `tags` 继续复用现有 jsonb

原因：

- 符合当前仓库“`phrases` 是共享实体、`user_phrases` 是用户态资产”的边界。
- 可以直接复用 `phrase_id` + `unique(user_id, phrase_id)` 做保存幂等。
- 不需要引入新的 builtin_phrase 表，也不需要把系统推荐资产和用户资产混表。

### 决策 2：新增只读 API `GET /api/phrases/builtin`

职责：

- 返回 builtin/core phrase 列表
- 支持：
  - `level`
  - `category`
  - `search`
  - `limit`
- 为当前用户补 `isSaved`
- 允许来源场景被安全降级

原因：

- 当前 `/api/phrases/mine` 明确是用户资产视图，不应塞进 builtin 语义。
- 单独接口能把推荐库逻辑留在服务端聚合，前端只消费稳定结构。

### 决策 3：继续复用 `POST /api/phrases/save`

做法：

- builtin card 点击“保存到我的表达”后，不新开专用保存接口。
- 直接把 builtin phrase 的 `text / translation / usageNote / tags / sourceSceneSlug / sourceType` 送进现有保存链。
- service 端继续按 `phrase_id` 幂等 upsert `user_phrases`。

原因：

- 当前保存链已经具备 review 初始化与 stats 回写。
- 能最大程度保证“保存 builtin phrase”和“从 scene / manual 保存 phrase”仍是一套语义。

### 决策 4：Chunks 顶层新增 tab，而不是重写整页

顶层结构：

- Header：表达资产 + 简短说明
- Tabs：
  - `我的表达`
  - `必备表达`

行为：

- `我的表达` 保持现有 `Chunks` 工作台能力。
- `必备表达` 走轻量卡片列表和筛选条，更接近 `newChunks.html`。

原因：

- 现有 `Chunks` 页面已经承载大量 detail / cluster / relation 交互，不适合整页推倒重来。
- 顶层 tab 能把新用户推荐层插入进来，同时不破坏老用户工作台。

### 决策 5：第一批 builtin/core phrase 数据由真实 starter/builtin scenes 驱动

做法：

- 新增 SQL/seed，把第一批 builtin/core phrase 写入 `phrases`
- 词条来源优先：
  - starter scenes
  - builtin daily scenes
  - 真实 chunk 文本
- 每条 phrase 带 source scene 元信息

原因：

- 满足“不写死页面 mock”的要求。
- 页面 API 可以直接消费 shared phrase 实体，而不是运行时临时从 `builtin-scene-seeds.ts` 拼装脆弱 view model。

## 数据流

1. 系统预置 builtin/core phrases 到 `phrases`
2. `GET /api/phrases/builtin`
   - 读取 builtin/core phrases
   - 按当前 user 查询已保存 phrase_id
   - 返回 `isSaved`
3. 用户点击“保存到我的表达”
4. `POST /api/phrases/save`
   - ensure shared phrase
   - upsert `user_phrases`
   - 保持 review due 初始化
5. 之后：
   - `我的表达` 通过 `/api/phrases/mine` 可见
   - `review` 可消费
   - `today / progress` 继续通过既有聚合字段消费

## UI 设计方向

参考 `newChunks.html`，但保持现有项目组件体系：

- 顶部使用更轻的玻璃感 header + search + tabs
- builtin cards 使用大圆角白卡、左侧强调色边、badge 和主 CTA
- `我的表达` 为空时给出友好空状态，并引导去：
  - `必备表达`
  - `/scenes`
- 筛选条移动端优先，可横向滚动

不做：

- 新 UI 库
- 独立“词典页”
- 与现有 detail workbench 并行的第二套 detail 系统

## 边界与降级

- builtin phrase 缺 translation：显示友好 fallback，不阻断保存
- source scene 被删：保留 phrase，可不展示跳转
- 重复点击 save：返回已存在 user_phrase，按钮变已保存
- 没有 builtin phrases：`必备表达` 显示空状态
- 没有 starter scenes / seed：整个 builtin tab 安全降级，不影响 `我的表达`

## 本轮收口项

- built-in vs user-owned phrase 语义边界
- save 幂等
- builtin 浏览与筛选
- Chunks 顶层新用户入口

## 明确不收项

- review 算法升级
- cluster 重新建模
- phrase 详情页重构
- AI 推荐与复杂排序模型
