# AbandonClaw 组件库说明

## 1. 这份文档解决什么问题

这份文档用来回答两个维护高频问题：

- 一个组件应该放在 `src/components/*`、`src/features/*/components`，还是页面层？
- 一个组件已经被别的 feature 复用时，什么时候该迁到公共层？

如果问题是“新增页面或功能时 UI 风格应该怎么统一”，先看 [ui-style-guidelines.md](/d:/WorkCode/AbandonClaw/docs/system-design/ui-style-guidelines.md)。如果问题是“现有页面样式漂移应该从哪里开始收”，先看 [ui-style-audit.md](/d:/WorkCode/AbandonClaw/docs/system-design/ui-style-audit.md)。本文件只负责组件分层和公共化边界。

当前仓库已经稳定存在三类组件职责：

- 公共组件：跨页面、跨 feature 复用，职责稳定
- feature 组件：只服务某个学习域，携带明确业务语义
- 页面组装组件：负责路由态、数据拼装、页面级编排

## 1.1 公共化不是把 class 变成变量

把页面 JSX 里的 class 收到 `*-page-styles.ts` 或 feature 私有 styles 文件，只是样式收口，不等于公共组件或公共样式抽象。

三层职责必须区分：

- design tokens：颜色、圆角、阴影、字体、间距等底层变量，放在全局 CSS 或底层样式入口，不携带业务语义。
- shared UI semantics：跨页面稳定复用的 UI 语义，例如 `EmptyState`、`DetailInfoBlock`、音频动作按钮、admin 操作按钮；这类能力才适合进入 `src/components/shared`、`src/components/audio` 或 `src/components/admin`。
- feature-private styles：只服务单个页面族或 feature 的组合样式，例如 `today-page-styles.ts`、`review-page-styles.ts`、`scene-page-styles.ts`；它们用于减少漂移和 JSX 噪音，但仍是私有实现细节。

判断规则：

- 只在一个 feature 内复用的 class，优先留在 feature 私有 styles。
- 只有当同一种 UI 语义在 2-3 个页面或 feature 中稳定出现，并且名称、props、状态职责脱离原 feature 后仍然清晰，才考虑抽 shared 组件。
- 不要把 `TODAY_*`、`REVIEW_*`、`SCENE_*` 这类私有常量直接上移为公共样式；如果确实要公共化，应先抽稳定组件或 variant，而不是只移动 class 字符串。
- 公共化的目标是复用稳定语义，不是复用视觉巧合。

## 2. 目录分层规则

### `src/components/ui`

放最基础的 UI primitives。

适合放这里的组件：

- `Button`
- `Sheet`
- `Input`
- `Badge`

判断标准：

- 不携带项目业务语义
- 更接近通用 UI 原子能力
- 主要关注结构、样式和可访问性

### `src/components/shared`

放跨 feature 复用、但不是纯 UI primitive 的稳定公共组件。

当前典型组件：

- `action-loading`
- `detail-sheet-shell`
- `empty-state`
- `segmented-control`
- `segmented-tabs`
- `detail-info-blocks`
- `example-sentence-cards`

判断标准：

- 已被多个 feature 或页面层直接复用
- 输入输出稳定，不依赖单个 feature 的内部状态模型
- 视觉职责清晰，迁出后不会丢失业务语义

### `src/components/audio`

放音频动作类公共组件。

当前典型组件：

- `tts-action-button`
- `loop-action-button`

判断标准：

- 明确属于音频动作子域
- 会被多个页面或 feature 共用
- 比一般 shared 组件更适合集中在音频命名空间

### `src/components/admin`

放管理后台子域内复用的组件。

当前典型组件：

- `admin-action-button`
- `admin-nav`
- `client-events-panel`
- `tts-browser-cache-panel`

判断标准：

- 只服务 `/admin` 及后台维护页面
- 承载后台统一操作层级、菜单或维护面板语义
- 不应因为“样式像按钮/列表”就上移到 `shared`

后台操作按钮统一通过 `AdminActionButton`、`AdminLoadingActionButton` 或 `AdminConfirmActionButton` 表达 `secondary / primary / danger` 三种层级。页面不应继续手拼 `APPLE_BUTTON_* + APPLE_BUTTON_TEXT_*`。

按钮样式规则：

- `Button` 的 `variant` 和 `APPLE_BUTTON_*` 外观类必须保持同一语义层级。
- 主按钮使用 `variant="default"` 或对应封装，不得写成 `variant="ghost" + APPLE_BUTTON_STRONG`。
- 次按钮使用 `variant="secondary"` 或对应封装，不得写成 `variant="ghost" + APPLE_BUTTON_BASE`。
- 危险按钮使用 `variant="destructive"` 或对应封装，不得写成 `variant="ghost" + APPLE_BUTTON_DANGER`。
- `src/components/ui/button-style-guardrails.test.ts` 会防止 `ghost` 与 `APPLE_BUTTON_*` 在同一个按钮里混搭。

### `src/features/*/components`

放 feature 私有组件。

适合继续留在 feature 内的组件：

- `scene` 的练习视图、变体视图
- `chunks` 的焦点详情 sheet、表达地图、cluster 操作面板
- `lesson` 的阅读器、选中工具条、详情面板

判断标准：

- 强依赖该 feature 的 selectors、controller 或状态模型
- 组件名称和交互本身就是这个 feature 的领域概念
- 即使别处看起来“样子类似”，也还没有形成稳定跨域复用

### 页面层 `src/app/*`

放页面级组装与路由编排，不放可复用展示组件。

适合留在页面层的内容：

- 路由参数同步
- 页面级筛选状态
- 页面专属数据请求和聚合
- 多个 feature 组件的装配

## 3. 当前审计结果

本轮明确确认的跨 feature 复用组件如下：

| 组件 | 旧位置 | 新位置 | 迁移原因 |
| --- | --- | --- | --- |
| `DetailInfoBlock` / `DetailStageBlock` / `DetailLoadingBlock` | `src/features/chunks/components/detail-info-blocks.tsx` | `src/components/shared/detail-info-blocks.tsx` | 已被 `chunks` 与 `lesson` 共同使用，属于稳定的信息块展示组件 |
| `ExampleSentenceCards` | `src/features/chunks/components/example-sentence-cards.tsx` | `src/components/shared/example-sentence-cards.tsx` | 已被 `chunks` 页面与 `lesson` 详情共同使用，职责是公共例句卡片 |

这次迁移后的边界是：

- 只迁移已经发生跨 feature 复用的组件
- 不把 `FocusDetailSheet`、`SelectionDetailPanel` 这类强业务容器误迁到公共层
- 不为了追求“目录整齐”而把 feature 内组装组件抽空

## 3.1 当前公共语义候选池

候选池用于记录“可能值得公共化”的 UI 语义，不等于立即待办。只有当候选满足跨页面稳定复用、props 语义清晰、迁移后测试可覆盖时，才进入实现。

优先评估：

| 候选语义 | 当前信号 | 建议方向 | 当前结论 |
| --- | --- | --- | --- |
| 区块加载反馈 | `LoadingState` 已被 today、chunks、review、focus detail 等使用 | 继续沿用 `src/components/shared/action-loading.tsx` | 已是 shared，新增 loading 不应自写 |
| 空态展示 | `EmptyState` 已用于 chunks，admin 有 `AdminEmptyState` 子域变体 | 保持 `EmptyState` 与 admin 子域分离 | 已是 shared，但不强行统一 admin |
| 详情信息块 | `DetailInfoBlock` / `DetailStageBlock` 已被 chunks 与 lesson 使用 | 继续作为详情/浮层信息块基元 | 已是 shared |
| 统计卡片 | `StatCard` 已存在，但不同页面统计密度和语义仍不完全一致 | 新增跨页面统计区时优先评估复用 | 候选，不主动迁移旧页面 |
| 页面标题区 | `PageHeader` 已存在，适合工作台/管理页标题 | 新增页面优先复用，再按页面角色微调 | 候选，不替代学习流程主任务标题 |

继续观察：

| 候选语义 | 当前信号 | 暂不抽原因 |
| --- | --- | --- |
| section header | Today、Review、Scene 都有标题行，但 icon、密度、页面角色差异明显 | 先保留 feature-private styles，等出现稳定 props 再抽 |
| status / info pill | Today、Review、Scene、Chunks 都有 pill，但 tone、尺寸、交互差异较多 | 优先使用 `Badge` 或私有 styles，不直接抽全局 pill |
| step index / progress dot | Today task index、Scene training step、Review stage step 都类似 | 语义分别是任务序号、训练步骤、复习阶段，不宜只因外观相似合并 |
| fixed footer action | Review footer、detail sheet footer、scene floating action 都有底部动作 | 动作层级和容器上下文不同，先遵守各自 stable spec |

明确不抽：

- `TODAY_TASK_INDEX_BADGE_CLASSNAME` 这类 feature 私有常量：当前只表达 Today 任务序号，不是公共 step 组件。
- `ReviewStagePanel`：阶段推进、评估、回写强依赖 Review 队列语义。
- `SceneTrainingCoachFloatingEntry`：强依赖 scene 训练状态、移动端 overlay 和当前步骤动作。
- `FocusDetailSheet` / `SelectionDetailPanel`：都像详情容器，但业务模型和交互职责不同。

## 3.2 最近一轮验证过的边界样例

下面这些案例已经在代码里真实落地，适合作为后续新增页面或继续收口时的判断样板。

### 仍然留在 feature-private 的展示语义

这些组件已经做了内部收口，但仍然留在 feature 内，原因不是“不够整洁”，而是它们的语义仍然强依赖当前 feature。

| 文件 | 当前做法 | 为什么不抽 shared |
| --- | --- | --- |
| `src/app/(app)/chunks/chunks-list-view.tsx` | 收出 `ChunksInfoField`、`ChunksPendingInfoBlock`、`ChunksSimilarExpressionsPanel`、`ChunksSentenceExpressionTags`、`ChunksSourceSentenceField` 等文件内私有展示块 | 这些块虽然都像“信息区/列表项/提示块”，但仍然携带 chunks 列表的字段语义、fallback 规则和交互上下文 |
| `src/features/scene/components/scene-variants-view.tsx` | 收出 `SceneVariantsActionRow`、`SceneVariantListItem` | variants 的动作和条目仍然绑定 scene 变体训练语义，不是通用 action row / list item |
| `src/features/scene/components/scene-expression-map-view.tsx` | 收出 `SceneExpressionMapHeader`、`SceneExpressionMapClusterItem` | expression map 的 header 和 cluster item 都服务 scene 学习流程，不是通用信息列表 |
| `src/features/scene/components/scene-practice-header.tsx` | 收出 `ScenePracticeHeaderBackButton`、`ScenePracticeHeaderMenu` | 头部菜单和完成/重生成动作强依赖 practice 状态与 scene 训练流程 |
| `src/features/scene/components/scene-practice-question-card.tsx` | 收出 `ScenePracticeQuestionNavigator`、`ScenePracticeHintBlock`、`ScenePracticeAnswerActions` 等题卡私有块 | 虽然形态上像导航/提示/操作区，但都深度绑定练习题卡的输入、反馈和答案展示语义 |
| `src/features/progress/components/progress-overview.tsx` | 收出 `ProgressWeeklyMinutesCard`、`ProgressSkillBreakdownCard`，并整理 `statCards` 配置 | 目前仍是 progress 页私有统计区，暂未形成跨页面稳定复用的统计面板契约 |
| `src/features/review/components/review-card.tsx` | 收出 `ReviewCardContextBlock`、`ReviewCardMasteryBlock` | review 卡片虽然是独立展示卡，但仍然绑定 review item 的 due/mastery 语义 |

### 这轮同时验证出的一个规则

如果一个文件已经出现下面两种信号，可以优先做“文件内私有展示单元收口”：

- 主 JSX 已经能看出几个完整的信息块、动作块、条目块
- 这些块脱离当前 feature 后，名称会立刻变空，比如只剩 `Header`、`Menu`、`Panel`、`Item`

这种情况下，优先目标不是迁到 `src/components/shared`，而是：

1. 先把主 render 变成组装层
2. 先把展示语义沉到文件内私有组件
3. 等第二个、第三个真实使用方出现后，再决定是否升级到 shared

## 4. 新增组件时怎么判断

新增组件前，先确认它所在页面和动作层级是否符合 [ui-style-guidelines.md](/d:/WorkCode/AbandonClaw/docs/system-design/ui-style-guidelines.md)。再按下面顺序判断组件落点。

按下面顺序判断：

1. 它是不是纯 UI primitive？
2. 它是不是已经被多个 feature 共享，并且 props 语义稳定？
3. 它是不是某个 feature 独有的业务容器？
4. 它是不是页面层特有的路由或数据编排？

落点规则：

- 纯 UI primitive -> `src/components/ui`
- 跨 feature 稳定复用 -> `src/components/shared` 或专门子域
- feature 私有业务组件 -> `src/features/<feature>/components`
- 页面专属组装 -> `src/app/*`

## 5. 什么情况下不要抽公共

下面这些情况，默认不要抽：

- 只是样式看起来相似，但输入输出和交互职责不同
- 只在一个 feature 内复用，尚未形成跨域需求
- 组件严重依赖 feature 内部 hook、selector、controller
- 抽出去之后名称会变得很空泛，只剩“card”“panel”“section”这类模糊壳子
- 为了“以后可能复用”提前抽象，但当前没有真实第二个使用方

反例：

- `SelectionDetailPanel` 和 `FocusDetailSheet` 都是详情容器，但它们服务的业务模型不同，不应该因为都有详情区就合成一个公共组件
- `chunks` 的表达地图与 `scene` 的学习流程视图都很重要，但它们不是同一种稳定公共组件

## 6. 什么时候先做内部拆分，而不是继续抽公共

如果一个组件已经开始同时承担下面几类职责，优先先在 feature 内部拆分：

- 路由态或 query 同步
- 多个 sheet / panel / overlay 的装配
- 播放、保存、删除、跳转等多组动作编排
- 同时维护 loading、错误、禁用、空态和缓存回写
- 同一文件里既有大段 JSX，又有大量条件派生和副作用

当前项目里更该先拆内部模块的典型对象：

- `src/app/(app)/chunks/page.tsx`
- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- `src/features/lesson/components/lesson-reader.tsx`

推荐拆分顺序：

1. 先提取 feature 内部 hook 或 logic，收口动作条件和派生状态
2. 再提取局部装配组件，例如 sheet、floating entry、step actions
3. 最后再判断拆出的片段是否真的形成跨 feature 稳定复用

不要直接把重业务容器抽到 `src/components/shared`，除非它已经满足跨 feature 稳定复用，并且脱离原 feature 后名称与 props 仍然清晰。

## 7. 迁移公共组件时的最低要求

- 先确认存在真实跨 feature 复用，不做预防性抽象
- 迁移后清理 feature-to-feature 组件依赖
- 保持 props 和交互语义兼容
- 补至少一条受影响链路测试
- 同步更新这份组件库说明和维护手册
