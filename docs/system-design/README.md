# 系统设计

本目录用于维护“实现设计”文档。

实现设计回答的是：

- 规则和链路最终落在什么实现结构上
- 字段来自哪里、怎么聚合、怎么回退
- 服务、组件、缓存和数据结构如何配合
- 改实现时要一起检查哪些文件和测试

如果你已经知道模块职责、主链路和规则语义，但还需要继续落到“具体实现怎么接”，再看这里。

## 当前目录

- [audio-tts-pipeline.md](/d:/WorkCode/AbandonClaw/docs/system-design/audio-tts-pipeline.md)
- [chunks-data-mapping.md](/d:/WorkCode/AbandonClaw/docs/system-design/chunks-data-mapping.md)
- [chunks-focus-detail-map.md](/d:/WorkCode/AbandonClaw/docs/system-design/chunks-focus-detail-map.md)
- [component-library.md](/d:/WorkCode/AbandonClaw/docs/system-design/component-library.md)
- [learning-overview-mapping.md](/d:/WorkCode/AbandonClaw/docs/system-design/learning-overview-mapping.md)
- [review-practice-signals.md](/d:/WorkCode/AbandonClaw/docs/system-design/review-practice-signals.md)
- [review-progressive-practice.md](/d:/WorkCode/AbandonClaw/docs/system-design/review-progressive-practice.md)
- [review-source-mapping.md](/d:/WorkCode/AbandonClaw/docs/system-design/review-source-mapping.md)
- [scene-generation-pipeline.md](/d:/WorkCode/AbandonClaw/docs/system-design/scene-generation-pipeline.md)
- [scene-practice-generation.md](/d:/WorkCode/AbandonClaw/docs/system-design/scene-practice-generation.md)
- [ui-style-guidelines.md](/d:/WorkCode/AbandonClaw/docs/system-design/ui-style-guidelines.md)
- [ui-style-audit.md](/d:/WorkCode/AbandonClaw/docs/system-design/ui-style-audit.md)

## 推荐使用方式

- 已经知道规则和链路，但还不清楚字段、缓存或服务怎么接
  - 先来这里
- 改某个聚合字段、fallback、落库位置或实现锚点
  - 优先找对应实现文档

## 常见 stable spec 对照

- `openspec/specs/chunks-data-contract/spec.md`
  - 对应 `chunks-data-mapping.md`
- `openspec/specs/component-library-governance/spec.md`
  - 对应 `component-library.md`
- `openspec/specs/review-practice-signals/spec.md`
  - 对应 `review-practice-signals.md`
- `openspec/specs/review-progressive-practice/spec.md`
  - 对应 `review-progressive-practice.md`
- `openspec/specs/review-source-contract/spec.md`
  - 对应 `review-source-mapping.md`
- `openspec/specs/scene-practice-generation/spec.md`
  - 对应 `scene-practice-generation.md`
- `openspec/specs/today-learning-contract/spec.md`
  - 对应 `learning-overview-mapping.md` 与相关 `feature-flows/today-recommendation.md`
- `openspec/specs/audio-playback-orchestration/spec.md`
  - 对应 `audio-tts-pipeline.md`
- `openspec/specs/component-library-governance/spec.md`、`openspec/specs/learning-action-button-hierarchy/spec.md`、`openspec/specs/detail-footer-actions/spec.md`
  - 对应 `ui-style-guidelines.md` 与 `component-library.md`

如果某个 capability 同时涉及实现协作和主链路承接，先看这里确认实现归宿，再回到对应 `feature-flows/` 或 `domain-rules/` 补完整语义。

## 使用原则

出现这些情况时，应优先补或改 `system-design`：

- 字段来源、聚合或 fallback 变化
- 正式信号落库位置变化
- 服务/缓存/组件的实现协作关系变化
- 某条链路的实现锚点和测试锚点需要固定下来
- 新增页面、功能入口或跨页面 UI 调整需要统一风格入口

以下内容通常不应单独写在这里：

- 模块职责定义
- 产品入口到回写的完整主链路
- 领域判定标准本身

## 与其它文档的边界

- `system-design/`
  - 解释字段来源、实现协作关系和测试锚点
- `domain-rules/`
  - 解释这些实现背后的正式语义和判定标准
- `feature-flows/`
  - 解释这些实现挂接到主链路后如何流转

## 建议正文模板

新增或重写 `system-design` 文档时，优先按这组章节组织：

1. 目标
2. 对应入口/实现位置
3. 关键结构或字段来源
4. 页面/服务端映射
5. 失败回退或兼容策略
6. 和其它模块/页面的边界
7. 什么时候必须同步更新
8. 建议回归
