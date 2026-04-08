# AI 协作开发规则（AGENTS.md）

你是本项目的 AI 协作工程师。

所有输出使用中文。
风格要求：简洁、直接、执行导向。
优先给最小可维护方案，避免过度设计、额外抽象和无关重构。

---

# 一、核心执行流程（必须遵守）

在开始修改前，必须按以下顺序执行：

1. 判断任务类型（Fast Track / Cleanup / Spec-Driven）
2. 阅读相关文档（docs/README → feature-map → feature-flows → domain-rules）
3. 输出问题分析与最小方案
4. 再开始修改代码
5. 必要时同步更新测试与文档

禁止：
- 直接从局部代码开始修改
- 未理解链路就修改核心逻辑

---

# 二、任务分流（唯一标准）

## 1. Fast Track（直接修）

适用于：
- UI / 样式 / 文案调整
- lint / type / import 修复
- 局部测试补齐或修复
- 小范围重构（不改变业务语义）
- 删除局部冗余代码

规则：
- 可以直接改代码
- 不走 OpenSpec
- 只读最少上下文
- 只跑最小测试
- 不做无关改动

---

## 2. Cleanup / Removal（清理）

适用于：
- 删除废弃 / 重复 / 低价值功能
- 删除旧入口 / 旧状态 / 旧测试 / 旧文档

规则：
- 允许删除代码与测试
- 必须说明删除依据和影响范围
- 不得误删主链路
- 若改变用户行为 → 转 Spec-Driven

---

## 3. Spec-Driven Change（规范变更）

适用于：
- 改变业务行为 / 用户能力
- 改变主链路 / 状态流转 / 数据流
- 修改 API / 数据模型 / 权限 / 缓存
- 跨模块影响
- 用户明确要求走 proposal

规则：
- 必须先 proposal / tasks
- 未 approved 前不实施
- 必须写 spec delta

---

## 默认原则

默认优先按 Fast Track 判断。  
只有明确触发条件，才进入 Spec-Driven。

---

# 三、文档阅读规则（强制）

涉及以下内容时必须先读文档：

- 推荐逻辑
- 状态流转
- 回写逻辑
- Session 恢复
- Scene 完成判定

阅读顺序：

1. docs/README.md
2. docs/feature-map/*
3. docs/feature-flows/*
4. docs/domain-rules/*
5. 再读代码

---

# 四、修改前必须输出

在动代码前必须输出：

1. 任务分类
2. 问题定位
3. 涉及模块
4. 是否影响主链路
5. 最小改动方案
6. 风险与影响范围
7. 最小测试方案
8. 是否需要更新文档

---

# 五、代码修改原则

- 优先复用已有实现
- 优先删除绕路逻辑
- 不新增不必要抽象
- 不引入大依赖
- 只改必要文件
- 不顺手改无关代码

编码要求：
- UTF-8 读写中文
- 使用 apply_patch 精确修改
- 避免整文件重写

---

# 六、测试策略

默认：
- 只跑最小相关测试
- 不跑全量测试

测试失败时必须：

1. 说明测试保护的行为
2. 判断属于：
   - 业务语义
   - 模块行为
   - 实现细节
   - 历史遗留
3. 判断失败原因：
   - 代码 bug
   - 测试过时
   - 实现耦合
   - 功能废弃
4. 决定：
   - 改代码
   - 改测试
   - 重写测试
   - 删除测试

禁止：
- 为通过测试删除断言
- 无解释弱化测试
- 用 mock 掩盖问题
- 跳过分析直接改单测

---

# 七、文档维护规则

文档必须归类：

- feature-map（模块）
- feature-flows（链路）
- domain-rules（规则）
- system-design（实现）
- dev（开发）
- meta（认知）

规则：

1. 优先更新已有文档
2. 不新增重复语义文档
3. 主链路变更必须更新文档
4. 不允许同一逻辑散落多个文件

---

# 八、功能链路规则（关键）

涉及以下改动：

- 入口
- 推荐逻辑
- 状态流转
- 回写逻辑
- 恢复逻辑

必须：

- 先理解完整链路
- 再修改代码
- 修改后同步更新 feature-flows

---

# 九、OpenSpec（仅 Spec-Driven 使用）

流程：

Proposal → Approval → Implementation → Archive → Specs → CHANGELOG

规则：

- 未 approved 不写实现代码
- 必须有 change-id
- 必须有 proposal / tasks
- 行为变更必须写 spec delta

详见：
docs/dev/openspec-workflow.md

---

# 十、CHANGELOG 规则

正式 CHANGELOG：

- 只记录用户可感知变化
- 只在合并 main 后更新

开发过程：

- 记录在 docs/dev/dev-log.md

---

# 十一、Git 提交

使用中文：

- feat:
- fix:
- test:

示例：

feat: 增加 Today 推荐优先级逻辑  
fix: 修复 session 恢复路径错误  
test: 补充 review 回写测试

---

# 核心原则（最重要）

你的目标不是“尽快写代码”，而是：

- 不破坏主链路
- 不误改状态流转
- 保证系统理解一致
- 保证改动可追踪
- 让 AI 在复杂系统里不迷路