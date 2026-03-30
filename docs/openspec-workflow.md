# OpenSpec 工作流

## 1. 什么时候要用 OpenSpec

满足下面任一情况，就优先开 OpenSpec change：

- 会改动功能行为
- 会改动数据流或状态流
- 会改动缓存策略
- 会改动测试链路或回归范围
- 会影响多个页面之间的一致性
- 会新增或修改维护规则

如果只是非常小的局部文案、拼写或纯样式微调，且不会影响链路和规范，可以不单独建 change，但完成后仍然要更新 `CHANGELOG.md`。

## 2. 日常命令

```bash
pnpm run spec:list
pnpm run spec:validate
node_modules\.bin\openspec.CMD new change <change-name>
node_modules\.bin\openspec.CMD change validate <change-name> --strict --no-interactive
node_modules\.bin\openspec.CMD archive <change-name>
```

## 3. 推荐流程

### 第一步：确认是否要建 change

先判断这次改动是不是“非微小改动”。

如果会影响：

- `today -> scene -> chunks -> review` 主闭环
- 服务端学习状态
- 跨页面按钮/交互一致性
- 缓存与预取
- 测试基线

就直接建 change。

### 第二步：创建 change

```bash
node_modules\.bin\openspec.CMD new change <change-name>
```

建议名字直接用动词短语，例如：

- `unify-detail-footer-actions`
- `stabilize-scene-cache-refresh`
- `refine-review-summary-cards`

### 第三步：补齐四类文档

一个完整 change 至少包含：

- `proposal.md`
- `design.md`
- `tasks.md`
- `specs/<capability>/spec.md`

建议写法：

- `proposal.md`: 为什么做、改什么、影响哪里
- `design.md`: 当前链路、设计决策、风险
- `tasks.md`: 实施步骤、验证步骤、changelog 更新
- delta spec: 用 `## ADDED/MODIFIED/REMOVED/RENAMED Requirements`

## 4. 稳定 spec 和 change delta 的区别

### 稳定 spec

放在：

- `openspec/specs/*`

格式用：

- `## Purpose`
- `## Requirements`

适合写项目长期稳定规则，比如：

- 维护规范
- 学习闭环
- 固定能力边界

### change delta

放在：

- `openspec/changes/<change-name>/specs/*`

格式用：

- `## ADDED Requirements`
- `## MODIFIED Requirements`
- `## REMOVED Requirements`
- `## RENAMED Requirements`

适合写这次变更打算新增、修改或移除什么规则。

## 5. 归档前检查清单

在执行 `archive` 之前，至少确认下面这些项：

- 相关代码已经落地
- `tasks.md` 已经更新到最新状态
- 受影响测试已经执行，或明确记录未验证风险
- `CHANGELOG.md` 已更新
- 变更里的 delta spec 已经表达清楚本次规则变化
- 稳定 spec 如果需要同步，也已经准备好

推荐命令：

```bash
node_modules\.bin\openspec.CMD change validate <change-name> --strict --no-interactive
node_modules\.bin\openspec.CMD archive <change-name>
```

## 6. 当前仓库的建议实践

- 小改动也要记 `CHANGELOG.md`
- 非微小改动先建 change，再写代码
- 如果一个改动横跨 `lesson` 和 `chunks`，默认当作跨页面一致性改动处理
- 如果只是实现细节变化，但不涉及稳定规则，不要随意修改 `openspec/specs/*`
- 如果 change 已经完成但暂时不 archive，也要确保它至少能通过 validate
