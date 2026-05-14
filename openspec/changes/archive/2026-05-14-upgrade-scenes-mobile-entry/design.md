# 设计说明：upgrade-scenes-mobile-entry

## 总体方案

本轮不改 `/api/scenes` 合约，不新增后端推荐接口，优先复用现有列表数据和现有 continue-learning 语义，在 `/scenes` 页面内新增一层纯前端 selector / display 逻辑，把 P0 元字段组织成适合移动端学习入口的结构。

核心原则：

- 保留现有 `useScenesPageData` 的数据加载、缓存预热、导入 / 生成 / 删除 / 进入场景逻辑。
- 把新的排序、筛选、pack 组合、状态映射、底部 CTA 计算从页面 JSX 中拆出去，保持页面组件只负责装配。
- 如需“继续学习 / 复习表达”主 CTA，优先复用现有 `today-page-selectors` 的 continue-learning 语义或兼容其 fallback，不重新定义一套学习状态。

## 数据来源

### scenes 列表

继续使用 `getScenesFromApi()` / `/api/scenes` 的现有返回结构，重点消费：

- `title`
- `subtitle`
- `description` 等现有摘要字段
- `level`
- `category`
- `sourceType`
- `isStarter`
- `isFeatured`
- `sortOrder`
- `estimatedMinutes`
- `learningGoal`
- `learningStatus`
- `progressPercent`
- `lastViewedAt`

### continue learning / review 信号

优先级如下：

1. 若低成本可复用现有 learning dashboard，则用 dashboard + scene list 解析主 CTA。
2. 若本轮接入 dashboard 成本过高，则使用现有 scene list 字段优雅降级：
   - `learningStatus === in_progress / paused` 作为“继续学习”
   - `learningStatus === completed` 或高进度场景作为复习候选
   - 没有进度时回退到 starter 首场景

本轮不新增新的服务端聚合字段。

## 页面结构

### 顶部导航

- 吸顶
- `white/80 + backdrop blur`
- 标题为“学习场景”
- 右侧保留搜索入口和次级操作入口
- 图标热区至少 `44x44`

### 推荐路径区

- 移动端为横向 `overflow-x-auto + snap-x + snap-mandatory`
- 桌面端可自然扩展为 2-4 列
- 每个 pack 使用真实 scenes 数据组合
- Start Here 使用高强调视觉

pack 组合规则：

- `Start Here`: `isStarter === true && category === "starter"`
- `Everyday Survival`: `category === "daily_life"`
- `Time and Plans`: `category === "time_plan"`
- `Simple Social`: `category === "social"`

每个 pack 卡片展示：

- pack 标题与说明
- 场景数量
- 完成数量
- 首个未完成场景的 CTA

### 筛选区

- 粘性定位在顶栏下方
- 分类使用横向 pill
- level / source / sort 使用简洁控件
- 筛选结果即时更新

### 场景列表

- 使用纵向大圆角卡片
- 每张卡片展示：
  - 英文标题
  - 中文标题或摘要
  - level 中文标签
  - estimated minutes
  - learning goal 或摘要
  - 状态标签
  - 可选进度条
  - 卡片 CTA

### 底部主 CTA

固定在底部安全区上方，优先顺序：

1. 有继续学习场景：`继续 {title}`
2. 新用户有 starter 场景：`开始第一个场景`
3. 有可复习内容：`复习表达`
4. 否则：`浏览推荐场景`

生成 / 导入改为次级入口，放在页面右上角操作区、次级按钮区或底部小按钮，不再作为主 CTA。

## 新增 selector / utility

建议新增纯函数文件，例如 `scene-display.ts`：

- `normalizeSceneLevel(level)`
- `getSceneLevelLabel(level)`
- `getSceneCategoryLabel(category)`
- `getSceneSourceLabel(sourceType)`
- `sortScenesByRecommendation(scenes)`
- `filterScenes(scenes, filters)`
- `groupScenesIntoStarterPacks(scenes)`
- `getSceneStatus(scene)`
- `getPrimarySceneAction({ scenes, dashboard? })`

这些函数负责：

- 兼容缺失字段
- 做推荐排序
- 组合 starter packs
- 生成筛选选项和中文标签
- 生成卡片 CTA / 底部 CTA 文案

## 兼容与降级

- `level` 缺失：显示“未分级”或隐藏
- `estimatedMinutes` 缺失：不显示时长
- `category` 缺失：归入“其他”
- `sourceType` 缺失：按 `builtin` 或 `unknown` 降级
- `progressPercent` / `learningStatus` 缺失：按未开始处理
- `isStarter` / `isFeatured` 缺失：按 `false`
- 无符合条件筛选结果：显示空态并提供清除筛选

## 复用与边界

本轮优先复用：

- `useScenesPageData` 的加载 / 进入 / 刷新 / 导入 / 生成 / 删除逻辑
- `openSceneRoute()` 的进入前预热与 overlay
- `today-page-selectors` 中 continue-learning 的既有语义
- 现有 review pack 播放能力，但会调整其视觉层级，避免压过主学习入口

本轮不修改：

- scene detail 学习状态推进
- review / chunks / TTS 主逻辑
- `/api/scenes` 后端推荐语义

## 本轮收口的稳定性问题

- 为 scenes 页面补 selector 层，避免页面 JSX 继续堆积业务规则。
- 对齐 `today` 与 `scenes` 的 continue-learning fallback 语义，避免双份定义。
- 把“生成 / 导入是主 CTA”的旧层级收回到次级操作。

## 延后项

- 跨页面统一推荐编排
- 真正的全文搜索 / 远程搜索
- 桌面端专属重排
- review pack 信息架构重做

延后风险继续记录于：

- 本 change 的 `tasks.md`
- 实施阶段 `docs/dev/dev-log.md`
