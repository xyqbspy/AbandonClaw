# 设计说明：reorganize-docs-taxonomy

## Status

draft

## Current Situation

当前 docs 已经开始形成分层，但还不彻底：

- 已存在：
  - `feature-map/`
  - `feature-flows/`
- 仍散落顶层：
  - `audio-tts-pipeline.md`
  - `chunks-data-mapping.md`
  - `scene-practice-generation.md`
  - `review-*`
  - `project-learning-guide.md`
  - `project-maintenance-playbook.md`
  - `testing-policy.md`
  - `project-mindmap*.md`

问题不在“文件太多”，而在“分类还不稳定”。

## Decision

### 1. 固定六层 docs taxonomy

最终结构固定为：

- `feature-map`
  - 回答“模块是什么、职责是什么”
- `feature-flows`
  - 回答“链路如何触发、流转、回写、恢复、降级”
- `domain-rules`
  - 回答“规则、机制、优先级、证据模型”
- `system-design`
  - 回答“技术实现、数据映射、pipeline、设计边界”
- `dev`
  - 回答“开发流程、测试策略、维护手册、变更接入”
- `meta`
  - 回答“项目认知、脑图、学习导览、整体结构”

### 2. 现有文件按语义迁移

#### 保持名字，仅迁移目录

- `audio-tts-pipeline.md` -> `system-design/audio-tts-pipeline.md`
- `chunks-data-mapping.md` -> `system-design/chunks-data-mapping.md`
- `chunks-focus-detail-map.md` -> `system-design/chunks-focus-detail-map.md`
- `component-library.md` -> `system-design/component-library.md`
- `change-intake-template.md` -> `dev/change-intake-template.md`
- `dev-log.md` -> `dev/dev-log.md`
- `openspec-workflow.md` -> `dev/openspec-workflow.md`
- `project-maintenance-playbook.md` -> `dev/project-maintenance-playbook.md`
- `testing-policy.md` -> `dev/testing-policy.md`
- `project-learning-guide.md` -> `meta/project-learning-guide.md`
- `project-mindmap.md` -> `meta/project-mindmap.md`
- `project-mindmap-outline.md` -> `meta/project-mindmap-outline.md`
- `project-tree-map.md` -> `meta/project-tree-map.md`

#### 迁移并重命名

- `progress-overview-mapping.md` -> `domain-rules/progress-overview.md`
- `review-practice-signals.md` -> `domain-rules/review-practice-rules.md`
- `review-scheduling-signals.md` -> `domain-rules/review-scheduling-rules.md`
- `review-source-mapping.md` -> `system-design/review-source-mapping.md`
- `scene-practice-generation.md` -> `system-design/scene-practice-generation.md`
- `scenes-entry-flow.md` -> `feature-flows/scene-entry.md`
- `today-learning-mapping.md` -> `feature-flows/today-recommendation.md`

#### 待确认边界

- `review-progressive-practice.md`

默认放入：

- `system-design/review-progressive-practice.md`

理由：

- 当前它更偏“review 舞台如何设计和组织”的实现说明
- 若后续演化为正式规则文档，再转入 `domain-rules` 也更自然

### 3. 各目录 README 负责索引，不重复写主文档

- `docs/README.md`：总索引与分层定义
- 各子目录 README：只负责该目录职责和子文档索引
- 具体规则 / 设计 / 链路解释在子文档内，不再在 README 重复展开一遍

### 4. 迁移时必须同步修链接

实施时必须同时处理：

- 文档内相互引用
- `AGENTS.md` 中的阅读顺序和分类规则
- 维护手册和 testing policy 中的路径引用

## Risks

- 如果只移动文件不改链接，新的 taxonomy 会立刻失效
- 如果 README 承担过多正文，迁移后仍会出现重复语义
- 如果 `review-progressive-practice` 定位不清，后续仍会在 `rules/design` 之间摇摆

## Validation

- docs 根目录和六个子目录结构必须完整
- 所有迁移文件必须落到新目录
- 旧路径引用必须清理或重定向到新路径
- `pnpm run text:check-mojibake`
