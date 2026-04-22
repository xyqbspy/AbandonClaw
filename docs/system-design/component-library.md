# AbandonClaw 组件库说明

## 1. 这份文档解决什么问题

这份文档用来回答两个维护高频问题：

- 一个组件应该放在 `src/components/*`、`src/features/*/components`，还是页面层？
- 一个组件已经被别的 feature 复用时，什么时候该迁到公共层？

当前仓库已经稳定存在三类组件职责：

- 公共组件：跨页面、跨 feature 复用，职责稳定
- feature 组件：只服务某个学习域，携带明确业务语义
- 页面组装组件：负责路由态、数据拼装、页面级编排

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

## 4. 新增组件时怎么判断

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
