# Testing Guide

这个项目现在把测试分成两层：

- `单元测试`
- `交互测试`

两层都已经能独立跑通，也能一起跑通。

## 1. 命令约定

```bash
pnpm test
pnpm run test:unit
pnpm run test:interaction
pnpm run test:all
pnpm run build
```

说明：

- `pnpm test`
  - 默认只跑单元测试
  - 等价于 `pnpm run test:unit`
- `pnpm run test:unit`
  - 只跑 `src/**/*.test.ts`
  - 不依赖 DOM
  - 适合纯函数、selector、presenter、helper、route handler 规则测试
- `pnpm run test:interaction`
  - 只跑 `src/**/*.test.tsx`
  - 会加载 `jsdom` 和 `src/test/setup-dom.ts`
  - 适合组件交互、页面联动、hook UI 行为测试
- `pnpm run test:all`
  - 先跑单元测试，再跑交互测试
- `pnpm run build`
  - 每轮大改后至少也要跑一遍

## 2. 文件命名规则

### 单元测试

使用：

- `*.test.ts`

适合测试：

- `messages`
- `selectors`
- `notify`
- `presenters`
- `logic`
- `copy`
- `route helpers`
- `storage helpers`
- `api handler` 的纯输入输出规则

典型例子：

- `scene-training-copy.test.ts`
- `chunks-page-logic.test.ts`
- `review-page-messages.test.ts`

### 交互测试

使用：

- `*.test.tsx`

适合测试：

- React 组件渲染
- 页面交互流程
- 点击、输入、切换、弹层
- 页面状态和按钮状态联动

典型例子：

- `scene-practice-view.interaction.test.tsx`
- `lesson-reader.interaction.test.tsx`
- `page.regression.test.tsx`

注意：

- 当前仓库里历史上有些交互测试文件也叫 `*.test.tsx`，不一定都带 `interaction` 字样
- 新增时优先继续用更清楚的命名，例如 `*.interaction.test.tsx`

## 3. 什么时候写哪种测试

### 优先写单元测试的情况

如果你改的是下面这些，优先补 `*.test.ts`：

- 文案映射
- 状态推导
- 阶段判断
- 题型映射
- 评估等级映射
- presenter 输出
- selector 派生逻辑
- storage 读写规则

原则：

- 能脱离 React 和 DOM，就不要写成交互测试

### 需要写交互测试的情况

如果你改的是下面这些，写 `*.test.tsx`：

- 按钮点击后 UI 是否切换
- 练习完成后模块是否解锁
- 场景页悬浮入口和面板是否联动
- 训练条是否跟随当前句
- 页面动作回调是否触发

原则：

- 只有在“用户操作 -> 页面变化”这条链必须验证时，才写交互测试

## 4. 单元测试原则

这几个原则现在是项目默认约定：

1. `纯逻辑优先写单测`
   - 不要把 selector / presenter / helper 硬塞进组件测试

2. `单元测试不依赖 DOM`
   - `*.test.ts` 里不要默认依赖 `window`、`document`、`localStorage`
   - 如果必须用，自己在测试文件里最小 mock

3. `避免测试实现细节`
   - 优先测输入和输出
   - 不要为了断言去耦合内部临时变量

4. `一份测试只验证一层职责`
   - messages 测文案映射
   - selectors 测推导结果
   - notify 测调用路由
   - 不要全搅在一起

5. `新抽公共层时，优先补同名测试`
   - 新增 `xxx-messages.ts`
   - 就补 `xxx-messages.test.ts`

## 5. 交互测试原则

1. `测用户能感知到的行为`
   - 文案出现
   - 按钮可点/禁用
   - 面板打开/关闭
   - 题型解锁

2. `尽量用稳定选择器`
   - 优先：
     - `role`
     - `label`
     - `data-testid`
   - 对重复文本，优先用更稳定的定位方式，不要只靠裸 `getByText`

3. `不要复刻组件内部实现`
   - 只测结果，不测内部 `useState` 或 reducer 细节

4. `旧页面重构后，要同步更新交互测试`
   - 如果入口从普通按钮改成 FAB
   - 如果按钮文案改了
   - 如果总结区显示时机改了
   - 测试必须一起改，不要保留历史假设

## 6. 推荐流程

每次改动建议按这个顺序：

1. 改代码
2. 补对应单测
3. 跑最小相关测试
4. 跑全量测试
5. 跑构建

例如：

```bash
pnpm run test:unit
pnpm run test:interaction
pnpm run build
```

如果只改了公共层，也可以先跑定向文件：

```bash
node --import tsx --test src/lib/shared/scene-training-copy.test.ts
```

如果只改了交互组件，也可以先跑对应文件：

```bash
node --import tsx --import ./src/test/setup-dom.ts --test src/features/scene/components/scene-practice-view.interaction.test.tsx
```

## 7. 当前测试分层落点

现在仓库里比较稳定的模式是：

- `scene-detail-*`
  - messages / selectors / notify
- `scene-practice-*`
  - messages / selectors / notify
- `review-page-*`
  - messages / selectors / notify
- `chunks-*`
  - messages / logic / notify / presenters
- `focus-detail-*`
  - messages / notify / presenters

这类文件新增或重构后，都应该优先补同层单元测试。

## 8. 什么时候需要补回归测试

遇到下面这些情况，建议补一条 `*.test.tsx` 回归测试：

- 线上/本地刚修掉一个真实交互 bug
- 页面入口或按钮语义发生变化
- 流程从单步骤变成多步骤
- 状态初始化或恢复逻辑发生变化

典型例子：

- 训练模式下当前句切换导致按钮文案串台
- scene 页训练面板入口从旧按钮改成 FAB
- practice 从单题型变成多模块

## 9. 当前基线

在这份文档更新时，下面这些命令已经通过：

```bash
pnpm test
pnpm run test:unit
pnpm run test:interaction
pnpm run test:all
pnpm run build
```

后面如果测试链再变，记得同步更新这份文档。
