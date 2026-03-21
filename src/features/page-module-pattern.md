# 页面模块约定

这个项目当前已经形成了一套比较稳定的页面拆分方式，后面新增或重构页面时，优先按这个模式来。

## 目标

- `page.tsx` 只做页面编排
- 纯派生逻辑放到 selector / helper
- 文案集中在 labels
- 动作判断集中在 controller
- 复杂视图拆成独立组件
- 关键纯逻辑和关键视图补轻量测试

## 推荐分层

### 1. `page.tsx`

负责：

- 路由参数
- 本地 state
- API 调用
- 组合 selector / controller / components

避免：

- 大段 JSX 分支
- 重复文案对象
- 大段内联派生逻辑
- 到处散落的动作判断

### 2. `*-selectors.ts`

适合放：

- 视图模型拼装
- 列表筛选 / 排序 / 去重
- fallback 规则
- session / cache / queue 合并

要求：

- 尽量纯函数
- 输入输出明确
- 不依赖 React hooks

测试文件：

- `*-selectors.test.ts`

### 3. `*-labels.ts`

适合放：

- 一个页面或一个视图模块的文案映射
- 页面文案到组件 props 的对照

适合在这些场景使用：

- 某个视图组件 props 文案很多
- 后面会继续改文案或多处复用

测试文件：

- `*-labels.test.ts`

### 4. `*-actions.ts`

适合放：

- 构造提交 payload
- 构造本地 set / session / cache 数据
- 生成稳定对象结构

要求：

- 不直接依赖 React state
- 优先纯函数

测试文件：

- `*-actions.test.ts`

### 5. `*-controller.ts`

适合放：

- 按钮意图判断
- 删除后的回退逻辑
- 显隐 / 禁用规则
- 缓存是否复用

要求：

- 只收“判断逻辑”
- 不把整个页面塞进去

测试文件：

- `*-controller.test.ts`

### 6. `components/*.tsx`

适合放：

- 单个 view-mode
- 详情弹框
- 列表区块
- 操作区

要求：

- 组件只关心展示和事件回调
- 不在组件里再塞大段业务推导

### 7. 轻量组件测试

如果不想引新测试库，优先用：

- `react-dom/server` 的 `renderToStaticMarkup`

适合测：

- 空态
- 关键文案
- 关键按钮是否出现

不适合测：

- 复杂交互事件
- 动画
- 浏览器行为

## 当前可参考的页面

### `chunks`

参考：

- `focus-detail-selectors.ts`
- `focus-detail-labels.ts`
- `expression-map-selectors.ts`
- `expression-clusters/ui-logic.ts`

### `scene/[slug]`

参考：

- `scene-detail-logic.ts`
- `scene-detail-actions.ts`
- `scene-detail-controller.ts`
- `scene-view-labels.ts`
- `scene-practice-view.tsx`
- `scene-variants-view.tsx`
- `scene-expression-map-view.tsx`

### `today`

参考：

- `today-page-selectors.ts`

### `review`

参考：

- `review-page-selectors.ts`

## 落地顺序

重构一个大页面时，优先顺序建议是：

1. 先抽最重的视图组件
2. 再抽 selector
3. 再抽 labels
4. 再抽 actions / controller
5. 最后补测试

## 判断标准

如果一个逻辑满足下面任意两条，就值得抽出去：

- 超过 20 行
- 在页面里读起来打断主流程
- 有明确输入输出
- 后面大概率会复用
- 很容易回归
- 值得单独测试
