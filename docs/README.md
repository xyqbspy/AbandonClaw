# Documentation Index

本目录用于描述项目的功能结构、核心链路、规则系统与开发方式。

目标：

- 让开发者和 AI 在修改代码前，先理解系统结构
- 避免从局部代码反推业务逻辑
- 保证主链路、状态流转和核心规则不会被误改

---

## 推荐阅读顺序（重要）

当需要理解或修改复杂功能时，请按以下顺序：

1. 先用当前文档判断问题属于模块、链路、规则、实现还是维护流程
2. `feature-map/README.md` 与对应模块文档（如 today / scene / session）
3. `feature-flows/` 对应链路文档
4. `domain-rules/README.md` 与对应规则文档
5. 如果问题已经落到某个稳定 capability、正式语义或跨页面契约，补读对应 `openspec/specs/*`
6. 如果问题涉及字段来源、落库、缓存、fallback 或组件协作，再看 `system-design/README.md` 与对应实现文档
7. 如果问题已经从“系统怎么跑”转成“这次该按什么流程改、要不要走 OpenSpec、测试和上线检查怎么收敛”，再转到 `docs/dev/README.md`
8. 最后再进入代码

注意：
- 这里的顺序是“先定位，再精读相关文档”，不是默认把整个目录逐个读完
- 如果 `feature-flows` / `domain-rules` / `docs/dev` 已经明确引用了某个 stable spec，应把该 spec 视为本轮必读上下文，而不是可选参考

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
- `openspec/specs/project-maintenance/spec.md` 负责开发流程与维护约定的稳定约束
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

### 高频问题最小入口

如果你是第一次接手仓库，或当前问题还没完全定类，可以先按下面的最小路径找：

- 学习闭环、主链路一致性、`today -> scene -> chunks -> review`
  - 先看 `openspec/specs/learning-loop-overview/spec.md`
  - 再看 `docs/feature-flows/*`
  - 再看 `docs/domain-rules/*`
- 句子推进、句子完成、Scene 完成判定
  - 先看 `openspec/specs/sentence-progression/spec.md`
  - 再看 `openspec/specs/sentence-completion-tracking/spec.md`
  - 再看 `docs/domain-rules/learning-evidence.md`
  - 必要时补 `docs/feature-flows/scene-training-flow.md`
- 推荐逻辑、continue learning、聚合消费
  - 先看 `openspec/specs/today-learning-contract/spec.md`
  - 再看 `docs/feature-flows/today-recommendation.md`
  - 再看相关 `domain-rules` / `system-design`
- Review 训练、排序、来源和正式信号
  - 先看 `openspec/specs/review-*.md` 对应 capability
  - 再看 `docs/feature-flows/review-writeback.md`
  - 再看 `docs/domain-rules/review-scheduling-rules.md`
- 开发流程、OpenSpec、CHANGELOG / dev-log 分工
  - 先看 `openspec/specs/project-maintenance/spec.md`
  - 再看 `docs/dev/README.md`
  - 再看 `docs/dev/project-maintenance-playbook.md` 与 `docs/dev/openspec-workflow.md`
- 认证边界、用户态数据访问、后台入口
  - 先看 `openspec/specs/auth-api-boundaries/spec.md`
  - 再看 `docs/domain-rules/auth-api-boundaries.md`
- 缓存、fallback、字段来源、组件协作
  - 先看相关 capability
  - 再看 `docs/system-design/README.md` 与对应实现文档

### 安全与接口治理的查找建议

如果问题涉及认证入口、用户态数据权限边界、后台白名单入口：

- 先看 `openspec/specs/auth-api-boundaries/spec.md`
- 再看 `docs/domain-rules/auth-api-boundaries.md`

如果问题涉及接口失败保护、最小可观测性、运行护栏：

- 先看 `openspec/specs/api-operational-guardrails/spec.md`
- 再看对应 `docs/dev/*` 验证与检查文档

### stable spec 查找建议

如果当前需求已经暴露出明确 capability、正式语义边界或跨页面稳定契约，不要只停留在 `docs/*`，必须继续读取对应 `openspec/specs/*`。

如果你已经拿到某个 `openspec/specs/*` capability，但还不确定应该继续看哪类长期文档：

- 偏判定标准、正式语义、消费边界
  - 转 `docs/domain-rules/README.md`
- 偏字段来源、缓存、fallback、服务协作、实现锚点
  - 转 `docs/system-design/README.md`
- 偏主链路入口、状态流转、回写和回退路径
  - 转 `docs/feature-flows/README.md`
- 偏维护流程、测试、OpenSpec、上线检查
  - 转 `docs/dev/README.md`

常见入口示例：

- 学习闭环总览、主链路一致性
  - 先看 `openspec/specs/learning-loop-overview/spec.md`
  - 再按需转 `feature-flows/`、`domain-rules/`
- 句子推进、句子完成与场景完成边界
  - 先看 `openspec/specs/sentence-progression/spec.md`
  - 再看 `openspec/specs/sentence-completion-tracking/spec.md`
  - 再转 `docs/domain-rules/learning-evidence.md` 与对应 scene flow
- 开发流程、OpenSpec、CHANGELOG / dev-log 分工
  - 先看 `openspec/specs/project-maintenance/spec.md`
  - 再看 `docs/dev/README.md` 与 `docs/dev/openspec-workflow.md`

### 从 stable spec 到代码入口

如果你已经确认当前问题对应某个 stable spec，但还不确定下一步该进哪段代码，可以先按下面的轻量映射找：

- `learning-loop-overview`
  - 文档入口：`docs/feature-flows/*`、`docs/domain-rules/learning-evidence.md`
  - 代码入口：`src/app/(app)/today/page.tsx`、`src/app/(app)/scene/[slug]/scene-detail-page.tsx`、`src/app/(app)/chunks/page.tsx`、`src/app/(app)/review/page.tsx`
  - 服务端入口：`src/lib/server/learning/service.ts`、`src/lib/server/phrases/service.ts`
- `sentence-progression`
  - 文档入口：`docs/feature-flows/scene-training-flow.md`、`docs/domain-rules/learning-evidence.md`
  - 代码入口：`src/app/(app)/scene/[slug]/scene-detail-page.tsx`
  - 服务端入口：`src/lib/server/learning/*`
- `sentence-completion-tracking`
  - 文档入口：`docs/domain-rules/learning-evidence.md`、相关 `scene` / 聚合 flow
  - 页面消费入口：`today`、`scene`、`review`、`progress` 对应页面与 selector
  - 服务端入口：`src/lib/server/learning/*`
- `today-learning-contract`
  - 文档入口：`docs/feature-flows/today-recommendation.md`
  - 代码入口：`src/app/(app)/today/*`、`src/features/today/*`
  - 服务端入口：`src/lib/server/learning/*`
- `review-*`
  - 文档入口：`docs/feature-flows/review-writeback.md`、`docs/domain-rules/review-scheduling-rules.md`
  - 代码入口：`src/app/(app)/review/*`、`src/features/review/*`
  - 服务端入口：`src/lib/server/review/*`
- `auth-api-boundaries`
  - 文档入口：`docs/domain-rules/auth-api-boundaries.md`
  - 服务端入口：先看认证入口、用户态数据访问入口和后台白名单相关 server 代码
- `chunks-data-contract`
  - 文档入口：`docs/system-design/chunks-data-mapping.md`
  - 代码入口：`src/app/(app)/chunks/*`、`src/features/chunks/*`
  - 服务端入口：`src/lib/server/phrases/*`、`src/lib/server/expression-clusters/*`
- `runtime-cache-coherence`
  - 文档入口：相关 `feature-flows` + `system-design`
  - 代码入口：命中页面对应的 data hook / controller
  - 缓存入口：`src/lib/cache/*`

说明：
- 这里给的是“先进入哪里看”的最小代码锚点，不是完整实现清单
- 如果某个 capability 还跨多个模块，优先先读对应 flow / rule，再回到这些代码入口，不要直接跳进局部实现猜语义

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
