## 1. Spec 与文档

- [x] 1.1 更新 `learning-loop-overview` spec delta：定义正式 Scene 主 CTA 与阶段入口的层级。
- [x] 1.2 更新 `scene-practice-generation` spec delta：阶段入口不得替代练习页内重新生成题目动作。
- [x] 1.3 更新 `anonymous-trial-mode` spec delta：试用页默认全阶段解锁，练习 / 变体 / TTS 使用固定资产。
- [x] 1.4 更新 `auth-api-boundaries` spec delta：匿名固定资产读取允许，匿名写入和实时生成继续禁止。
- [x] 1.5 同步 `docs/feature-flows/scene-training-flow.md` 与 `docs/feature-map/anonymous-trial.md`。

## 2. 正式 Scene 阶段入口

- [x] 2.1 梳理现有 `handlePracticeToolClick` / `handleRepeatPractice` / `handleVariantToolClick` / `handleRepeatVariants`，抽出阶段入口展示条件。
- [x] 2.2 在正式 Scene 主详情页增加清晰但次级的 `练习` / `变体` 阶段入口。
- [x] 2.3 确认未到达阶段时入口不展示或不可点击，不提前生成。
- [x] 2.4 确认已 generated 时进入对应 view，已 completed 时开启再练一轮。

## 3. 匿名试用全阶段固定体验

- [x] 3.1 为 trial scenes 增加固定 practice / variant fixture 或 manifest。
- [x] 3.2 `/trial/scene/[slug]` 默认展示 `练习` / `变体`，点击直接进入固定本地体验。
- [x] 3.3 匿名练习 / 变体不得调用 AI、practice set、variant run、progress、review 或保存接口。
- [x] 3.4 TTS 继续只走 `/api/anonymous/tts/play`，不得因 miss fallback 到实时生成。

## 4. 弹层与注册阻断

- [x] 4.1 修复详情 sheet 内点击保存 / 加入复习时注册阻断被遮挡的问题。
- [x] 4.2 增加交互测试覆盖阻断弹框高于详情 sheet 或触发前关闭 sheet。

## 5. 验证

- [x] 5.1 正式 Scene 回归：阶段未到达不显示可点击入口；到达练习后保留练习入口；解锁变体后保留变体入口；已完成后可再练。
- [x] 5.2 匿名详情测试：默认显示练习 / 变体；点击进入固定体验；不调用生成 / 写入 API。
- [x] 5.3 匿名 TTS 测试：只读预生成音频，miss 不触发生成。
- [x] 5.4 `pnpm exec openspec validate align-scene-stage-actions-and-trial-assets --strict`。
