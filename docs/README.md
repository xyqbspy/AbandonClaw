# 文档索引

## 快速入口

- 当前后端技术栈、Java 重写评估与重构步骤大纲：
  `docs/system-design/backend-rewrite/java-backend-rewrite-assessment.md`

本目录用于定位项目文档。先用这里判断问题属于哪一层，再进入对应文档；不要从局部代码反推业务语义。

## 最小阅读路径

1. 先判断任务类型：模块、链路、规则、实现、维护流程。
2. 按下表进入对应文档层。
3. 若涉及 stable spec 或正式语义，补读 `openspec/specs/*`。
4. 若涉及代码实现，再回到具体文件。

## 文档分层

| 层级 | 回答什么 | 目录 |
| --- | --- | --- |
| feature-map | 模块是什么、负责什么、影响什么 | `docs/feature-map/` |
| feature-flows | 主链路怎么跑、入口/回写/失败路径 | `docs/feature-flows/` |
| domain-rules | 业务规则、状态推进、推荐、权限边界 | `docs/domain-rules/` |
| system-design | 字段来源、缓存、fallback、组件协作、pipeline | `docs/system-design/` |
| dev | OpenSpec、测试、收尾、发布检查、dev-log | `docs/dev/` |
| meta | 项目认知、脑图、学习路径 | `docs/meta/` |

## 高频问题入口

| 问题 | 先看 |
| --- | --- |
| 学习闭环、`today -> scene -> chunks -> review` 一致性 | `openspec/specs/learning-loop-overview/spec.md`，再看 `docs/feature-flows/` |
| scene 步骤、句子推进、scene 完成判定 | `openspec/specs/sentence-progression/spec.md`、`openspec/specs/sentence-completion-tracking/spec.md` |
| Today 推荐、continue learning | `openspec/specs/today-learning-contract/spec.md`、`docs/feature-flows/today-recommendation.md` |
| Review 来源、排序、回写 | `openspec/specs/review-*`、`docs/feature-flows/review-writeback.md` |
| scene 练习题生成、缓存、服务端题集 | `openspec/specs/scene-practice-generation/spec.md`、`openspec/specs/runtime-cache-coherence/spec.md`、`docs/system-design/scene-practice-generation.md` |
| chunks 字段、关系、cluster、detail | `openspec/specs/chunks-data-contract/spec.md`、`docs/system-design/chunks-data-mapping.md` |
| 音频 / TTS / 预热 / 缓存 | `docs/system-design/audio-tts-pipeline.md`、`openspec/specs/audio-playback-orchestration/spec.md`、`openspec/specs/audio-action-button-consistency/spec.md` |
| 认证、用户态数据、RLS、后端边界 | `openspec/specs/auth-api-boundaries/spec.md`、`docs/domain-rules/auth-api-boundaries.md` |
| API 失败保护、运行护栏 | `openspec/specs/api-operational-guardrails/spec.md`、`docs/dev/backend-release-readiness-checklist.md` |
| 公网开放注册、滥用防护、成本额度 | `docs/dev/public-registration-readiness-plan.md` |
| OpenSpec、CHANGELOG、dev-log、收尾 | `openspec/specs/project-maintenance/spec.md`、`docs/dev/README.md` |

## 稳定规范到实现锚点

这里仅提供第一跳代码入口，避免维护者或 AI 在目录里盲搜。正式语义仍以 stable spec 和对应 docs 为准。

| stable spec | 常见实现入口 |
| --- | --- |
| `learning-loop-overview` | `src/lib/server/learning/service.ts`、`src/app/(app)/today/page.tsx`、`src/app/(app)/review/page.tsx` |
| `sentence-progression` / `sentence-completion-tracking` | `src/app/(app)/scene/[slug]/use-scene-learning-sync.ts`、`src/lib/server/learning/service.ts` |
| `today-learning-contract` | `src/features/today/`、`src/lib/server/learning/`、`src/app/api/learning/continue/route.ts` |
| `review-*` | `src/app/(app)/review/`、`src/features/review/`、`src/lib/server/review/` |
| `chunks-data-contract` | `src/app/(app)/chunks/`、`src/features/chunks/`、`src/lib/server/phrases/`、`src/lib/server/expression-clusters/` |
| `runtime-cache-coherence` | `src/lib/cache/`、`src/lib/utils/tts-api.ts`、`src/lib/utils/audio-warmup.ts` |
| `audio-playback-orchestration` | `src/features/lesson/`、`src/components/audio/`、`src/lib/utils/tts-api.ts`、`src/lib/utils/audio-warmup.ts` |
| `auth-api-boundaries` / `api-operational-guardrails` | `middleware.ts`、`src/lib/server/request-guard.ts`、`src/lib/server/rate-limit.ts`、`src/lib/server/api-error.ts` |

## 阅读规则

- Fast Track：只读入口规则、相关文件、必要索引和最小测试上下文。
- Cleanup：读删除对象、引用方和影响范围。
- Spec-Driven：先定位，再按 feature-flow、domain-rules、stable spec、system-design、代码递进阅读。
- 历史 archive、旧 proposal、dev-log 只能作为历史参考，不能替代当前 stable spec 和实际代码。

## 必须补读的情况

- 推荐逻辑、状态流转、回写、Session 恢复、Scene 完成判定：必须读对应 feature-flow / domain-rules / stable spec。
- 字段来源、落库、缓存、fallback、组件协作：必须读 system-design。
- 维护流程、测试策略、OpenSpec、发布检查：必须读 `docs/dev/README.md`。

## 禁止

- 未理解链路就修改核心逻辑。
- 把同一规则散落到多个文档。
- 新建重复语义文档。
- 用历史 archive 替代当前 stable spec。
