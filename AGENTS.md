# AI 协作开发规则（AGENTS.md）

你是本项目的 AI 协作工程师。

所有输出使用中文。
风格要求：简洁、直接、执行导向。
优先给最小可维护方案，避免过度设计、额外抽象和无关重构。

---

# 一、核心执行流程（必须遵守）

在开始修改前，必须按以下顺序执行：

1. 判断任务类型（Fast Track / Cleanup / Spec-Driven）
2. 阅读相关文档（先看 `docs/README.md` 做入口定位，再按需读对应 `feature-map` / `feature-flows` / `domain-rules`；若涉及稳定规则、正式语义、跨页面契约或已知 capability，必须补读对应 `openspec/specs/*`；若涉及字段来源 / 缓存 / fallback / 组件协作，再看 `system-design`；若涉及流程 / 测试 / OpenSpec，再看 `docs/dev`）
3. 做一次“稳定性收口检查”，判断这次需求是否同时暴露了旧规则漂移、重复语义、缺失文档、缺失测试或边界不清
4. 输出问题分析与最小方案
5. 再开始修改代码
6. 必要时同步更新测试与文档

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
- 但若在处理中发现同一链路里存在会直接导致后续返工的稳定性缺口，必须在同一轮一并补齐最小必要收口，而不是留到后面再补文档或规则

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
- 修改测试链路 / 维护规范 / 跨页面 UI 一致性
- 详情组件结构性复用边界或跨模块结构收敛
- 跨模块影响
- 用户明确要求走 proposal

规则：
- 必须先 proposal / tasks
- 未 approved 前不实施
- 必须写 spec delta
- proposal / tasks 里必须明确“本轮顺手收口哪些既有不稳定点，哪些明确不收”

---

## 默认原则

默认先判断这次是不是“微小改动”。  
只有明确属于微小、局部且不影响稳定规则时，才按 Fast Track；只要进入非微小改动范围，就优先转 Spec-Driven。

---

# 三、文档阅读规则（强制）

涉及以下内容时必须先读文档：

- 推荐逻辑
- 状态流转
- 回写逻辑
- Session 恢复
- Scene 完成判定

阅读顺序：

1. `docs/README.md`，先定位本次问题属于哪个模块、链路、规则或维护流程
2. 对应 `docs/feature-map/README.md` 与相关模块文档
3. 对应 `docs/feature-flows/*` 链路文档
4. `docs/domain-rules/README.md` 与对应规则文档
5. 若涉及稳定规则、正式语义、跨页面契约或已知 capability，再读对应 `openspec/specs/*`
6. 若涉及字段来源、落库、缓存、fallback 或组件协作，再读 `docs/system-design/*`
7. 若涉及流程、测试、发布检查或 OpenSpec，再读 `docs/dev/README.md` 与对应维护文档
8. 再读代码

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
9. 这次是否发现需要顺手收口的稳定性缺口；若有，列出“本轮收口项 / 明确不收项”

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
5. OpenSpec 变更在 implementation / archive 完成前，必须同步检查并补全对应文档
6. 功能链路优化或新增能力必须同步更新对应分类文档；例如音频/TTS 链路改动要更新 `docs/system-design/audio-tts-pipeline.md`
7. 处理需求时如果已经发现 stable spec / domain-rules / system-design / feature-flows 之间存在重复语义、边界漂移或入口缺失，必须在同一轮做最小收口，不要把已识别的不稳定点留到后续零散修补

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

Proposal → Approval → Implementation → Archive → Update specs → Update CHANGELOG

规则：

- 未 approved 不写实现代码
- 必须有 change-id
- 必须有 proposal / tasks
- 行为变更必须写 spec delta
- 非微小改动若涉及数据流、缓存、测试链路、维护规范或跨页面一致性，也应先走 OpenSpec
- 实现完成后必须对照 proposal / design / spec delta 回查对应 feature-flow / domain-rules / system-design 文档是否已同步
- 若本次提交被视为“完成态提交”或用户明确要求“收尾提交”，则必须先完成收尾动作，再提交代码；不得先提交实现代码、再手动补 archive / stable spec / 文档收尾
- 收尾动作至少包括：tasks 状态更新、相关文档同步、stable spec 同步、change archive；若本次收尾结果将直接进入 `main` 且存在用户可感知变化，则必须同步更新正式 `CHANGELOG.md`
- 开发中的中间提交允许存在，但不得宣称该变更已完成，也不得跳过后续收尾流程
- archive 前不得只归档 OpenSpec 而遗漏实际维护文档；若无文档更新，必须说明原因

详见：
- `openspec/specs/project-maintenance/spec.md`（长期稳定维护约束）
- `docs/dev/openspec-workflow.md`（Spec-Driven 阶段细化流程）

---

# 十、CHANGELOG 规则

正式 CHANGELOG：

- 只记录用户可感知变化
- 若本次收尾结果将直接进入 `main`，则用户可感知的新功能、交互变化或行为变化必须同步更新
- 若代码尚未进入 `main`，不得把过程性记录或未发布改动提前写入正式 `CHANGELOG.md`

开发过程：

- 记录在 docs/dev/dev-log.md

---

# 十一、Git 提交

使用中文：

- feat:
- fix:
- test:

补充约束：

- Fast Track / Cleanup 可以按正常节奏提交，但仍需保证该轮最小测试与文档同步已完成
- Spec-Driven 若只是开发中的中间提交，可以提交，但不得表述为“已完成”
- Spec-Driven 若是“完成态提交 / 收尾提交”，必须先完成 tasks、文档、stable spec 与 archive，再提交

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
