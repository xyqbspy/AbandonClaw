# AbandonClaw 项目维护手册

## 1. 这是什么项目

这是一个面向中文学习者的英语学习系统。它不是单纯的单词卡片应用，而是把学习拆成一条连续闭环：

1. `scenes` 负责分发可进入的学习场景
2. `scene/[slug]` 负责真实语境中的阅读、点选、练习和变体学习
3. `chunks` 负责把表达沉淀成可管理资产
4. `review` 负责把沉淀后的表达重新拉回复习链路
5. `today` 和 `progress` 负责把学习结果聚合成每日入口与长期表现

如果只看一个最重要的产品逻辑，可以把它理解成：

`Today -> Scene -> Chunks -> Review/Progress -> 再回到 Today`

## 2. 代码结构怎么读

### 页面层

- `src/app/(app)/scenes`: 场景列表与进入前预热
- `src/app/(app)/scene/[slug]`: 单个场景的主学习工作台
- `src/app/(app)/chunks`: 表达资产列表、详情、聚类、补全
- `src/app/(app)/review`: 复习页
- `src/app/(app)/today`: 每日入口
- `src/app/(app)/progress`: 学习表现概览
- `src/app/(app)/admin`: 管理后台

### 功能层

- `src/features/scene`: 场景学习视图组件
- `src/features/chunks`: 表达详情、关系、聚类、例句等组件
- `src/features/lesson`: 课文阅读和选中短语详情
- `src/features/today`: 今日页卡片和 selectors
- `src/features/review`: 复习卡片和复习相关展示

### 服务与数据层

- `src/lib/server/scene`: 场景查询、导入、生成、变体
- `src/lib/server/learning`: 学习进度、练习、变体学习聚合
- `src/lib/server/phrases`: 表达保存、补全、相似关系
- `src/lib/server/review`: 复习数据与提交
- `src/lib/server/expression-clusters`: 表达聚类与主表达组织
- `src/lib/cache`: 前端缓存、回填与预取
- `supabase/sql`: 数据库演进脚本

## 3. 项目主逻辑怎么走

### `scenes`

用户在这里选择或进入场景。页面会做首屏列表展示、场景预热和跳转准备。

维护时重点关注：

- 列表刷新与缓存一致性
- 跳转前预热是否仍然成立
- 场景卡片的 loading/entering 反馈

### `scene/[slug]`

这是最核心的学习工作台。用户会在这里阅读句子、点选 chunk、听音频、做练习、看变体、看表达地图，并驱动学习状态同步。

关键文件：

- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- `src/app/(app)/scene/[slug]/use-scene-detail-data.ts`
- `src/app/(app)/scene/[slug]/use-scene-detail-actions.ts`
- `src/app/(app)/scene/[slug]/use-scene-learning-sync.ts`

维护时重点关注：

- 路由 query 与视图状态是否同步
- 详情弹层、练习、变体、表达地图之间是否串联正确
- 学习开始、推进、暂停、完成是否仍然正确上报
- 缓存回填和网络刷新是否出现旧数据覆盖新数据

### `chunks`

这里不是一个简单收藏夹，而是表达资产工作台。用户能查看表达详情、生成相似表达、组织对照表达、维护 expression cluster，并继续进入复习链路。

关键文件：

- `src/app/(app)/chunks/page.tsx`
- `src/app/(app)/chunks/use-chunks-list-data.ts`
- `src/app/(app)/chunks/use-focus-detail-controller.ts`
- `src/features/chunks/components/focus-detail-sheet.tsx`

维护时重点关注：

- 列表筛选、URL 状态与缓存是否一致
- 焦点详情面板和更多操作是否还能闭环
- cluster 相关操作是否会破坏详情态或缓存态
- 手动录入、AI 补全、加入复习之间的链路是否断裂

### `review`

复习页消费已沉淀的表达和场景练习待复习项，负责把“学习过的内容”拉回短时回顾闭环。

维护时重点关注：

- 普通复习与场景内联复习是否共存正常
- 提交结果后缓存和 summary 是否回写
- 失败时是否误清缓存或误切换 UI

### `today` 与 `progress`

这两个页面主要做聚合而不是生产底层内容。

- `today` 回答“今天该做什么”
- `progress` 回答“最近学得怎么样”

维护时重点关注：

- 聚合接口字段变化是否同步更新 selectors
- continue learning、review summary、overview 是否还对得上真实学习状态

## 4. 这个项目当前最重要的工程约定

### 页面尽量保持薄

推荐把复杂逻辑分拆到：

- `selectors` / `logic`: 纯派生逻辑
- `actions`: payload 构造、本地数据结构构造
- `controller`: 动作条件和显示条件判断
- `components`: 视图与交互

### 改动时优先考虑链路，不要只看单点

尤其是下列改动，不能只改一个组件就结束：

- 选中 chunk 的详情展示
- 加入复习/开始复习按钮
- 场景练习或变体流程
- 列表缓存与详情缓存
- 学习进度上报

### 测试策略

- `*.test.ts`: 纯逻辑测试
- `*.test.tsx`: 交互/DOM 测试

常见回归入口：

- `pnpm run test:unit`
- `pnpm run test:interaction`
- 按页面或功能缩小范围运行对应测试文件

## 5. 用 OpenSpec 维护这个已有项目

OpenSpec 已经在仓库初始化完成，核心目录：

- `openspec/config.yaml`
- `openspec/specs/*`
- `.codex/skills/openspec-*`

推荐工作流：

1. 改动前先判断是不是“非微小改动”
2. 如果会影响功能行为、数据流、缓存、测试链路或维护规则，就先建 OpenSpec change
3. 在 proposal/spec/design/tasks 中写清目标、非目标、影响模块、回归点
4. 实现后更新 `CHANGELOG.md`
5. 完成后再归档 change，并把稳定规则沉淀到 `openspec/specs`

详细操作说明见：

- `docs/openspec-workflow.md`

推荐命令：

```bash
openspec list --specs
openspec validate --specs --strict --no-interactive
openspec new change <change-name>
openspec show <item-name>
openspec archive <change-name>
```

如果本机没有全局命令，可直接用本地入口：

```bash
node_modules\\.bin\\openspec.CMD validate --specs --strict --no-interactive
```

## 6. 改动前后检查清单

### 改动前

- 这次变更会不会影响 `today -> scene -> chunks -> review` 闭环
- 是否涉及缓存回填、路由状态、服务端聚合
- 现有测试是否已经覆盖主链路
- 这次改动是否值得先写 OpenSpec change

### 改动后

- 受影响链路的单元测试或交互测试是否已执行
- 空态、失败态、禁用态是否仍然合理
- 文案、按钮、loading 状态是否保持一致
- `CHANGELOG.md` 是否已更新
- 如果已经达到完成状态，是否已满足 OpenSpec archive 前检查条件

## 7. 新维护者推荐阅读顺序

1. `README.md`
2. `docs/project-maintenance-playbook.md`
3. `openspec/config.yaml`
4. `openspec/specs/project-maintenance/spec.md`
5. `src/app/(app)/today/page.tsx`
6. `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
7. `src/app/(app)/chunks/page.tsx`
8. `src/app/(app)/review/page.tsx`
9. `src/lib/server/learning/service.ts`
10. `src/lib/server/phrases/service.ts`

## 8. 当前维护建议

- 优先把新增规则写进 OpenSpec 或 `CHANGELOG.md`，不要只留在聊天记录里
- 新功能先明确它属于 `scene`、`chunks`、`review` 还是聚合层
- 如果一个页面开始同时承担过多职责，就继续按已有模式拆到 `selectors`、`controller`、`components`
- 如果文档出现乱码，直接以 UTF-8 新文档替代，不继续追加到乱码文档上
