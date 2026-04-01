# AbandonClaw 项目维护手册

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

### 音频 / TTS

音频不是单点能力，而是跨服务端生成、Storage、浏览器缓存、预热调度和页面播放的一整条链路。

优先参考：

- `docs/audio-tts-pipeline.md`

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

### `today` 与 `progress`

这两页主要做聚合，不负责生产底层内容。

- `today` 回答“今天该做什么”
- `progress` 回答“最近学得怎么样”

维护时重点关注：

- 聚合接口字段变化是否同步到 selectors
- continue learning、review summary、overview 是否仍对得上真实学习状态

## 4. 当前工程约定

### 页面尽量保持薄

复杂逻辑优先拆到：

- `selectors` / `logic`: 纯派生逻辑
- `actions`: payload 构造、本地数据结构整理
- `controller`: 动作条件与展示条件
- `components`: 视图与交互

### 改动时优先看链路，不只看单点

尤其是下面这些改动，不能只改一个组件就结束：

- 选中 chunk 的详情展示
- 加入复习 / 开始复习按钮
- 场景练习或变体流程
- 列表缓存与详情缓存
- 学习进度上报
- continue learning / 今日学习路径文案

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
2. 如果会影响功能行为、数据流、缓存、测试链路、跨页面一致性或维护规范，先建 OpenSpec change
3. 在 `proposal.md`、`design.md`、`tasks.md`、delta spec 中写清目标、非目标、影响范围、回归点
4. 实现后更新根目录 `CHANGELOG.md`
5. 完成后再决定是否 archive，并把稳定规则沉淀进 `openspec/specs/*`

常用命令：

```bash
pnpm run spec:list
pnpm run spec:validate
node_modules\.bin\openspec.CMD new change <change-name>
node_modules\.bin\openspec.CMD change validate <change-name> --strict --no-interactive
node_modules\.bin\openspec.CMD archive <change-name>
```

相关文档：

- `docs/openspec-workflow.md`
- `docs/change-intake-template.md`

## 7. 改动前后检查清单

### 改动前

- 先看完整功能链路，不按局部惯性直接下手
- 确认这次改动是否会影响 `today -> scene -> chunks -> review`
- 确认是否涉及缓存回填、路由状态、服务端聚合
- 如果只改一处局部，链路会不会在别处断掉
- 现有测试是否已经覆盖主链路
- 这次是否值得先写 OpenSpec change

如果是 detail 体系收敛或跨模块复用调整，可额外参考：

- `openspec/changes/consolidate-detail-composition/implementation-intake-template.md`

### 改动后

- 受影响的 unit / interaction 测试是否已执行
- 已有测试是否需要同步更新
- 是否需要补新的回归测试
- 空态、失败态、禁用态是否仍然合理
- 文案、按钮、loading 状态是否保持一致
- 根目录 `CHANGELOG.md` 是否已更新
- 是否仍存在未覆盖风险，并且已明确记录
- 如果 change 已完成，是否满足 OpenSpec archive 前检查条件

## 8. 新维护者推荐阅读顺序

1. `README.md`
2. `docs/project-maintenance-playbook.md`
3. `openspec/config.yaml`
4. `openspec/specs/project-maintenance/spec.md`
5. `openspec/specs/learning-loop-overview/spec.md`
6. `src/app/(app)/today/page.tsx`
7. `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
8. `src/app/(app)/chunks/page.tsx`
9. `src/app/(app)/review/page.tsx`
10. `src/lib/server/learning/service.ts`
11. `src/lib/server/phrases/service.ts`

## 9. 当前维护建议

- 新规则优先写进 OpenSpec 或 `CHANGELOG.md`，不要只留在聊天记录里
- 新功能先明确它属于 `scene`、`chunks`、`review` 还是聚合层
- 如果一个页面开始同时承担过多职责，继续按既有模式拆到 `selectors`、`controller`、`components`
- 如果文档再次出现乱码，直接以 UTF-8 新文档替代
