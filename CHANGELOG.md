# Changelog

## 2026-04-01

### 测试基线补强与关键入口回归补齐
- 修复了 `review-page-messages` 单元测试的失效预期，恢复默认单元测试命令全绿。
- 为 `middleware` 新增了认证、登录回跳、危险 redirect 拦截和 admin 访问限制测试，并收紧登录页 `redirect` 参数的安全校验，避免 `//host` 形式的协议相对跳转被当作站内地址放行。
- 为 `review due / submit` 与 `learning continue / progress / scene start / pause` 新增入口级 handler 测试，覆盖参数校验、service 透传和错误响应。
- 补充了 `test.md` 中针对关键入口测试的最小回归命令，方便后续维护直接复用。

影响范围：
- `middleware.ts` 认证与重定向规则
- `review` 与 `learning` 高优 API handler 的自动化测试基线
- 单元测试默认回归链路与测试维护说明

验证情况：
- `node --import tsx --test "src/app/(app)/review/review-page-messages.test.ts"`
- `node --import tsx --test middleware.test.ts`
- `node --import tsx --test src/app/api/review/handlers.test.ts`
- `node --import tsx --test src/app/api/learning/handlers.test.ts`
- `pnpm run test:unit`
- 本次未执行 `test:interaction`，因为没有改动页面交互组件或 DOM 行为。

## 2026-03-31

### Review 递进式练习接入第一版正式后端信号
- `review` 最终提交现在会把熟悉度、输出信心和完整输出状态一起带到后端，正式信号先挂到 `phrase_review_logs`，不再只剩 `again / hard / good` 这一层粗粒度结果。
- 服务端 `review summary` 新增当天主动输出和完整输出数量的聚合摘要，`today` 页的回忆任务说明也开始消费这些稳定字段，而不是继续只看待复习数量。
- 新增 `docs/review-practice-signals.md`，专门说明正式字段边界、聚合摘要、历史兼容策略和 `today` / dashboard 的消费规则。

影响范围：
- `review` 提交 API、服务端 review log 和 summary 聚合
- `today` 页 review 任务说明
- review 正式信号维护文档与 SQL 演进脚本

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx"`
- `node --import tsx --test "src/features/today/components/today-page-selectors.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/today/components/today-page-client.test.tsx"`
- `pnpm exec tsc --noEmit`
- `node_modules\\.bin\\openspec.CMD change validate formalize-review-practice-signals --strict --no-interactive`

### Review 页面递进式练习流增强
- `review` 普通表达复习现在不再只是一轮“看参考 -> 打分”，而是改成 `微回忆 -> 熟悉度/输出信心 -> 变体改写 -> 完整输出 -> 结果判断` 的递进式训练流。
- 第一阶段会先隐藏表达本体，让用户只根据语境和释义做微回忆；随后增加“眼熟 / 陌生”“能主动说 / 还需要提示”的判断，用来区分识别记忆和主动输出信心。
- 新增本地 TODO 版的变体改写和完整输出环节，先让用户练习把表达迁移到不同对象/时态，并尝试直接写出整句；正式后端仍沿用现有 `again / hard / good` 提交，不伪造新的学习完成信号。
- 新增 `docs/review-progressive-practice.md`，补齐递进式复习阶段、TODO 边界和失败降级规则的维护说明，并与 `review` 来源文档相互关联。

影响范围：
- `review` 页普通表达复习阶段模型与底部 CTA
- `review` 页交互测试与阶段 selector
- `review` 专项维护文档

验证情况：
- `node --import tsx --test "src/app/(app)/review/review-page-selectors.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx"`
- `pnpm exec tsc --noEmit`
- `node_modules\\.bin\\openspec.CMD change validate review-progressive-practice --strict --no-interactive`

### Review 页面改造成阶段式沉浸复习流
- 参考 `newApphtml/review.html` 重构了 `review` 页面，把原先并排堆叠的普通表达复习和场景回补，收口成单主舞台的三阶段流程：先回忆，再作答，最后给出反馈或进入下一题。
- 新的复习页补上了顶部进度区、今日摘要卡、阶段标签、渐进式参考展开和底部固定 CTA，让普通表达与场景回补使用统一的交互节奏。
- 普通表达复习现在会按 `recall -> practice -> feedback` 推进，并保留本地草稿与明确的 TODO 占位，用来承接后续 AI 反馈能力；场景回补则继续复用现有 `learning-api` 正式记录复现结果与完成信号。
- 同步重写了 `review-page-selectors`、交互测试与 change spec delta，确保来源说明、进度模型、阶段标题、缓存刷新和下一题推进都由稳定映射逻辑驱动。

影响范围：
- `review` 页面 UI、阶段交互和底部 CTA
- 普通表达复习与场景回补在前端的统一编排逻辑
- `review` 页缓存刷新、交互回归测试与 OpenSpec 变更说明

验证情况：
- `node --import tsx --test "src/app/(app)/review/review-page-selectors.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx"`
- `pnpm exec tsc --noEmit`
- `node_modules\\.bin\\openspec.CMD change validate redesign-review-experience --strict --no-interactive`

## 2026-03-31
### Chunks 页面保存链路与数据映射维护
- 为 `chunks` 页面补齐了专门的数据映射维护文档，明确手动新建表达/句子、同类与对照表达生成、Quick Add、expression map、cluster 维护和 review 入口分别会调用哪些前端 API、触发哪些后端写入、产生哪些页面刷新与缓存失效副作用。
- 把 `chunks` 页里重复分散的保存 payload 语义收口到统一 helper，稳定了 `sourceNote`、`relationType`、`relationSourceUserPhraseId` 与 `expressionClusterId` 的拼装规则，减少手动新建、focus assist、生成同类和快速关联之间各自漂移的风险。
- 补强了相关回归测试，直接校验 `similar` 会进入 cluster、`contrast` 不会误并入 cluster，以及 generated similar / quick add 的固定来源语义，方便后续维护时快速发现链路断裂。
- 修复手动新建 `chunk` 时两个底部动作按钮共用同一 loading 展示的问题；现在点击“保存到表达库”时，只会由当前按钮显示保存中，另一按钮保持禁用但不再误显示一起提交。

影响范围：
- `chunks` 页面新建、生成同类/对照表达、快速关联与表达簇维护链路
- `phrases` / `expression clusters` 相关保存语义的前端契约
- `chunks` 专项维护文档与项目学习指引

验证情况：
- `node --import tsx --test "src/app/(app)/chunks/chunks-save-contract.test.ts" "src/app/(app)/chunks/use-manual-expression-composer.test.tsx" "src/app/(app)/chunks/use-focus-assist.test.tsx" "src/app/(app)/chunks/use-generated-similar-sheet.test.tsx"`
- `node_modules\\.bin\\openspec.CMD change validate clarify-chunks-data-contract --strict --no-interactive`

## 2026-03-31
### Today 学习数据映射文档与展示边界梳理
- 为 `today` 页面补齐了专项学习数据映射文档，明确继续学习卡片、今日任务、表达摘要与回忆入口分别依赖哪些后端聚合字段、前端回退规则和展示派生逻辑。
- 收紧 `today` 页内部对学习态的消费边界：继续学习入口来源和有效步骤/进度的解析现在有统一 helper，减少页面和 selector 各自拼接语义导致的漂移。
- 同步补充 `today` selectors 回归测试，并把这份文档挂入项目学习指南，方便后续维护时快速定位数据来源与影响范围。
影响范围：
- `today` 页面继续学习卡片、任务链路与进度解释的维护基线
- learning dashboard 聚合结果在前端的消费边界
- 项目学习/维护文档入口

验证情况：
- `node --import tsx --test "src/features/today/components/today-page-selectors.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/today/components/today-page-client.test.tsx"`
- `node_modules\\.bin\\openspec.CMD change validate clarify-today-learning-mapping --strict --no-interactive`


### Scene / Today 句子练习链路解释收口
- 把 `today` 和 `scene` 对练习阶段的解释统一成同一套口径：进入句子练习、继续整段练习、本轮已完成不再混成同一个“开始练习”状态。
- 场景训练浮层 CTA 会根据当前阶段区分“进入句子练习”和“继续整段练习”，减少用户在场景页里的链路跳变感。
- 句子完成回调改成只在同一句第一次达到 `complete` 里程碑时触发，避免一句被重复计入完成。

影响范围：
- `scene` 训练浮层当前步骤说明与主 CTA
- `today` 继续学习卡片与任务入口文案
- 句子练习完成回调与句子里程碑推进

验证情况：
- `node --import tsx --test "src/app/(app)/scene/[[]slug[]]/scene-detail-selectors.test.ts" "src/features/scene/components/scene-practice-selectors.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/today/components/today-page-selectors.test.ts" "src/features/scene/components/scene-practice-view.interaction.test.tsx" "src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx"`

## 2026-03-31

### Scenes / Scene Detail / Audio 缓存刷新稳定性优化
- 调整 `scenes` 列表与 `scene detail` 的缓存策略：命中新鲜本地缓存时，页面会先展示缓存结果，再继续执行后台网络刷新，不再因为 TTL 未过期就直接停止联网。
- 统一 `/api/scenes/[slug]` 与 `/api/phrases/mine` 的 `Cache-Control: no-store` 语义，并让对应客户端请求显式使用 `cache: "no-store"`，减少浏览器默认缓存与前端自管缓存叠加造成的陈旧状态。
- 为场景学习页补上整段场景循环音频预热，复用现有 TTS 持久缓存链路，并在弱网场景下自动跳过整段音频预热，降低首次整段播放等待。
褰卞搷鑼冨洿锛?- `scenes` 列表与 `scene detail` 的刷新时机
- 场景整段循环音频首播体验
- 用户态列表/详情接口缓存语义
楠岃瘉鎯呭喌锛?- 宸叉墽琛?`node --import tsx --test "src/lib/utils/audio-warmup.test.ts" "src/app/(app)/scene/[[]slug[]]/scene-detail-load-logic.test.ts" "src/app/(app)/scene/[[]slug[]]/scene-detail-load-orchestrator.test.ts"`
- 宸叉墽琛?`node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scenes/page.interaction.test.tsx" "src/app/(app)/scene/[[]slug[]]/use-scene-detail-data.test.tsx"`

本文档用于记录仓库内每次实际改动，方便回看变更范围、验证情况和潜在风险。

记录约定：
- 每次实际改动后都要追加一条记录
- 记录至少包含日期、摘要、影响范围、验证情况
- 如果未完成验证，要明确写出剩余风险

## 2026-03-31

### 前置原则沉淀到维护规范

- 将 `AGENTS.md` 中的三条工作前置原则沉淀进 `openspec/specs/project-maintenance/spec.md`
- 补充稳定要求：实施前评估完整功能链路、评估功能连续性、评估测试影响
- 更新 `docs/openspec-workflow.md`，把三条前置原则并入 OpenSpec 日常流程
- 更新 `docs/project-maintenance-playbook.md` 的改动前后检查清单
- 新增 `docs/change-intake-template.md`，作为非微小改动的通用接入模板
- 为 `openspec/changes/consolidate-detail-composition` 新增 `implementation-intake-template.md`
- 更新 `openspec/changes/consolidate-detail-composition/tasks.md`，把实施前检查模板纳入任务

影响范围：
- 项目维护规范
- OpenSpec 使用流程
- 改动前后检查清单

验证情况：
- 已执行 `pnpm run spec:validate`
- 已执行 `openspec change validate consolidate-detail-composition --strict --no-interactive`

备注：
- 本次为规范层更新，没有引入业务逻辑或交互行为变更

### Lesson 详情底部动作样式收敛

- 在 `src/features/lesson/components/selection-detail-primitives.tsx` 抽出底部 footer action 共享样式：`selectionFooterButtonClassName`、`selectionFooterSecondaryButtonClassName`、`selectionFooterPrimaryButtonClassName`
- 让 `SelectionDetailActions` 的按钮层级与现有详情 footer 动作样式保持一致，减少后续 lesson/chunks 详情页分叉
- 为“加入复习”按钮补充 `RotateCcw` 图标，保证动作识别一致性
- 修复同文件内受编码影响的中文文案异常，统一回到 UTF-8 可维护状态

影响范围：
- lesson 详情页底部动作样式
- `SelectionDetailActions` 视觉一致性
- `selection-detail-primitives.tsx` 文案可维护性

验证情况：
- 已执行 `pnpm run test:interaction -- "src/features/lesson/components/selection-detail-sheet.interaction.test.tsx" "src/features/lesson/components/selection-detail-panel.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- 当前项目脚本会触发整套 interaction 测试，实测 `196` 项通过、`0` 失败

备注：
- 本次未调整底部动作的业务行为，只收敛样式与文案编码，功能链路保持不变

### 场景详情移除不可达的核心句前置步骤

- 将场景详情页里 `practice_sentence` 的主 CTA 从旧的“去练核心句”提示改为直接进入场景练习，不再要求用户先执行已下线的训练条步骤
- 将训练浮层步骤展示从显式的“练核心句”收敛为“开始练习”，保留服务端 `practice_sentence` 状态兼容，但不再把它当成用户侧独立流程
- 统一更新 `scene-detail-messages`、`scene-training-copy`、today continue learning 与今日学习路径文案，避免不同入口继续暴露旧步骤
- 删除已无入口的 `notifySceneSentenceStepHint` 提示逻辑，并补齐相关单测与场景详情页回归测试

影响范围：
- 场景详情页训练浮层 CTA
- 场景训练步骤展示与 continue learning 文案
- today 学习路径与继续学习卡片

验证情况：
- 已执行 `pnpm run test:interaction:scene-detail`
- 已执行 `pnpm run test:unit -- src/lib/shared/scene-training-copy.test.ts src/features/today/components/today-page-selectors.test.ts`
- 由于当前脚本会跑全量 unit 集合，实测 `151` 项通过、`0` 失败
- 已执行 `pnpm run spec:validate`

备注：
- 本次保留后端 `practice_sentence` 状态字段，仅移除用户侧不可达前置步骤，避免影响旧学习记录与服务端兼容性

### 场景详情统计文案去除旧的核心句命名

- 将场景详情训练浮层统计里的“核心句 x 句”改为“已记录练习句数 x 句”，避免用户侧继续看到旧流程术语
- 同步更新相关场景详情回归测试标题，使测试语义与当前产品流程保持一致

影响范围：
- 场景详情训练浮层统计文案
- scene detail 回归测试可维护性

验证情况：
- 已执行 `pnpm run test:interaction:scene-detail`
- 实测 `21` 项通过、`0` 失败

备注：
- 本次仅调整展示层与测试描述，未改动学习状态字段或流程推进逻辑

### 测试命名继续收口旧流程术语

- 将 today continue learning 测试名中的“练核心句”旧表述更新为“已并入练习的旧步骤”
- 让测试描述与当前产品流程保持一致，减少后续排查时被旧命名误导

影响范围：
- today continue learning 单测可读性

验证情况：
- 已执行 `pnpm run test:unit -- src/features/today/components/today-page-selectors.test.ts`
- 由于当前脚本会跑全量 unit 集合，实测 `151` 项通过、`0` 失败

备注：
- 本次仅调整测试命名，不涉及业务逻辑或展示行为变化

### OpenSpec 学习闭环规范同步当前步骤定义

- 重写 `openspec/specs/learning-loop-overview/spec.md` 为干净 UTF-8 版本，避免继续在乱码规范上叠加维护
- 在稳定规范中明确当前用户可见学习步骤应为“听熟这段 -> 看重点表达 -> 开始练习 -> 解锁变体”
- 明确 `practice_sentence` / `sentence_practice` 仅作为内部兼容状态保留，用户侧不得再暴露独立“练核心句”前置步骤

影响范围：
- OpenSpec 稳定规范
- 学习闭环维护基线

验证情况：
- 已执行 `pnpm run spec:validate`

备注：
- 本次仅同步规范定义，不改动业务代码或学习状态字段

### 维护手册同步当前学习链路并修复编码

- 重写 `docs/project-maintenance-playbook.md` 为干净 UTF-8 版本
- 在维护手册中补齐当前稳定学习链路、“练核心句已并入开始练习”的说明、维护重点、测试策略与 OpenSpec 使用入口
- 保持维护手册与当前代码、测试、OpenSpec 主规范的一致性，降低新维护者理解成本

影响范围：
- 项目维护文档
- 新维护者入门路径

验证情况：
- 已执行 `pnpm run spec:validate`

备注：
- 本次仅更新维护文档，不涉及业务逻辑、状态字段或交互行为变化

### OpenSpec 工作流与变更接入模板修复编码

- 重写 `docs/openspec-workflow.md` 为干净 UTF-8 版本，统一记录建 change、validate、archive 和仓库实践约定
- 重写 `docs/change-intake-template.md` 为干净 UTF-8 版本，保留完整链路、功能连续性、测试影响和 OpenSpec 判断四类检查
- 让维护文档入口与当前 OpenSpec 主规范、维护手册保持同一套表述

影响范围：
- OpenSpec 维护文档
- 非微小改动的接入流程

验证情况：
- 已执行 `pnpm run spec:validate`

备注：
- 本次仅更新文档，不涉及业务逻辑、状态字段或交互行为变化

## 2026-03-30

### OpenSpec 初始化与维护规范落地

- 初始化本地 OpenSpec 结构，新增 `openspec/` 与 `.codex/skills/openspec-*`
- 补充 `openspec/config.yaml` 项目上下文，写入技术栈、主链路、测试约定与 changelog 规则
- 新增 OpenSpec 稳定规范：
- `openspec/specs/project-maintenance/spec.md`
- `openspec/specs/learning-loop-overview/spec.md`
- 新增维护文档 `docs/project-maintenance-playbook.md`，梳理项目主逻辑、目录职责、回归点和 OpenSpec 用法
- 更新 `AGENTS.md`，要求每次实际改动后同步维护 `CHANGELOG.md`
- 新增脚本：
- `pnpm run spec:list`
- `pnpm run spec:validate`
- 新建 OpenSpec change：`openspec/changes/unify-detail-footer-actions/`
- 为该 change 补齐 `proposal.md`、`design.md`、`tasks.md` 和 delta spec
- 为 `unify-detail-footer-actions` 补充 `project-maintenance` 的 modified delta
- 在 `README.md` 增加 OpenSpec 维护工作流入口说明
- 新增 `docs/openspec-workflow.md`，补充建 change、delta spec、validate、archive 的完整流程
- 为 `unify-detail-footer-actions` 新增 `archive-checklist.md`
- 在 `docs/project-maintenance-playbook.md` 中补充 archive 前检查入口
- 归档 `unify-detail-footer-actions`，并在主 specs 中新增 `openspec/specs/detail-footer-actions/spec.md`
- 完善 `openspec/specs/detail-footer-actions/spec.md` 的正式 Purpose
- 新建第二条 OpenSpec change：`consolidate-detail-composition`
- 围绕 lesson/chunks 详情组件的共享基元边界与领域差异边界补充 `proposal.md`、`design.md`、`tasks.md` 与 delta specs

影响范围：
- 维护流程
- OpenSpec 使用方式
- 项目文档与团队协作规则

验证情况：
- 已执行 `openspec init --tools codex --force`
- 已执行 `pnpm run spec:list`
- 已执行 `pnpm run spec:validate`
- 已执行 `openspec change validate unify-detail-footer-actions --strict --no-interactive`
- 已执行 `openspec archive unify-detail-footer-actions --yes`
- 已执行 `openspec change validate consolidate-detail-composition --strict --no-interactive`

备注：
- 仓库中已有部分文档存在编码异常；本次新增维护文档均使用 UTF-8 独立落地，后续以新文档为准持续维护
## 2026-03-31

### Review 来源场景跳转降级与维护文档补齐
- `review` 普通表达复习现在会明确区分“有历史来源场景”和“来源场景当前仍可访问”，只有当前用户还能访问该场景时才展示“查看原场景”入口。
- 当一条待复习表达保留了历史 `sourceSceneSlug`，但原场景已经不可访问时，页面会降级为说明提示，不再把用户直接送到“场景不存在”。
- 新增 `docs/review-source-mapping.md`，写清 `review` 普通表达复习与场景回补的后端来源、页面字段关系、原场景跳转规则和维护边界，并在 `docs/project-learning-guide.md` 增加入口。

影响范围：
- `review` 页普通表达卡片与原场景入口展示
- `review` 服务端待复习表达查询
- `review` 维护文档与项目学习讲解文档

验证情况：
- `node --import tsx --test "src/app/(app)/review/review-page-selectors.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx"`
- `pnpm exec tsc --noEmit`
- `node_modules\.bin\openspec.CMD change validate clarify-review-source-contract --strict --no-interactive`

### Scene / Today 服务端句子完成追踪收口
- 场景学习服务端不再把“进入句子练习”近似当成“句子已完成”，而是把 practice run 进入、句子完成和整段练习完成拆成不同信号。
- `today`、continue learning 和 scene 学习态现在统一消费新的句子完成语义，避免页面提示已经推进到整段练习，但服务端仍停留在“只是进过练习”的旧状态。
- 为历史练习记录补上保守兼容：如果旧会话没有显式句子完成计数，会优先从已有 practice attempt 中回填，不会把仅有 `practice_sentence` 的旧记录误升格为句子完成。

影响范围：
- scene practice run / attempt 服务端记录
- `today` / continue learning / scene detail 学习状态消费
- Supabase 学习状态表新增 `completed_sentence_count`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/lib/server/learning/service.logic.test.ts" "src/features/today/components/today-page-selectors.test.ts" "src/features/today/components/today-page-client.test.tsx" "src/app/(app)/scene/[[]slug[]]/scene-detail-selectors.test.ts" "src/app/(app)/scene/[[]slug[]]/use-scene-learning-sync.test.tsx" "src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx"`
- 额外执行 `pnpm exec tsc --noEmit`；发现仓库里仍有与本次改动无关的既有类型问题，未在本次变更中处理：
  - `src/app/(app)/review/page.interaction.test.tsx`
  - `src/app/(app)/scenes/page.interaction.test.tsx`
  - `src/features/lesson/components/selection-detail-panel.tsx`
  - `src/features/lesson/components/selection-detail-sheet.tsx`
# Changelog

## 2026-03-31

### Review 调度开始消费正式训练信号
- `review` 的 due 列表现在不再只按 `next_review_at` 平铺排序；最近一次复习里表现出“低输出信心”“还没完成完整输出”或“仍停留在识别层”的表达，会被更稳定地前置出来，优先回看。
- 提交 `again / hard / good` 后，下一次复习时间不再固定映射成旧的 1/3/7 天，而是会结合正式训练信号做细调：高信心且完成完整输出的条目会拉得更远，仍缺主动输出能力的条目会更快回到队列。
- `review` 页面补上了调度提示文案，能直接解释“为什么这条会优先出现”；同时新增 `docs/review-scheduling-signals.md`，把排序规则、节奏规则和历史空值兼容边界正式写清楚。
影响范围：
- `review` due 列表服务端排序与 `next_review_at` 更新策略
- `review` 页面调度提示展示
- review 调度专项维护文档与项目学习导览

验证情况：
- `node --import tsx --test "src/lib/server/review/service.logic.test.ts" "src/app/(app)/review/review-page-selectors.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx"`
- `pnpm exec tsc --noEmit`
- `node_modules\\.bin\\openspec.CMD change validate adapt-review-scheduling-signals --strict --no-interactive`
