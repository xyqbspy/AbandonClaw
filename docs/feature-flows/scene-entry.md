# Scenes 列表与进入链路维护说明

## 1. 目标

这份文档说明 `scenes` 页从“列表加载”到“进入场景”的主要链路，重点覆盖：

- 列表缓存与网络刷新
- 场景进入前预热
- 导入、生成、删除
- 侧滑删除手势
- 顶部任务提示与下拉刷新

对应入口文件：

- [page.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/scenes/page.tsx)
- [use-scenes-page-data.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/scenes/use-scenes-page-data.ts)
- [use-scene-swipe-actions.ts](/d:/WorkCode/AbandonClaw/src/app/(app)/scenes/use-scene-swipe-actions.ts)

## 2. 页面职责分层

### 2.1 `page.tsx`

只负责页面装配：

- 渲染列表卡片
- 连接生成、导入、删除三个弹层
- 把 loading、opening、top task、swipe offset 这些状态翻译成 UI

### 2.2 `useScenesPageData`

负责真正的数据链路：

- 首屏缓存命中与后台网络刷新
- 进入场景前的 route prefetch 与 detail prefetch
- 导入 / 生成 / 删除后的列表失效与重拉
- `topTask` 顶部状态提示
- 下拉刷新事件接入

### 2.3 `useSceneSwipeActions`

负责手势层：

- 左滑展开删除操作
- 保证垂直滚动优先，不误触发横向 swipe
- 点页面其它区域时自动收起已展开项

## 3. 列表加载与缓存

`useScenesPageData` 首屏先读 [scene-list-cache.ts](/d:/WorkCode/AbandonClaw/src/lib/cache/scene-list-cache.ts)：

- 有缓存：直接显示缓存内容，`listDataSource = "cache"`
- 无缓存：进入真正 loading

随后仍会发起网络刷新：

- 成功后覆盖列表，`listDataSource = "network"`
- 成功后写回 scene list cache
- 失败时如果已经有缓存回退，不再打断页面
- 失败时如果连缓存都没有，才 toast 报错

维护约束：

- 不要把“命中缓存”理解成“本轮不再发网络”
- 不要在局部改动里破坏 `preferCache + forceNetwork` 这组刷新语义

## 4. 进入场景前预热

进入链路有两层预热：

1. 路由预热
   - `router.prefetch(href)`
2. 详情数据预热
   - [scene-prefetch.ts](/d:/WorkCode/AbandonClaw/src/lib/cache/scene-prefetch.ts) 的 `prefetchSceneDetail(sceneSlug)`

### 4.1 什么时候触发

- 卡片 hover / focus
- 点击卡片前
- 点击“查看变体”前
- 页面拿到列表后，会对前两个场景做后台预热

### 4.2 点击进入时的节奏

`openSceneRoute()` 会：

- 先标记 `openingSceneTarget`
- 等待“详情预热完成”或“180ms 短暂窗口”两者之一先结束
- 然后再 `router.push(href)`

目的不是强等预热完成，而是给用户一个稳定的“进入中”过渡窗口。

维护约束：

- 不要把这个等待改成必须等待完整预热成功
- 不要移除 `openingSceneTarget`，它决定卡片 overlay loading 和重复点击保护

## 5. 导入、生成、删除链路

### 5.1 导入

入口：

- [scene-import-dialog.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/scenes/scene-import-dialog.tsx)

流程：

- 前端校验输入
- 调 `importSceneFromApi`
- 后端通过 `parseImportedSceneWithCache()` 调用场景解析模型；首次输出不符合 `SceneParserResponse` 时，会用 repair prompt 再修复一次
- `A:/B:/C:` 逐行对话应优先按一行一个 dialogue block 解析；每个 block 最多 2 个 sentence；sentence 必须有 `chunks` 数组，但允许 `chunks: []`
- 成功后 `clearSceneListCache()`
- 再强制网络刷新列表
- 顶部 `topTask` 切成完成态

### 5.2 生成

入口：

- [generate-scene-sheet.tsx](/d:/WorkCode/AbandonClaw/src/components/scenes/generate-scene-sheet.tsx)

流程：

- 生成 sheet 内部负责真正的生成请求
- `onGenerated` 回到 scenes 页后，统一做列表 cache 清理与网络刷新
- 若命中了表达迁移，会额外 toast 说明带入了哪些变体

### 5.3 删除

入口：

- 仅 `imported` 场景支持左滑删除
- 删除动作最终走 `deleteSceneBySlugFromApi`

流程：

- 先进入 `deletingSceneId`
- 成功后本地把卡片做 240ms 收起动画
- 同时清空 scene list cache
- 再后台强制刷新列表

维护约束：

- 删除成功后不能只改本地数组，不清缓存
- 不能跳过“本地动画收起 + 后台重拉”这两段，否则列表反馈会变硬

## 6. 顶部任务提示与下拉刷新

`topTask` 是 scenes 页对“正在刷新 / 正在导入 / 正在生成 / 失败结果”的统一反馈。

来源：

- 手动导入
- 生成成功后的列表刷新
- 下拉刷新

下拉刷新通过全局 `app:pull-refresh` 事件接入：

- 只处理 pathname 为 `/scenes`
- 先清列表缓存
- 再强制网络刷新

维护约束：

- 不要让 `topTask` 和 toast 互相取代，它们承担的反馈层级不同
- 如果调整 pull refresh 行为，要确认别的页面 pathname 不会误命中 scenes 逻辑

## 7. 侧滑删除手势

`useSceneSwipeActions` 的核心规则：

- 横向位移明显大于纵向位移时，才锁定为 swipe
- 向右回弹和向左超出删除区都会被限幅
- 展开阈值与快速展开阈值不同
- 打开一个 swipe 行时会自动关闭其它已展开行

维护约束：

- 这个 hook 只处理手势和偏移，不负责真正删除
- 不要把删除逻辑塞回手势 hook

## 8. 建议回归

每次改 `scenes` 页，至少检查：

- [page.interaction.test.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/scenes/page.interaction.test.tsx)
- [scene-prefetch.test.ts](/d:/WorkCode/AbandonClaw/src/lib/cache/scene-prefetch.test.ts)

重点关注：

- 首屏缓存命中后仍继续网络刷新
- 进入卡片时会显示进入中 overlay
- 前两个场景的后台预热仍存在
- 导入 / 生成 / 删除后会清缓存并重拉
- 左滑删除和二次确认链路不回退
