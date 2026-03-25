# Testing Guide

这份文档定义当前仓库的测试分层、命名规则、补测标准和最小验证流程。

目前项目把测试分成两层：

- `单元测试`
- `交互测试`

两层都要能独立跑，也要能组合跑通。

## 1. 命令约定

```bash
pnpm test
pnpm run test:unit
pnpm run test:interaction
pnpm run test:all
pnpm run build
pnpm run lint
```

说明：

- `pnpm test`
  - 默认只跑单元测试
  - 等价于 `pnpm run test:unit`
- `pnpm run test:unit`
  - 跑 `src/**/*.test.ts`
  - 不依赖 `jsdom`
  - 适合纯函数、规则、selector、presenter、message、notify、service logic、route handler 规则测试
- `pnpm run test:interaction`
  - 跑 `src/**/*.test.tsx`
  - 会加载 `jsdom` 和 `src/test/setup-dom.ts`
  - 适合组件交互、页面联动、hook 驱动的 UI 行为测试
- `pnpm run test:all`
  - 先跑单元测试，再跑交互测试
- `pnpm run build`
  - 验证类型、构建和路由集成
- `pnpm run lint`
  - 验证 ESLint 规则

建议：

- 小改动至少跑相关测试
- 中等改动至少跑 `test:all`
- 改动页面流程、路由、数据结构、共享状态时，跑 `test:all + build`
- 改动面较大时，再补一轮 `lint`

## 2. 文件命名规则

### 单元测试

使用：

- `*.test.ts`

适用对象：

- `messages`
- `labels`
- `selectors`
- `notify`
- `logic`
- `presenters`
- `copy`
- `storage helpers`
- `route helpers`
- `service` 中可脱离 IO 的规则函数
- `api handler` 的纯入参/出参规则

典型例子：

- `src/lib/shared/scene-training-copy.test.ts`
- `src/app/(app)/chunks/chunks-page-logic.test.ts`
- `src/app/(app)/review/review-page-messages.test.ts`

### 交互测试

使用：

- `*.test.tsx`

推荐新文件优先命名成：

- `*.interaction.test.tsx`

适用对象：

- React 组件渲染
- 用户点击、输入、切换、展开、关闭
- 页面状态联动
- hook 驱动的可见行为
- 页面级回归流程

典型例子：

- `src/features/scene/components/scene-practice-view.interaction.test.tsx`
- `src/features/lesson/components/lesson-reader.interaction.test.tsx`
- `src/app/(app)/scene/[slug]/page.regression.test.tsx`

## 3. 什么时候写哪种测试

### 优先写单元测试的场景

如果改动是下面这些，优先补 `*.test.ts`：

- 文案映射
- 阶段判断
- 状态推导
- 请求参数构造
- selector 派生逻辑
- presenter 输出结构
- 本地缓存读写规则
- service 里的阶段推进规则

原则：

- 能脱离 React 和 DOM，就不要写成交互测试

### 必须写交互测试的场景

如果改动是下面这些，补 `*.test.tsx`：

- 按钮点击后 UI 是否切换
- 面板是否打开/关闭
- 默认折叠态和展开态是否联动
- 练习完成后模块是否解锁
- 当前训练句、当前步骤、按钮文案是否会跟随状态变化
- 页面级入口、路由、回退行为是否变化

原则：

- 只有在“用户操作 -> 页面变化”这条链必须被验证时，才写交互测试

## 4. 单元测试规则

1. `纯逻辑优先`
   - selector、message、helper、presenter 不要硬塞进组件测试里测

2. `默认不依赖 DOM`
   - `*.test.ts` 里不要默认依赖 `window`、`document`、`localStorage`
   - 如果必须用，局部 mock，不要隐式依赖全局环境

3. `测试输入输出，不测试内部实现`
   - 优先断言返回值、派生结果、状态映射
   - 不要为了断言去耦合内部临时变量

4. `一份测试只验证一层职责`
   - `messages` 测文案映射
   - `selectors` 测派生结果
   - `notify` 测是否把调用路由到正确 toast
   - `logic` 测规则判断

5. `新抽公共层时，优先补同名测试`
   - 新增 `xxx-messages.ts`
   - 同时补 `xxx-messages.test.ts`

6. `复杂状态机要覆盖边界`
   - 起始态
   - 中间推进态
   - 完成态
   - 非法或缺省输入兜底

## 5. 交互测试规则

1. `只测用户可感知行为`
   - 文案出现/消失
   - 按钮是否可点
   - 面板是否展开
   - 模块是否解锁
   - 路由是否变化

2. `优先使用稳定选择器`
   - 优先顺序：
   - `role`
   - `label`
   - `data-testid`
   - 最后才是 `getByText`

3. `不要复刻组件内部实现`
   - 不要测 `useState` 或 reducer 细节
   - 测最终行为，不测内部步骤

4. `回归测试要覆盖真实 bug 或真实改动`
   - 入口形态变化
   - 路由切换
   - 默认态文案变化
   - 状态恢复逻辑变化

5. `断言要尽量具体`
   - 不只断言“面板存在”
   - 更好的是断言“默认不出现，点击后出现”

## 6. Mock 规则

1. `只 mock 当前用例真正关心的边界`
   - 页面测试 mock API/hook/路由即可
   - 不要顺手 mock 一整层无关实现

2. `同一类 mock 保持风格一致`
   - 路由统一 mock `next/navigation`
   - 页面 API 统一 mock `lib/utils/*-api`

3. `mock 名字要表达业务含义`
   - 用 `buildLearningState`
   - 不要用难懂的 `mock1`、`data2`

4. `能复用的测试构造器就抽出来`
   - 例如：
   - `buildLearningState`
   - `buildScene`
   - `buildPhraseRow`

## 7. 断言风格

1. `测试名写清楚行为和结果`
   - 好例子：
   - `SceneDetailPage 记录整段播放和打开表达后，会更新入口步骤文字`

2. `一个 test 只验证一个主结论`
   - 可以有多个断言
   - 但它们必须服务同一个行为结论

3. `优先断言产品语义`
   - 例如“当前步骤变成练核心句”
   - 不要只断言某个 className 变化

4. `中文测试名保持完整句子`
   - 便于扫描失败日志

## 8. 推荐执行流程

每次改动建议按这个顺序：

1. 改代码
2. 补对应单测或交互测试
3. 先跑最小相关测试
4. 再跑全量测试
5. 最后跑构建

例如：

```bash
node --import tsx --test src/features/today/components/today-page-selectors.test.ts
node --import tsx --import ./src/test/setup-dom.ts --test src/app/(app)/scene/[slug]/page.regression.test.tsx
pnpm run test:all
pnpm run build
```

如果只改了纯逻辑层，可以先跑定向文件：

```bash
node --import tsx --test src/lib/shared/scene-training-copy.test.ts
```

如果只改了交互组件，可以先跑对应交互测试：

```bash
node --import tsx --import ./src/test/setup-dom.ts --test src/features/scene/components/scene-practice-view.interaction.test.tsx
```

注意：

- Windows PowerShell 下包含 `[` `]` 的路径，必要时用引号包起来
- 如果命令行通配行为不稳定，优先直接跑 `pnpm run test:unit` 或 `pnpm run test:interaction`

## 9. 当前仓库推荐分层

目前仓库已经形成比较稳定的测试分层：

- `scene-detail-*`
  - `messages / selectors / notify / regression`
- `scene-practice-*`
  - `messages / interaction`
- `review-page-*`
  - `messages / selectors`
- `chunks-*`
  - `messages / logic / notify / presenters / hooks`
- `focus-detail-*`
  - `labels / selectors / view-model / interaction`
- `lesson-reader-*`
  - `logic / interaction`

结论：

- 新增公共规则文件时，优先补同层单元测试
- 新增页面流程变化时，优先补交互回归测试

## 10. 什么时候必须补回归测试

出现下面这些情况时，建议补一条 `*.test.tsx` 回归测试：

- 刚修掉一个真实交互 bug
- 页面入口或按钮语义发生变化
- 默认态和展开态发生变化
- 流程从单步骤变成多步骤
- 状态初始化或恢复逻辑发生变化
- 路由 query 参数驱动的 UI 变化

典型例子：

- scene 训练入口从纯图标变成步骤胶囊
- practice 从单题型变成多模块
- 当前训练句切换后按钮文案同步更新

## 11. 当前规则还可以继续优化的方向

这次补文档后，后面建议继续收紧两点：

- 给关键页面补“最小回归清单”
  - 例如 `scene / today / review / chunks`
- 把 `lint` 纳入大改动后的默认验证步骤

## 12. 当前基线

更新这份文档时，下面命令已经通过：

```bash
pnpm run test:interaction
pnpm run build
```

如果后面测试链路、命名规则或脚本变化了，记得同步更新这份文档。
