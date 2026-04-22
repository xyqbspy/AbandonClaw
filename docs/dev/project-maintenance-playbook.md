# AbandonClaw 项目维护手册

## 0. 快速入口

这份手册是深读材料，不是每次改动的默认必读全文。

| 当前任务 | 默认阅读 | 继续深读条件 |
| --- | --- | --- |
| Fast Track | `AGENTS.md`、相关文件、最小测试上下文 | 暴露主链路、状态流、数据流、缓存、权限或稳定规则风险 |
| Cleanup / Removal | 删除对象、引用方、影响范围 | 删除会改变用户行为或跨模块契约 |
| Spec-Driven | `docs/README.md` 定位后，再读本手册相关章节 | 进入 proposal / implementation / archive |
| 完成态收尾 | 本手册第 6、9、10、11 节 | 需要同步 stable spec、archive、dev-log 或 CHANGELOG |

优先记住这条最小路径：

1. 先用 `docs/dev/change-intake-template.md` 填最小块。
2. 涉及产品能力、页面主流程、学习体验或优先级判断时，先用产品北极星过滤：是否服务于“让每一次场景学习，都沉淀为用户在未来真实场景中能回忆、能使用、能迁移的表达资产”。
3. 小改动只跑最小相关测试和必要文档同步。
4. 非微小改动再回到本手册深读。
5. 收尾前运行 `pnpm run maintenance:check`。

深读触发条件：

- 改动影响推荐逻辑、状态流转、回写、Session 恢复或 Scene 完成判定。
- 改动影响 API、数据模型、权限、缓存、测试链路或维护规范。
- 处理中发现旧规则漂移、重复语义、缺失文档、缺失测试或边界不清。
- 准备做 Spec-Driven 完成态提交、stable spec 同步或 archive。

### 文档同步红线

较大改动不得把 `docs/` 同步留给用户事后补。

当本轮改动满足任一条件时，必须同轮检查并同步受影响的已有文档：

- 改变用户可见能力、跨页面 UI 一致性、主链路、状态流或数据流。
- 改变 API、数据模型、权限、缓存、测试链路或维护流程。
- 改变模块边界、组件职责、公共组件使用方式或页面结构认知。
- 删除旧入口、旧脚本、旧状态、旧文档口径或旧兼容语义。

执行方式：

1. 先用 `docs/README.md` 定位 feature-map、feature-flows、domain-rules、system-design、dev 或 meta 的落点。
2. 优先更新已有文档，不新增重复语义文档。
3. 如果检查后确认文档不受影响，在最终说明中明确“已检查，无需更新”的依据。
4. 如果发现文档已经过期，本轮必须做最小必要同步；不能只写 CHANGELOG，也不能留给用户另起任务手动补。

### 从 AGENTS 迁出的执行细则

`AGENTS.md` 现在只保留强约束。以下细节以后优先在本手册或 `openspec/specs/project-maintenance/spec.md` 维护：

- Fast Track / Cleanup 的最小收尾口径。
- Spec-Driven 的 proposal、implementation、archive 执行清单。
- 测试失败分析流程。
- 文档分类、stable spec 同步和 dev-log / CHANGELOG 分工。
- 上下文预算和完成态 Review 清单。

如果要新增维护规则，先判断它是“强制红线”还是“执行细节”：

- 强制红线才进入 `AGENTS.md`。
- 执行细节进入本手册。
- 长期稳定契约进入 `openspec/specs/project-maintenance/spec.md`。

## 1. 项目是什么

这是一个面向中文学习者的英语学习系统。它不是单纯的单词卡片应用，而是把学习拆成一条连续闭环：

1. `today` 聚合今天该继续什么、该复习什么
2. `scenes` 提供可进入的学习场景
3. `scene/[slug]` 承担主学习流程：听、看、点选、练习、变体
4. `chunks` 负责表达沉淀、整理、聚类和详情维护
5. `review` 负责把沉淀后的内容拉回回忆链路
6. `progress` 负责展示长期学习表现

如果只记一条主路径，可以理解成：

`Today -> Scene -> Chunks -> Review/Progress -> 回到 Today`

当前稳定的用户可见场景学习步骤是：

`听熟这段 -> 看重点表达 -> 开始练习 -> 解锁变体`

说明：
- 旧的“练核心句”步骤已经并入“开始练习”
- `practice_sentence` / `sentence_practice` 仍可能作为兼容状态存在
- 用户侧不应再被要求执行独立的“练核心句”前置步骤

## 2. 代码结构怎么读

### 页面层

- `src/app/(app)/today`: 今日入口
- `src/app/(app)/scenes`: 场景列表与进入前预热
- `src/app/(app)/scene/[slug]`: 单个场景的主学习工作台
- `src/app/(app)/chunks`: 表达资产列表、详情、聚类与补全
- `src/app/(app)/review`: 复习页
- `src/app/(app)/progress`: 学习概览
- `src/app/(app)/admin`: 管理后台

### 功能层

- `src/features/scene`: 场景学习视图组件
- `src/features/lesson`: 原文阅读与选中详情
- `src/features/chunks`: 表达详情、关系、聚类、例句等组件
- `src/features/today`: 今日卡片与 selectors
- `src/features/review`: 复习卡片与复习展示

### 公共组件层

- `src/components/ui`: 最基础的 UI primitives
- `src/components/shared`: 跨 feature 复用的稳定公共组件
- `src/components/audio`: 音频动作类公共组件

组件归属与迁移边界优先参考：

- `docs/system-design/component-library.md`
- `docs/system-design/ui-style-guidelines.md`
- `docs/feature-map/README.md`
- `docs/feature-flows/README.md`

### 服务与数据层

- `src/lib/server/scene`: 场景查询、导入、生成、变体
- `src/lib/server/learning`: 学习进度、练习、变体学习聚合
- `src/lib/server/phrases`: 表达保存、补全、关系
- `src/lib/server/review`: 复习数据与提交
- `src/lib/server/expression-clusters`: 表达聚类与主表达组织
- `src/lib/server/tts` + `src/lib/utils/tts-api`: 音频生成、缓存、预热与播放链路
- `src/lib/cache`: 前端缓存、回填与预取
- `supabase/sql`: 数据库演进脚本

## 3. 关键模块维护重点

### `scenes`

这里负责用户选择场景并进入学习。维护时重点关注：

- 列表刷新和缓存是否一致
- 进入前预热是否仍然成立
- 场景卡片的 loading / entering 反馈是否稳定
- 如果页面开始同时承接列表数据、预热、滑动删除和多个弹层，优先把这些职责拆到 data hook、swipe controller 和局部 dialog，不要先抽 scene card

专项说明参考：

- `docs/feature-flows/scene-entry.md`

### `scene/[slug]`

这里是主学习工作台。用户会在这里阅读句子、点选 chunk、听音频、做练习、看变体、看表达地图，并驱动学习状态同步。

关键文件：

- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- `src/app/(app)/scene/[slug]/use-scene-detail-data.ts`
- `src/app/(app)/scene/[slug]/use-scene-detail-actions.ts`
- `src/app/(app)/scene/[slug]/use-scene-learning-sync.ts`

维护时重点关注：

- 路由 query 与视图状态是否同步
- 详情弹层、练习、变体、表达地图之间是否仍然串联正确
- 学习开始、推进、暂停、完成是否仍然正确上报
- 缓存回填和网络刷新是否出现旧数据覆盖新数据
- 用户可见步骤是否仍与当前稳定链路一致

练习题生成、题型分层与“为什么填空 / 半句数量偏少”的专项说明参考：

- `docs/system-design/scene-practice-generation.md`

### `chunks`

这里不是简单收藏夹，而是表达资产工作台。用户可以查看表达详情、生成相似表达、组织对照表达、维护 expression cluster，并继续进入复习链路。

关键文件：

- `src/app/(app)/chunks/page.tsx`
- `src/app/(app)/chunks/use-chunks-list-data.ts`
- `src/app/(app)/chunks/use-focus-detail-controller.ts`
- `src/features/chunks/components/focus-detail-sheet.tsx`

维护时重点关注：

- 列表筛选、URL 状态和缓存是否一致
- 焦点详情与更多动作是否还能闭环
- cluster 相关操作是否破坏详情态或缓存态
- 手动录入、AI 补全、加入复习之间的链路是否断裂

保存、relation、cluster 与 review 契约参考：

- `docs/system-design/chunks-data-mapping.md`

详情浮层与表达地图的页面职责参考：

- `docs/system-design/chunks-focus-detail-map.md`

### 音频 / TTS

音频不是单点能力，而是跨服务端生成、Storage、浏览器缓存、预热调度和页面播放的一整条链路。

优先参考：

- `docs/system-design/audio-tts-pipeline.md`

维护时重点关注：

- audio key 是否仍稳定，是否会误打破 chunk / sentence / scene full 复用
- 预热触发点是否重复或过重
- 缓存清理、重生成与播放 fallback 是否仍然闭环
- 弱网下 scene full 预热是否仍然被正确抑制

### `review`

这里消费已沉淀表达与场景练习待复习项，负责把“学过的内容”拉回回忆闭环。

维护时重点关注：

- 普通复习与场景内联复习是否共存正常
- 提交结果后缓存与 summary 是否回写
- 失败态是否误清缓存或误切 UI
- 阶段推进重置要跟“队列真正换项或刷新完成”绑定，不要再用依赖 `active task key` 的 effect 直接回压页面阶段，否则很容易把 `微回忆 -> 熟悉度 -> 改写 -> 输出 -> feedback` 链路打回 `recall`

### `today` 与 `progress`

这两页主要做聚合，不负责生产底层内容。

- `today` 回答“今天该做什么”
- `progress` 回答“最近学得怎么样”

维护时重点关注：

- 聚合接口字段变化是否同步到 selectors
- continue learning、review summary、overview 是否仍对得上真实学习状态

`progress` 学习概览字段映射与失败降级参考：

- `docs/system-design/learning-overview-mapping.md`

## 4. 当前工程约定

### 页面尽量保持薄

复杂逻辑优先拆到：

- `selectors` / `logic`: 纯派生逻辑
- `actions`: payload 构造、本地数据结构整理
- `controller`: 动作条件与展示条件
- `components`: 视图与交互

如果页面或 feature 容器已经明显过重，先做内部拆分，不要急着抽成公共组件。当前优先观察的重文件是：

- `src/app/(app)/chunks/page.tsx`
- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- `src/features/lesson/components/lesson-reader.tsx`

第一轮拆分建议优先挑这些块：

- 局部 sheet / panel 装配
- 浮层入口或局部步骤视图
- 音频、保存、删除这类成组动作 controller
- 纯派生逻辑与状态映射

如果拆出的模块仍然强依赖当前 feature 的状态模型，就继续留在 feature 内；不要因为“拆出来了”就直接升级成 shared。

对于 `review/page.tsx` 和 `scenes/page.tsx` 这类高状态密度页面，第一轮拆分建议固定遵循：

- `review`：先拆数据加载 / 刷新控制，再拆主内容区；阶段状态继续保留在页面单一来源，只有在队列换项时才显式重置
- `scenes`：先拆列表数据与进入前预热、滑动删除控制、导入/删除弹层装配；不要为了减行数先抽单张卡片

对于 `chunks/page.tsx` 和 `lesson-reader.tsx` 这类已经做过一轮减重的入口，第二轮继续拆分时优先遵循：

- `chunks/page`：先拆页面动作域，再拆多 sheet / panel 装配；优先把 review 启动、focus detail 删除回退、expression map 打开、quick add related 这类成组动作收进本地 action hook，不要把同一条副作用链路拆散到多个零碎回调
- `chunks/page`：局部装配优先抽 `sheet / detail / map` 这一层，不要为了减行数先把列表卡片继续撕碎；入口页面仍保留路由态、筛选态和最终组装职责
- `lesson-reader`：先拆 selection / active sentence-chunk / training bridge 这类控制链路，再拆 dialogue / mobile 分支 section；不要反过来只拆 JSX，导致真正的状态控制还留在主文件
- `lesson-reader`：训练态切句、移动端句子点击、桌面划词工具栏这三条链路必须继续由入口级交互测试保护，局部 section 测试不能替代它们

### 组件分层要避免横向耦合

- 不要长期保留 feature A 直接依赖 feature B 组件
- 已被多个 feature 直接复用的组件，应迁到 `src/components/*`
- 只有真实跨域复用且 props 语义稳定，才适合进入公共层
- 如果组件强依赖某个 feature 的状态模型，就继续留在 feature 内
- 当文件过重但仍属于单一 feature 时，优先做 feature 内部拆分，而不是提前公共化
- 不确定时先看 `docs/system-design/component-library.md`，再决定是否抽公共

### 新增 UI 要先看统一风格入口

- 新增页面、主要功能入口或跨页面 UI 调整前，先看 `docs/system-design/ui-style-guidelines.md`
- 先判断页面角色、首要动作、保存类动作、危险动作和图标动作，再决定按钮层级
- 不为单个页面临时创造新主色、特殊边框或一次性按钮底色
- 不把强业务容器直接抽到公共层，只因为它和别处“长得像”
- 若改动会新增公共组件、改变跨页面按钮层级或引入新的页面布局范式，先走 OpenSpec

### 改动时优先看链路，不只看单点

尤其是下面这些改动，不能只改一个组件就结束：

- 选中 chunk 的详情展示
- 加入复习 / 开始复习按钮
- 场景练习或变体流程
- 列表缓存与详情缓存
- 学习进度上报
- continue learning / 今日学习路径文案

如果这次改动涉及重组件拆分，还要额外确认：

- 拆出的 hook / logic / subcomponent 是否仍然完整承接原来的副作用链路
- 页面层是否只减少了体积，没有把状态判断分散到更多地方
- 回归测试是否覆盖“原入口还能照常打开 / 提交 / 关闭 / 跳转”
- 如果是 `review` 页面，还要确认阶段推进测试覆盖 `微回忆 -> 熟悉度 -> 改写 -> 输出 -> feedback` 全链路，而不是只测首尾两步
- 如果是 `scenes` 页面，还要确认页面级回归仍覆盖缓存回填、后台刷新、进入预热、侧滑删除和导入/删除弹层

### 文档与编码

- 新增或重写文档统一使用 UTF-8
- 如果旧文档出现乱码，优先重写成干净版本，不继续在乱码文件上叠加

## 5. 测试策略

- `*.test.ts`: 纯逻辑测试
- `*.test.tsx`: 交互 / DOM 测试

常用命令：

```bash
pnpm run test:unit
pnpm run test:interaction
pnpm run test:interaction:scene-detail
pnpm run spec:validate
```

维护时至少要回答三件事：

- 哪些已有测试会直接受影响
- 这次是否需要补新的回归测试
- 如果暂时不补，剩余风险是什么

## 6. 用 OpenSpec 维护已有项目

仓库中的 OpenSpec 入口：

- `openspec/config.yaml`
- `openspec/specs/*`
- `openspec/changes/*`
- `.codex/skills/openspec-*`

推荐流程：

1. 先判断这次是不是非微小改动
2. 如果会影响功能行为、用户能力、主链路、状态流、数据流、缓存、测试链路、维护规范、跨页面一致性、详情组件结构边界、权限、安全策略或外部契约，先建 OpenSpec change
3. 在正式实施前先做一次“稳定性收口检查”：确认这次需求是否同时暴露旧规则漂移、重复语义、缺失测试、缺失文档或边界不清
4. 在 `proposal.md`、`design.md`、`tasks.md`、delta spec 中写清目标、非目标、影响范围、回归点，以及“本轮顺手收口项 / 明确不收项”
5. 实施时优先把同一链路里的最小必要收口一次性补齐，不把已经识别的稳定性缺口留到后续零散修补
6. 若只是开发中的中间提交，可先提交当前进度，但不得表述为“已完成”
7. 若准备做“完成态提交 / 收尾提交”，必须先更新 `docs/dev/dev-log.md`，记录验证结果、剩余风险以及本轮明确延后的不稳定点
8. 在完成态提交前，先把稳定规则沉淀进 `openspec/specs/*`，再完成 archive
9. 如本次完成态收尾结果将直接进入 `main` 且存在用户可感知变化，必须同步更新根目录 `CHANGELOG.md`

补充判断：

- 如果这次改动明确属于 Fast Track / Cleanup，且只是局部 UI、样式、文案、局部测试或不改变业务语义的小修复，则不要默认套用上面第 7-9 条的“大收尾”流程
- 这类小改动的收尾标准通常是：代码改对、最小相关测试通过、必要文档做最小同步，然后直接提交
- 只有当这类改动同时被提升为规范变更、发布收尾、跨模块稳定契约调整，或用户明确要求按“完成态提交 / 收尾提交”处理时，才进入完整收尾

常用命令：

```bash
pnpm run spec:list
pnpm run spec:validate
node_modules\.bin\openspec.CMD new change <change-name>
node_modules\.bin\openspec.CMD change validate <change-name> --strict --no-interactive
node_modules\.bin\openspec.CMD archive <change-name>
```

相关文档：

- `openspec/specs/project-maintenance/spec.md`
- `docs/dev/openspec-workflow.md`
- `docs/dev/change-intake-template.md`

如果只想记这一段的最小入口顺序：

1. 先看 `docs/README.md`
2. 再看 `docs/dev/project-maintenance-playbook.md`
3. 需要确认长期稳定约束时看 `openspec/specs/project-maintenance/spec.md`
4. 进入 Spec-Driven 后再看 `docs/dev/openspec-workflow.md`

## 7. 改动前后检查清单

### 改动前

- 先看完整功能链路，不按局部惯性直接下手
- 涉及产品能力、页面主流程、学习体验或优先级判断时，先确认需求是否服务产品北极星；若只是增加入口或堆功能，必须说明它如何推进表达资产沉淀，并提高表达在未来被回忆、使用或迁移的概率
- 确认这次改动是否会影响 `today -> scene -> chunks -> review`
- 确认是否涉及缓存回填、路由状态、服务端聚合
- 确认是否已经进入非微小改动范围，需不需要先建 OpenSpec change
- 确认这次需求是否暴露重复语义、边界漂移、缺失文档、缺失测试或旧兼容语义未收口
- 若发现稳定性缺口，明确哪些必须本轮一并收口，哪些暂不处理，以及暂不处理的理由
- 如果只改一处局部，链路会不会在别处断掉
- 现有测试是否已经覆盖主链路

如果是 detail 体系收敛或跨模块复用调整，可额外参考：

- `openspec/specs/detail-composition-boundaries/spec.md`
- `openspec/changes/archive/2026-04-17-consolidate-detail-composition/implementation-intake-template.md`

归档模板只作为实施前检查参考；新的结构性改动仍应按当前需求重新建立 OpenSpec change。

### 改动后

- 受影响的 unit / interaction 测试是否已执行
- 已有测试是否需要同步更新
- 是否需要补新的回归测试
- 空态、失败态、禁用态是否仍然合理
- 文案、按钮、loading 状态是否保持一致
- 本轮识别出的稳定性缺口是否已经完成最小必要收口
- 若仍保留未收口项，是否已明确记录原因、风险与后续入口
- `docs/dev/dev-log.md` 是否已补验证结果与剩余风险
- 若本次完成态收尾结果已进入或将直接进入 `main`，且存在用户可感知变化，根目录 `CHANGELOG.md` 是否已更新
- 是否仍存在未覆盖风险，并且已明确记录
- 如果 change 已完成，是否满足 OpenSpec archive 前检查条件

## 8. 新维护者推荐阅读顺序

1. `README.md`
2. `docs/README.md`
3. `docs/feature-map/README.md`
4. 对应 `docs/feature-flows/*` 与 `docs/domain-rules/*`
5. `docs/dev/project-maintenance-playbook.md`
6. `openspec/specs/project-maintenance/spec.md`
7. `openspec/specs/learning-loop-overview/spec.md`
8. 若当前问题已有明确 capability，再补读对应 `openspec/specs/*`
9. `src/app/(app)/today/page.tsx`
10. `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
11. `src/app/(app)/chunks/page.tsx`
12. `src/app/(app)/review/page.tsx`
13. `src/lib/server/learning/service.ts`
14. `src/lib/server/phrases/service.ts`

## 9. 当前维护建议

- 新规则优先写进 OpenSpec、稳定文档或 `docs/dev/dev-log.md`，不要只留在聊天记录里
- 新功能先明确它属于 `scene`、`chunks`、`review` 还是聚合层
- 如果一个页面开始同时承担过多职责，继续按既有模式拆到 `selectors`、`controller`、`components`
- 如果文档再次出现乱码，直接以 UTF-8 新文档替代

## 10. Spec-Driven 完成态实现 Review

当一项 Spec-Driven Change 准备作为“完成态提交 / 收尾提交”时，提交前必须先做一次实现 Review。

Review 检查项：

- 实现是否与 proposal / tasks / spec delta 一致
- tasks 是否已更新为真实完成状态
- 最小相关测试是否已执行，或未执行原因是否已记录
- feature-flow / domain-rules / system-design / dev 文档是否已按影响范围同步
- stable spec、archive 与必要的 CHANGELOG 状态是否已完成或明确说明不适用
- 已识别但本轮不收的事项、剩余风险与后续入口是否已记录

Fast Track / Cleanup 不默认套用完整实现 Review；只按改动规模完成最小检查即可。

## 11. 上下文预算执行清单

开始处理需求前，先按任务规模控制上下文：

- Fast Track：只读 `AGENTS.md`、相关文件、必要索引和最小测试上下文
- Cleanup：补读删除对象的入口、引用方和影响范围
- Spec-Driven：先用 `docs/README.md` 定位，再读相关 feature-flow、domain-rules、stable spec、system-design 和代码
- 历史 archive、旧 proposal、dev-log 只用于确认历史背景，不得替代当前 stable spec
- 如果局部改动暴露主链路、状态流、数据流、缓存、权限或稳定规则风险，先补读对应上下文，再重新判断任务类型

完成态 Review 时额外检查：

- 本轮关键依据是否来自当前稳定规则、维护文档、相关链路文档和实际代码
- 是否误把历史 archive、旧 proposal 或 dev-log 当成当前规则
- 是否读取了明显无关模块，导致实现判断被噪音污染
- 是否有刻意未读的相关上下文；如果有，原因、风险和后续入口是否已记录
## 12. 交互事件提交前审查

涉及拖拽、滑动、下拉刷新、悬浮按钮、pointer 或 touch 事件时，提交前额外检查：

- `releasePointerCapture` 前是否确认当前元素仍持有该 pointer capture
- 是否只吞掉已知浏览器竞态错误，例如 `NotFoundError`，而不是吞掉所有异常
- `preventDefault()` 前是否确认事件可取消，特别是 `touchmove` / `wheel` 这类可能被浏览器接管滚动的事件
- 是否跑过对应 interaction / regression 测试；如果只跑 `build`，必须说明它无法覆盖真实浏览器手势竞态
