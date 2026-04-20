# Documentation Index

本目录用于描述项目的功能结构、核心链路、规则系统与开发方式。

目标：

- 让开发者和 AI 在修改代码前，先理解系统结构
- 避免从局部代码反推业务逻辑
- 保证主链路、状态流转和核心规则不会被误改

---

## 推荐阅读顺序（重要）

当需要理解或修改复杂功能时，请按以下顺序：

1. `feature-map/README.md`（理解整体模块结构）
2. 对应模块文档（如 today / scene / session）
3. `feature-flows/` 对应链路文档
4. `domain-rules/README.md` 与对应规则文档
5. 如果问题涉及字段来源、落库、缓存、fallback 或组件协作，再看 `system-design/README.md` 与对应实现文档
6. 最后再进入代码

如果问题已经从“系统怎么跑”转成“这次该按什么流程改、要不要走 OpenSpec、测试和上线检查怎么收敛”，请转到 `docs/dev/README.md`，再进入对应维护文档。

禁止：
- 直接从局部代码推断业务
- 未理解链路就修改核心逻辑

---

## 文档分层说明

### 1. feature-map（模块层：是什么）

描述系统中有哪些核心模块，每个模块：

- 做什么
- 依赖什么
- 影响什么
- 哪些规则不能乱动

示例：
- today.md
- scene.md
- session.md
- expression-item.md
- review.md

---

### 2. feature-flows（链路层：怎么跑）

描述功能链路：

- 从哪里进入（入口）
- 中间经过哪些步骤（状态流转）
- 最后输出什么（回写 / 跳转）
- 异常和回退路径

示例：
- today-recommendation.md
- scene-training-flow.md
- session-resume.md
- review-writeback.md

---

### 3. domain-rules（规则层：为什么这样跑）

描述系统规则：

- 推荐优先级
- 学习证据模型
- review 调度策略
- 状态推进规则
- 安全边界与用户态数据访问边界

示例：
- auth-api-boundaries.md
- learning-evidence.md
- review-scheduling-rules.md

---

### 4. system-design（实现层：怎么实现）

描述技术实现与数据结构：

- 数据映射
- pipeline
- 生成逻辑
- 组件结构

示例：
- chunks-data-mapping.md
- audio-tts-pipeline.md
- component-library.md
- learning-overview-mapping.md
- review-practice-signals.md

---

### 5. dev（开发层）

描述开发方式与流程：

- workflow
- 测试策略
- 开发日志
- 变更模板
- 上线检查
- 审计记录

示例：
- dev/README.md
- testing-policy.md
- openspec-workflow.md
- backend-release-readiness-checklist.md
- server-data-boundary-audit.md
- dev-log.md

入口建议：
- `docs/dev/README.md` 负责目录导航
- `docs/dev/project-maintenance-playbook.md` 负责维护主手册
- `docs/dev/openspec-workflow.md` 负责 Spec-Driven 阶段规则

---

### 6. meta（认知层）

帮助理解整个项目：

- 项目脑图
- 学习路径
- 结构说明

示例：
- meta/README.md
- project-mindmap.md
- project-tree-map.md
- project-learning-guide.md

---

## 文档使用规则（必须遵守）

### 安全与接口治理的查找建议

如果问题涉及认证入口、用户态数据权限边界、后台白名单入口：

- 先看 `openspec/specs/auth-api-boundaries/spec.md`
- 再看 `docs/domain-rules/auth-api-boundaries.md`

如果问题涉及接口失败保护、最小可观测性、运行护栏：

- 先看 `openspec/specs/api-operational-guardrails/spec.md`
- 再看对应 `docs/dev/*` 验证与检查文档

### stable spec 查找建议

如果你已经拿到某个 `openspec/specs/*` capability，但还不确定应该继续看哪类长期文档：

- 偏判定标准、正式语义、消费边界
  - 转 `docs/domain-rules/README.md`
- 偏字段来源、缓存、fallback、服务协作、实现锚点
  - 转 `docs/system-design/README.md`
- 偏主链路入口、状态流转、回写和回退路径
  - 转 `docs/feature-flows/README.md`
- 偏维护流程、测试、OpenSpec、上线检查
  - 转 `docs/dev/README.md`

---

### 1. 修改前必须理解链路

涉及以下内容时：

- 推荐逻辑
- 状态流转
- 回写逻辑
- Session 恢复
- Scene 完成判定

必须：

- 先读 feature-map
- 再读 feature-flow
- 再改代码

---

### 2. 文档必须同步更新

当修改以下内容时：

- 主链路
- 状态逻辑
- 推荐逻辑
- 回写逻辑
- 删除功能

必须同步更新：

- feature-flow 文档
- 必要时 feature-map

---

### 3. 文档归类规则

新增文档时必须归类到：

- feature-map
- feature-flows
- domain-rules
- system-design
- dev
- meta

禁止：

- 新建模糊分类（如 mapping / logic / misc）
- 同一逻辑写在多个文件

---

### 4. 优先更新而不是新建

如果已有类似文档：

- 优先修改已有文档
- 不要创建重复文件

---

## 一句话原则

> 文档用于保证“系统理解一致”，而不是记录“代码细节”
