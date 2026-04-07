# Changelog

## 2026-04-07
### 练习页运行态防重与题目来源提示
- 修正了场景练习题目页在点击“重新生成题目”后可能持续重复调用 `practice/run` 的问题；现在同一题集同一题型只会启动一次运行态，不会因为页面重渲染反复打接口。
- scene 练习集新增了生成来源标记，题目页顶部现在会直接展示 `AI生成` 或 `系统生成`，方便区分模型生成结果和本地回退结果。
- 来源场景文案也一起收口，原始场景会显示类似 `来源场景 | 系统生成：...`，变体练习则会保留变体来源并补上生成方式说明。

影响范围：
- `src/features/scene/components/scene-practice-view.tsx`
- `src/features/scene/components/scene-practice-messages.ts`
- `src/features/scene/components/scene-view-labels.ts`
- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
- `src/app/(app)/scene/[slug]/scene-detail-actions.ts`
- `src/lib/utils/practice-generate-api.ts`
- `src/app/api/practice/generate/route.ts`
- `src/lib/types/scene-parser.ts`
- `src/lib/types/learning-flow.ts`

验证情况：
- `node --import tsx --test "src/app/api/practice/generate/route.test.ts" "src/app/(app)/scene/[[]slug[]]/scene-detail-generation-logic.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/scene/components/scene-practice-view.interaction.test.tsx" "src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx"`
- `node --import tsx --test "src/lib/utils/practice-generate-api.test.ts"`
- `pnpm run text:check-mojibake`

## 2026-04-07
### 场景练习生成失败收口与手动重生入口
- scene 练习删除后如果自动预热失败，前端不再继续暴露英文 `Practice generate failed.`；相关错误提示现在统一收口为中文。
- `practice generate` 接口在上游模型请求超时、失败或空响应时，也会优先回退到本地出题，避免重新生成时直接卡死在 500。
- 练习生成请求补上了短时间失败保护；同一场景短时间内连续失败达到阈值后，会直接返回最终中文错误，不再继续打接口。
- 已经生成出来的练习现在支持在练习页菜单里直接“重新生成题目”，不需要先删除练习再退回句子页绕一圈。

影响范围：
- `src/lib/utils/practice-generate-api.ts`
- `src/lib/utils/practice-generate-api.test.ts`
- `src/app/api/practice/generate/route.ts`
- `src/app/api/practice/generate/route.test.ts`
- `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
- `src/app/(app)/scene/[slug]/use-scene-detail-actions.ts`
- `src/app/(app)/scene/[slug]/use-scene-detail-actions.test.tsx`
- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- `src/app/(app)/scene/[slug]/page.regression.test.tsx`
- `src/features/scene/components/scene-practice-view.tsx`
- `src/features/scene/components/scene-practice-view.interaction.test.tsx`
- `src/features/scene/components/scene-view-labels.ts`

验证情况：
- `node --import tsx --test "src/lib/utils/practice-generate-api.test.ts" "src/app/api/practice/generate/route.test.ts"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/scene/components/scene-practice-view.interaction.test.tsx" "src/app/(app)/scene/[[]slug[]]/use-scene-detail-actions.test.tsx" "src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx"`
- `pnpm run text:check-mojibake`

## 2026-04-07
### 场景练习题覆盖率提升
- scene 练习的 `cloze` 模块现在会按场景句子数补足填空覆盖：如果 AI 返回的 `chunk_cloze` 太少，会自动用本地 chunk 挖空补齐，不再让十句左右的场景只剩两道填空。
- 半句复现的最小句长阈值从 6 词放宽到 5 词，模块上限也从 4 题提高到 5 题，让更多中短句能进入第二层训练。
- `practice generate` prompt 现在会明确要求优先产出 `chunk_cloze`，并先覆盖更多不同句子，减少模型一开始就把题量分散到其它题型上。
- fallback 补题现在不再死守“每句只挖第一个 chunk”，而是允许长句在需要时再补一个高价值 chunk，进一步提高填空覆盖。
- fallback 的高价值判断也从纯长度启发式升级成会参考 `grammarLabel / meaningInSentence / usageNote`，优先短语动词、固定搭配、习语这类更值得练的表达。
- 这样即使同一句里存在更长但更泛的片段，fallback 也会更倾向先抽真正该练的表达，不会只按字数抢优先级。
- 同步补齐 OpenSpec 变更工件，并更新 `docs/scene-practice-generation.md`，把新的题量规则和补足逻辑写清楚。

影响范围：
- `src/app/(app)/scene/[slug]/scene-detail-generation-logic.ts`
- `src/app/(app)/scene/[slug]/scene-detail-actions.ts`
- `src/app/(app)/scene/[slug]/scene-detail-generation-logic.test.ts`
- `src/app/(app)/scene/[slug]/scene-detail-actions.test.ts`
- `src/lib/server/prompts/practice-generate-prompt.ts`
- `src/lib/server/prompts/practice-generate-prompt.test.ts`
- `src/lib/server/exercises/spec-builder.ts`
- `src/lib/server/exercises/spec-builder.test.ts`
- `docs/scene-practice-generation.md`
- `openspec/changes/increase-scene-practice-coverage/`

验证情况：
- `node --import tsx --test "src/app/(app)/scene/[[]slug[]]/scene-detail-generation-logic.test.ts" "src/app/(app)/scene/[[]slug[]]/scene-detail-actions.test.ts"`
- `node --import tsx --test "src/lib/server/prompts/practice-generate-prompt.test.ts"`
- `node --import tsx --test "src/lib/server/exercises/spec-builder.test.ts"`
- `pnpm run text:check-mojibake`

## 2026-04-07
### 场景练习出题链路文档补齐
- 新增 `docs/scene-practice-generation.md`，把 scene 练习题从 AI 生成、回退挖空、`chunk_cloze` 收口、半句复现过滤到前端模块解锁的整条链路补成专项维护文档。
- 文档里明确说明了为什么当前会出现“一个句子通常只有一个空、整轮填空偏少、半句复现偏少”的现象，后续要增大题量时该优先改哪几层也一起写清楚了。
- 在 `docs/project-maintenance-playbook.md` 的 `scene/[slug]` 维护入口补挂了这份文档，后续查 scene 练习生成逻辑不用再散着翻文件。

影响范围：
- `docs/scene-practice-generation.md`
- `docs/project-maintenance-playbook.md`

验证情况：
- `pnpm run text:check-mojibake`

## 2026-04-05
### 播放中按钮扩散效果增强
- 公共音频图标里的 `play` 家族播放中状态改成了更明显的扩散波纹，不再只是单独的三角播放图标轻微闪动。
- 循环播放等共用这套公共按钮的入口现在在播放中会出现更清晰的扩散感，状态识别更直接。
- 在此基础上继续加大了扩散半径、层数和发光强度，播放中的动态存在感会更强，不容易看起来像普通 hover。
- 进一步把播放态动画拆成“低位接近背景、高潮才明显抬亮”的节奏，低和高之间的对比会更清楚，不会一直维持偏亮的扩散。
- 又把低位透明度和中段亮度继续压低了一档，让播放中大部分时间更贴近背景，只在高位瞬间明显亮起来。

影响范围：
- `src/components/audio/audio-state-icon.tsx`
- `src/app/globals.css`
- `src/components/audio/loop-action-button.test.tsx`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/components/audio/loop-action-button.test.tsx" "src/components/audio/tts-action-button.test.tsx"`
- `pnpm run text:check-mojibake`
## 2026-04-03
### 对话气泡播放按钮尺寸与底色统一
- 对话气泡和移动端分组气泡下方的播放按钮已经放大到与翻译按钮一致的点击区和图标尺寸，动作区不再出现一大一小的割裂感。
- 公共音频按钮新增了可复用的表面样式能力；句子气泡下方的播放按钮这次最终收口为无边框、贴合当前背景层的做法，不再单独顶着突兀的白底或描边。
- selection detail 里的主句朗读按钮和相关短语朗读按钮也已经并入统一公共按钮组件，详情面板与详情弹层不再继续保留那套独立音频按钮封装。
- `sentence block` 和非对话 `lesson reader` 里的纯 icon 朗读按钮也已升级到统一尺寸和软表面规格，不再继续混用更小一档的旧按钮层级。
- `chunks` 的例句卡片和 detail 顶部纯 icon 朗读按钮也已去掉独立描边和凸起底板，统一到贴合当前背景层的样式方向。
- `chunks list` 来源句朗读、`selection toolbar` 朗读，以及 `lesson-reader` 头部 / 卡片里的纯 icon 音频按钮也都继续收口到同一套无边框、贴背景层的规则。
- 保持朗读、停止朗读、加载中这些状态语义不变，只收口视觉规格和表面色，并补上对应样式回归测试。

影响范围：
- `src/components/audio/tts-action-button.tsx`
- `src/components/audio/loop-action-button.tsx`
- `src/components/audio/tts-action-button.test.tsx`
- `src/features/lesson/components/lesson-reader-dialogue-content.tsx`
- `src/features/lesson/components/lesson-reader-mobile-sections.tsx`
- `src/features/lesson/components/selection-detail-primitives.tsx`
- `src/features/lesson/components/selection-detail-panel.tsx`
- `src/features/lesson/components/selection-detail-sheet.tsx`
- `src/features/lesson/components/sentence-block.tsx`
- `src/features/lesson/components/lesson-reader.tsx`
- `src/components/shared/example-sentence-cards.tsx`
- `src/features/chunks/components/focus-detail-content.tsx`
- `src/app/(app)/chunks/chunks-list-view.tsx`
- `src/features/lesson/components/selection-toolbar.tsx`
- `openspec/changes/tune-audio-button-size-and-surface/tasks.md`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/components/audio/tts-action-button.test.tsx" "src/components/audio/loop-action-button.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/lesson/components/selection-detail-panel.interaction.test.tsx" "src/features/lesson/components/selection-detail-sheet.interaction.test.tsx" "src/features/chunks/components/example-sentence-cards.test.tsx"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/lesson/components/sentence-block.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/chunks/components/example-sentence-cards.test.tsx" "src/features/chunks/components/focus-detail-content.interaction.test.tsx" "src/app/(app)/chunks/chunks-list-view.interaction.test.tsx"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/chunks-list-view.interaction.test.tsx" "src/features/lesson/components/selection-toolbar.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "tune-audio-button-size-and-surface" --strict --no-interactive`

## 2026-04-02
### 详情区播放按钮并入统一状态组件
- 修正了共享 `tts` 图标的画布和波纹路径，避免播放中状态最右侧波纹在小尺寸按钮里显得被裁掉。
- 将句子详情、chunk 详情和例句卡片使用的播放按钮接入统一的 `AudioStateIcon`，不再保留详情区那套旧版 `Volume2` 样式。
- 这样正文、气泡、详情区和例句卡片现在共用同一套默认 / 播放中 / 暂停 / 加载中的状态语言。

影响范围：
- `src/components/audio/audio-state-icon.tsx`
- `src/features/lesson/components/selection-detail-primitives.tsx`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/components/audio/tts-action-button.test.tsx" "src/components/audio/loop-action-button.test.tsx" "src/features/lesson/components/selection-detail-panel.interaction.test.tsx" "src/features/lesson/components/selection-detail-sheet.interaction.test.tsx" "src/features/chunks/components/example-sentence-cards.test.tsx"`
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "unify-all-audio-button-variants" --strict --no-interactive`

### 公共播放按钮状态视觉统一
- 参考 `newApphtml/palyerIcon.html`，为公共音频按钮补上统一的默认、播放中、暂停和加载中状态图标能力，避免 `TtsActionButton` 与 `LoopActionButton` 继续各自维护不同的状态语言。
- 播放按钮默认态统一为项目常用中性色，播放中、暂停和加载中统一收口到项目主色，状态反馈不再依赖零散的局部样式。
- 新增公共按钮测试，并回归 `lesson-reader` 与 `sentence-block` 的朗读入口，确保状态视觉升级不影响现有交互。

影响范围：
- `src/components/audio/audio-state-icon.tsx`
- `src/components/audio/tts-action-button.tsx`
- `src/components/audio/loop-action-button.tsx`
- `src/components/audio/tts-action-button.test.tsx`
- `src/components/audio/loop-action-button.test.tsx`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/components/audio/tts-action-button.test.tsx" "src/components/audio/loop-action-button.test.tsx" "src/features/lesson/components/sentence-block.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "unify-audio-button-states" --strict --no-interactive`

### README 补充后台预览访问地址说明
- 在 `README.md` 的本地运行建议里补充说明：`pnpm run preview:up` 成功启动后，默认也通过 `http://localhost:3000/` 访问。
- 保持脚本行为不变，只让后台预览的访问方式写得更直白。

影响范围：
- `README.md`

验证情况：
- 已人工复核 README 文案

### 对话气泡操作区按钮间距再次收紧
- 在上一轮基础上继续收紧了对话气泡与移动端分组气泡下方翻译图标和播放按钮之间的距离，让两个按钮更贴近。
- 不改变按钮顺序、翻译显隐和朗读交互，只进一步压缩视觉留白。

影响范围：
- `src/features/lesson/components/lesson-reader-dialogue-content.tsx`
- `src/features/lesson/components/lesson-reader-mobile-sections.tsx`

验证情况：
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "tighten-dialogue-action-button-gap-again" --strict --no-interactive`

### 对话气泡操作区按钮间距收紧
- 收紧了对话气泡与移动端分组气泡下方操作区的翻译图标和播放按钮间距，让两个按钮更靠近、更紧凑。
- 不改变按钮顺序、翻译默认隐藏行为和朗读交互，只调整视觉留白。

影响范围：
- `src/features/lesson/components/lesson-reader-dialogue-content.tsx`
- `src/features/lesson/components/lesson-reader-mobile-sections.tsx`

验证情况：
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "tighten-dialogue-action-button-gap" --strict --no-interactive`

### 对话气泡下方翻译入口改到真实操作区
- 回退了误加在 `sentence-block` 里的图标化翻译按钮，避免未接入实际页面的通用句子块继续带着错误范围的改动。
- `lesson reader` 对话气泡和移动端分组气泡现在改为默认隐藏翻译，只在气泡下方按钮区提供翻译图标，位置固定在播放按钮左边。
- 同步更新 `lesson-reader` 与 `sentence-block` 交互测试，锁住“图标只出现在真实气泡操作区、翻译默认隐藏、朗读按钮仍不误触详情”这条行为。

影响范围：
- `src/features/lesson/components/sentence-block.tsx`
- `src/features/lesson/components/sentence-block.interaction.test.tsx`
- `src/features/lesson/components/lesson-reader-dialogue-content.tsx`
- `src/features/lesson/components/lesson-reader-mobile-sections.tsx`
- `src/features/lesson/components/lesson-reader.interaction.test.tsx`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/lesson/components/sentence-block.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "move-translation-toggle-to-dialogue-actions" --strict --no-interactive`

### 句子页翻译入口收口为纯图标
- 句子块里的翻译切换继续默认隐藏，但按钮不再显示“翻译 / 收起”文字，只保留翻译图标，减少正文旁边的视觉干扰。
- 翻译按钮现在与朗读按钮并排展示，且固定放在播放按钮左边，让句子级操作入口更集中。
- 同步更新 `sentence-block` 交互测试，锁住“默认隐藏翻译、点图标展开/收起、朗读按钮仍可正常使用”这条行为。

影响范围：
- `src/features/lesson/components/sentence-block.tsx`
- `src/features/lesson/components/sentence-block.interaction.test.tsx`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/lesson/components/sentence-block.interaction.test.tsx"`
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "adjust-sentence-translation-toggle" --strict --no-interactive`

### 本地运行脚本补齐 preview / dev 双模式
- 为 `package.json` 补齐 `dev:turbo`、`preview`、`preview:build` 和 `preview:start`，让本地工作流更适合“默认不开服务，按需查看结果”的 Codex 开发方式。
- `preview` 现在直接串起 `next build + next start`，适合只看结果、不需要热更新时使用，避免长期挂着 `next dev` 占用较高内存。
- 在 `README.md` 中新增本地运行建议，明确推荐“平时不开服务、看结果用 preview、需要 HMR 再开 dev”的习惯。
- 进一步补齐 `preview:up / preview:down / preview:restart / preview:status`，支持把生产预览服务一键后台启动、查询状态和关闭，减少需要看页面时的手工操作成本。
- 将 `README.md` 全量改写为中文说明，保留命令、接口、路径与英文术语，降低本地维护和交接阅读门槛。
- 根据当前本机实际使用情况，移除了前台 `preview / preview:build / preview:start` 这套入口，只保留后台 `preview:up / down / restart / status` 作为统一预览方案，避免两套脚本并存造成误用。

影响范围：
- `package.json`
- `README.md`
- `scripts/manage-preview-server.mjs`

验证情况：
- 已通过脚本存在性检查与乱码检查确认

### Scene 进入空白修复与骨架屏补齐
- `scene/[slug]` 路由的 loading 不再返回空白，进入场景时会先展示与场景详情结构接近的骨架屏，减少从 `chunks`、`scenes` 等入口跳转时那段明显的白屏感。
- 场景详情页内部在首屏数据尚未回填时，也从单行 spinner 改成结构化 skeleton，保证路由等待和页内加载两个阶段的反馈一致。
- `chunks` 页的“进入场景”现在会像 `scenes` 页一样先触发路由预取和场景详情预热，再执行跳转，进一步缩短缓存未命中时的首屏等待。
- 补充 `scene detail` 与 `chunks` 的回归测试，锁住“首屏先出骨架”和“入口点击会触发预热”两类行为。

影响范围：
- `src/app/(app)/scene/[slug]/loading.tsx`
- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- `src/features/scene/components/scene-detail-skeleton.tsx`
- `src/app/(app)/scene/[slug]/loading.test.tsx`
- `src/app/(app)/scene/[slug]/page.regression.test.tsx`
- `src/app/(app)/chunks/page.tsx`
- `src/app/(app)/chunks/page.interaction.test.tsx`
- `openspec/changes/fix-scene-entry-skeleton/tasks.md`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[[]slug[]]/loading.test.tsx" "src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/page.interaction.test.tsx"`
- `node_modules\.bin\openspec.CMD change validate "fix-scene-entry-skeleton" --strict --no-interactive`
- `node --import tsx scripts/check-mojibake.ts`

### PullToRefresh 被动监听告警修复
- `PullToRefresh` 改为通过原生触摸监听处理 `touchstart / touchmove / touchend / touchcancel`，并显式把 `touchmove` 注册为 `passive: false`，避免浏览器继续报出 `Unable to preventDefault inside passive event listener invocation.`。
- 保持现有下拉刷新启用页面、触发阈值与 `app:pull-refresh` 事件契约不变，只修复触摸移动阶段阻止默认滚动的监听语义。
- 补充 `pull-to-refresh` 回归测试，直接锁住“存在非被动 `touchmove` 监听”和“尾斜杠路径仍会标准化派发刷新事件”两条行为。

影响范围：
- `src/components/layout/pull-to-refresh.tsx`
- `src/components/layout/pull-to-refresh.test.tsx`
- `openspec/changes/fix-pull-refresh-passive-listener/tasks.md`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/components/layout/pull-to-refresh.test.tsx"`
- `pnpm exec tsc --noEmit --pretty false`
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "fix-pull-refresh-passive-listener" --strict --no-interactive`

### Review / Scenes 页面第一轮拆分收口
- 将 `review/page.tsx` 的数据加载与下拉刷新控制提取到 `use-review-page-data.ts`，并把摘要卡与主阶段内容拆到 `review-page-summary-cards.tsx`、`review-page-stage-panel.tsx`，让页面主文件回到“组装 + 页面级状态”边界。
- 将 `scenes/page.tsx` 的列表数据、进入前预热、顶部任务态与删除链路提取到 `use-scenes-page-data.ts`，并把滑动删除控制、导入弹窗、删除确认分别拆到 `use-scene-swipe-actions.ts`、`scene-import-dialog.tsx`、`scene-delete-dialog.tsx`。
- 修正了 `review` 页面阶段重置策略：不再用依赖 active task key 的 effect 直接回压阶段，而是只在复习队列真正换项或刷新完成时显式重置，避免 `微回忆 -> 熟悉度 -> 改写 -> 输出 -> feedback` 链路被误打回首步。
- 更新 `docs/project-maintenance-playbook.md` 与 OpenSpec tasks，补充 review/scenes 这类高状态密度页面的第一轮拆分优先级与回归要求。

影响范围：
- `src/app/(app)/review/page.tsx`
- `src/app/(app)/review/use-review-page-data.ts`
- `src/app/(app)/review/review-page-summary-cards.tsx`
- `src/app/(app)/review/review-page-stage-panel.tsx`
- `src/app/(app)/scenes/page.tsx`
- `src/app/(app)/scenes/use-scenes-page-data.ts`
- `src/app/(app)/scenes/use-scene-swipe-actions.ts`
- `src/app/(app)/scenes/scene-import-dialog.tsx`
- `src/app/(app)/scenes/scene-delete-dialog.tsx`
- `docs/project-maintenance-playbook.md`
- `openspec/changes/decompose-review-and-scenes-pages/tasks.md`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/review/page.interaction.test.tsx" "src/app/(app)/scenes/page.interaction.test.tsx"`
- `pnpm exec tsc --noEmit --pretty false`
- `node_modules\.bin\openspec.CMD change validate "decompose-review-and-scenes-pages" --strict --no-interactive`

### 重组件第一轮拆分治理
- 将 `scene-detail-page` 中的训练浮层入口抽到独立模块 `scene-training-coach-floating-entry.tsx`，把拖拽 / 展开 / 步骤面板相关交互从页面主文件中拆出，降低主学习页的组装复杂度。
- 将 `lesson-reader` 中的播放编排提取为 `use-lesson-reader-playback.ts`，统一承接 TTS controller、预热调度和句子 / chunk / scene loop 播放动作，让阅读器主组件更聚焦视图与学习交互。
- 将 `chunks/page.tsx` 中的 quick add 关联表达 sheet 装配提取为 `chunks-quick-add-related-sheet.tsx`，减少页面里内联 sheet 结构继续膨胀。
- 更新 `docs/component-library.md` 与 `docs/project-maintenance-playbook.md`，明确“重业务容器优先做 feature 内部拆分，再判断是否值得公共化”的治理规则。

影响范围：
- `src/app/(app)/scene/[slug]/scene-detail-page.tsx`
- `src/app/(app)/scene/[slug]/scene-training-coach-floating-entry.tsx`
- `src/app/(app)/scene/[slug]/scene-training-coach-floating-entry.test.tsx`
- `src/features/lesson/components/lesson-reader.tsx`
- `src/features/lesson/audio/use-lesson-reader-playback.ts`
- `src/app/(app)/chunks/page.tsx`
- `src/app/(app)/chunks/chunks-quick-add-related-sheet.tsx`
- `src/app/(app)/chunks/chunks-quick-add-related-sheet.test.tsx`
- `docs/component-library.md`
- `docs/project-maintenance-playbook.md`
- `openspec/changes/decompose-heavy-feature-components/tasks.md`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scene/[[]slug[]]/scene-training-coach-floating-entry.test.tsx" "src/app/(app)/scene/[[]slug[]]/page.regression.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx" "src/app/(app)/chunks/chunks-quick-add-related-sheet.test.tsx" "src/app/(app)/chunks/page.interaction.test.tsx"`
- `pnpm exec tsc --noEmit --pretty false`
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "decompose-heavy-feature-components" --strict --no-interactive`

### 跨 feature 组件公共化与组件库说明补充
- 将已被 `chunks` 与 `lesson` 共用的 `detail-info-blocks`、`example-sentence-cards` 迁移到 `src/components/shared`，清理 `lesson` 直接依赖 `chunks` 组件目录的横向耦合。
- 新增 `docs/component-library.md`，明确 `ui / shared / audio / features / 页面层` 的组件分层规则、当前审计结果和“不该抽公共”的反例。
- 更新 `docs/project-maintenance-playbook.md`，把组件分层与公共化判断纳入固定维护入口，后续新增组件可以直接按文档判断归属。

影响范围：
- `src/components/shared/detail-info-blocks.tsx`
- `src/components/shared/example-sentence-cards.tsx`
- `src/features/lesson/components/selection-detail-primitives.tsx`
- `src/features/chunks/components/focus-detail-content.tsx`
- `src/app/(app)/chunks/page.tsx`
- `docs/component-library.md`
- `docs/project-maintenance-playbook.md`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/chunks/components/example-sentence-cards.test.tsx" "src/features/chunks/components/focus-detail-content.interaction.test.tsx" "src/features/lesson/components/selection-detail-panel.interaction.test.tsx" "src/features/lesson/components/selection-detail-sheet.interaction.test.tsx" "src/app/(app)/chunks/page.interaction.test.tsx"`
- `pnpm exec tsc --noEmit --pretty false`
- `node --import tsx scripts/check-mojibake.ts`
- `node_modules\.bin\openspec.CMD change validate "rationalize-shared-components" --strict --no-interactive`

## 2026-04-01
### 音频链路维护文档补充
- 新增 `docs/audio-tts-pipeline.md`，整理当前 TTS 生成、Storage 复用、浏览器缓存、预热调度、播放 fallback 和重生成链路。
- 在 `docs/project-maintenance-playbook.md` 中补挂音频 / TTS 维护入口，后续维护者可以直接定位这套链路的关键文件与回归点。

影响范围：
- 音频生成、缓存、预热与播放维护文档

验证情况：
- 已人工对照 `src/lib/server/tts/*`、`src/lib/utils/tts-api.ts`、`src/lib/utils/audio-warmup.ts` 与 scene/chunks/today 调用入口整理文档

### TTS 浏览器缓存治理与预热去重收口
- 为 `tts-api.ts` 增加浏览器端 TTS 缓存治理：内存 URL 缓存、预加载 URL 集合、Blob URL 复用表和 Cache Storage 现在都有明确上限，并在超限后按最旧条目优先裁剪。
- lesson 级音频预热 key 收口到共享 builder，`scene detail`、`scene prefetch`、`today continue learning` 等等价入口不再因为各自拼 key 而重复调度。
- 补充 `resource-actions.test.ts` 以及 `tts-api.test.ts` 的缓存逐出回归，锁住“超限后保留最新写入”和“同 key 预热去重”两类行为。
- 更新 `docs/audio-tts-pipeline.md`，同步新的缓存上限、自动裁剪和预热 key 规则。

影响范围：
- `src/lib/utils/tts-api.ts`
- `src/lib/utils/resource-actions.ts`
- `src/lib/utils/scene-resource-actions.ts`
- `src/lib/cache/scene-prefetch.ts`
- `src/app/(app)/scene/[slug]/scene-detail-load-orchestrator.ts`
- `src/app/(app)/scene/[slug]/use-scene-detail-playback.ts`
- `docs/audio-tts-pipeline.md`

验证情况：
- `node --import tsx --test "src/lib/utils/tts-api.test.ts" "src/lib/utils/audio-warmup.test.ts" "src/lib/utils/resource-actions.test.ts"`
- `node --import tsx --test "src/lib/cache/scene-prefetch.test.ts" "src/lib/utils/scene-resource-actions.test.ts"`
- `node --import tsx --test "src/app/(app)/scene/[[]slug[]]/scene-detail-load-orchestrator.test.ts"`

### 提交信息规范补充
- 在仓库规则中新增 Git 提交信息约束：提交前缀继续沿用 `feat:`、`fix:`、`test:` 等 Conventional Commits 形式，但冒号后的摘要必须使用中文，不再接受英文摘要提交。

影响范围：
- 仓库级协作与提交规范

验证情况：
- 已更新 `AGENTS.md` 规则条目

### 接口边界与高成本请求收口
- `/api/tts/regenerate` 现在只允许管理员触发，并会拒绝空批量或超出上限的重生成请求，避免普通用户滥用高成本音频重建能力。
- `explain-selection` 与 `practice/generate` 现在会在入口提前拒绝超长文本和超大场景载荷，减少异常请求直接放大成模型成本和长耗时。
- `/api/me` 读取当前用户资料时改为复用单次身份识别结果，减少同一请求内可避免的重复认证查询。
- 未知服务端错误现在会统一收敛为通用失败响应，不再把内部错误文本直接暴露给客户端。
影响范围：
- `/api/tts/regenerate`
- `/api/explain-selection`
- `/api/practice/generate`
- `/api/me`
- 通用 API 错误收敛与参数校验

验证情况：
- `node --import tsx --test src/lib/server/validation.test.ts src/lib/server/api-error.test.ts src/app/api/me/route.test.ts src/app/api/explain-selection/route.test.ts src/app/api/practice/generate/route.test.ts src/app/api/tts/regenerate/route.test.ts`
- `pnpm exec tsc --noEmit` 仍存在仓库内既有类型错误：`middleware.ts`、`src/app/(auth)/login/page.tsx`、`src/app/(auth)/signup/page.tsx`、`src/lib/shared/auth-redirect.ts`

### 登录重定向与高成本接口安全边界收紧
- 统一了 `login`、`signup` 和 `middleware` 的站内重定向校验规则，危险的 `//host` 与跨站地址不再被当作有效回跳目标。
- 将 `explain-selection`、`practice/generate`、`scene/mutate`、`scene/parse` 等高成本接口收紧为显式受保护入口，未登录请求会在进入模型或重型解析前被拒绝。
- 为 GLM 与 OpenAI 的服务端调用补充了超时、空响应防御和统一错误收敛，避免上游异常长期占用请求链路。
- 优化 `/api/me` 的热路径读取，复用同一请求内已获取的用户身份，减少重复认证/资料查询。
- 补充了重定向 helper、`middleware`、`/api/me`、高成本 route handler 以及模型客户端的直接自动化测试。

影响范围：
- `login` / `signup` 登录后回跳
- `middleware` API 访问边界
- `explain-selection`、`practice/generate`、`scene/mutate`、`scene/parse`
- `/api/me`
- GLM / OpenAI 上游调用失败保护

验证情况：
- `node --import tsx --test middleware.test.ts src/lib/shared/auth-redirect.test.ts src/app/api/me/route.test.ts src/app/api/explain-selection/route.test.ts src/app/api/practice/generate/route.test.ts src/app/api/scene/mutate/route.test.ts src/app/api/scene/parse/handlers.test.ts src/lib/server/glm-client.test.ts src/lib/explain/providers/openai.test.ts`
- `pnpm run test:unit`

## 2026-04-01

### OpenSpec 维护规范文档编码修复
- 修复了 `openspec/specs/project-maintenance/spec.md` 的乱码问题，恢复为可读的 UTF-8 中文维护规范。
- 保留了此前同步进主 spec 的测试基线要求，没有改动规则含义，只修正文档编码与可读性。

影响范围：
- `openspec/specs/project-maintenance/spec.md`
- OpenSpec 维护规范的阅读与后续编辑体验

验证情况：
- `pnpm run spec:validate`

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
- 影响范围：`scenes` 列表与 `scene detail` 的刷新时机
- 场景整段循环音频首播体验
- 用户态列表/详情接口缓存语义
- 验证情况：已执行 `node --import tsx --test "src/lib/utils/audio-warmup.test.ts" "src/app/(app)/scene/[[]slug[]]/scene-detail-load-logic.test.ts" "src/app/(app)/scene/[[]slug[]]/scene-detail-load-orchestrator.test.ts"`
- 已执行 `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/scenes/page.interaction.test.tsx" "src/app/(app)/scene/[[]slug[]]/use-scene-detail-data.test.tsx"`

本文档用于记录仓库内每次实际改动，方便回看变更范围、验证情况和潜在风险。

## 2026-04-01

### 中文编码治理补充收尾
- 清理 `src/lib/server/phrases/service.ts` 中残留的中文默认文案乱码，避免表达说明回退文案继续产出脏文本。
- 修复 `CHANGELOG.md` 历史条目中的两处乱码标题，统一“影响范围 / 验证情况”的可读性。
- 补写归档变更 `stabilize-test-baseline` 的 `project-maintenance` spec，清除历史归档文档中的中文乱码残留。
- 扩大后的 `pnpm run text:check-mojibake` 继续作为提交前 UTF-8 自检入口，当前仓库无高置信度乱码告警。
- 影响范围：中文默认文案、历史变更记录、归档 OpenSpec 文档可读性
- 验证情况：已执行 `node --import tsx scripts/check-mojibake.ts`

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

## 2026-04-01

### Chunks 删除表达后端补位测试与详情回退文档补强
- 修复了 `focus-detail-sheet-view-model` 及其单测中的 UTF-8 乱码，恢复删除确认与补全文案的可读性。
- 为删除表达链路新增后端纯逻辑测试，明确“删主表达会补位新主表达、删空簇会返回 `clusterDeleted = true`”两条规则，避免后端补位语义只散落在 service 分支里。
- 补齐 `DELETE /api/phrases/[userPhraseId]` handler 的成功、校验失败、未登录和未知异常测试，确保删除接口返回契约和错误收口稳定。
- 在 `add-chunks-expression-deletion` 的设计文档中追加了“删主表达补位、删空簇关闭详情”的明确说明，降低前后端各自猜测回退行为的风险。

影响范围：
- `src/features/chunks/components/focus-detail-sheet-view-model.ts`
- `src/features/chunks/components/focus-detail-sheet-view-model.test.ts`
- `src/lib/server/phrases/service.ts`
- `src/lib/server/phrases/logic.ts`
- `src/lib/server/phrases/logic.test.ts`
- `src/app/api/phrases/handlers.test.ts`
- `openspec/changes/add-chunks-expression-deletion/design.md`
- `openspec/changes/add-chunks-expression-deletion/tasks.md`

验证情况：
- 计划执行 `node --import tsx --test src/lib/server/phrases/logic.test.ts src/app/api/phrases/handlers.test.ts src/features/chunks/components/focus-detail-sheet-view-model.test.ts`
- 若仓库内仍存在与本次无关的既有问题，会在结果里单独注明。
补充验证：
- 已补上 `chunks` 页面删除成功回退逻辑测试，覆盖“删空簇关闭详情”和“删主表达切到后端补位主表达”。
- 已执行 `node --import tsx --test "src/app/(app)/chunks/chunks-page-logic.test.ts" "src/app/api/phrases/handlers.test.ts" "src/lib/server/phrases/logic.test.ts" "src/features/chunks/components/focus-detail-sheet-view-model.test.ts"`

补充维护：
- 修复了 `openspec/changes/add-chunks-expression-deletion/tasks.md` 的 UTF-8 乱码，恢复实现任务清单可读性。
- 修复了 `src/app/(app)/chunks/use-expression-cluster-actions.test.tsx` 的乱码中文，并补充删除成功回调 hook 测试，明确校验删除返回值与刷新后列表会透传给页面回退层。
- 重写了 `openspec/changes/add-chunks-expression-deletion/design.md`，恢复删除契约设计文档的 UTF-8 可读性，并对齐当前已经落地的补位、关详情与回退测试规则。
- 修正了 `chunks` 页面删除成功回调的接线，确保页面层真实消费后端返回的 `clusterDeleted / nextFocusUserPhraseId / nextMainUserPhraseId`，而不是在接线处丢失这些回退信息。
- 重写了 `openspec/changes/add-chunks-expression-deletion/proposal.md` 与 `specs/chunks-data-contract/spec.md`，把这条 change 的提案与 delta spec 一并恢复成可读 UTF-8，并与当前实现保持一致。
- 新增了仓库级“编码与乱码处理硬规则”，明确禁止用裸 `Get-Content` 的终端显示结果判断中文文件是否乱码；中文文件必须显式按 UTF-8 读取并在判定前复读验证。
- 升级 `scripts/check-mojibake.ts`，把扫描范围扩展到 `docs/`、`openspec/` 和根目录规则文档，同时排除归档目录与示例噪声，避免把历史脏数据或说明性文案误报成当前问题。

### TTS 播放编排层公共化
- 新增 `src/hooks/use-tts-playback-controller.ts`，把 chunk / sentence / scene loop 的播放切换、再次点按停止、loop 状态清理、错误兜底和常见激活态判断收敛成统一公共层。
- `lesson-reader`、`scene detail` 和 `chunks` 页面现在都改为通过这层公共控制器触发 TTS 播放，页面只保留业务 payload、预热、副作用和提示文案，不再各自维护近似的播放状态机。
- 补充了公共播放控制器测试，并新增 `scene detail` 的“再次点按当前 chunk 会停止播放”回归，文档 `docs/audio-tts-pipeline.md` 也同步记录了新的职责边界与接入点。

影响范围：
- `src/hooks/use-tts-playback-controller.ts`
- `src/features/lesson/components/lesson-reader.tsx`
- `src/app/(app)/scene/[slug]/use-scene-detail-playback.ts`
- `src/app/(app)/chunks/page.tsx`
- `src/hooks/use-tts-playback-controller.test.tsx`
- `src/app/(app)/scene/[slug]/use-scene-detail-playback.test.tsx`
- `docs/audio-tts-pipeline.md`
- `openspec/changes/consolidate-audio-playback/tasks.md`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/hooks/use-tts-playback-controller.test.tsx" "src/app/(app)/scene/[[]slug[]]/use-scene-detail-playback.test.tsx" "src/app/(app)/chunks/page.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `node --import tsx scripts/check-mojibake.ts`
- 额外执行 `pnpm exec tsc --noEmit --pretty false`；仓库中仍存在与本次改动无关的既有类型问题，未在本次变更中处理：
  - `middleware.ts`
  - `src/app/(app)/chunks/use-expression-cluster-actions.ts`
  - `src/app/(auth)/login/page.tsx`
  - `src/app/(auth)/signup/page.tsx`
  - `src/lib/server/phrases/service.ts`
  - `src/lib/shared/auth-redirect.ts`

### 音频按钮与句子翻译入口统一
- `TtsActionButton` 与 `LoopActionButton` 现在默认统一为纯 icon 展示，正文不再直接显示“朗读 / 播放 / 循环播放”，状态语义继续保留在 `aria-label`。
- 句子详情卡片、面板和 sheet 现在直接展示中文翻译，不再额外保留“翻译/收起”按钮；主播放按钮统一放到句子右侧，并与下方其它播放入口保持一致位置语言。
- `lesson-reader` 里的对话块、移动端分组和桌面段落阅读也去掉了额外翻译按钮，改为直接展示中文；只有句子正文层继续保留句子下方的翻译按钮。

影响范围：
- `src/components/audio/tts-action-button.tsx`
- `src/components/audio/loop-action-button.tsx`
- `src/features/lesson/components/sentence-block.tsx`
- `src/features/lesson/components/selection-detail-primitives.tsx`
- `src/features/lesson/components/selection-detail-panel.tsx`
- `src/features/lesson/components/selection-detail-sheet.tsx`
- `src/features/lesson/components/lesson-reader.tsx`
- `docs/audio-tts-pipeline.md`
- `openspec/changes/unify-audio-icon-buttons/tasks.md`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/lesson/components/sentence-block.interaction.test.tsx" "src/features/lesson/components/selection-detail-panel.interaction.test.tsx" "src/features/lesson/components/selection-detail-sheet.interaction.test.tsx" "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/lesson/components/selection-toolbar.interaction.test.tsx" "src/app/(app)/chunks/chunks-list-view.interaction.test.tsx" "src/features/chunks/components/example-sentence-cards.test.tsx" "src/features/chunks/components/focus-detail-content.interaction.test.tsx"`

### Auth Redirect 类型修复
- 收紧了 `src/lib/shared/auth-redirect.ts` 的类型签名：`isSafeRedirectTarget` 现在是类型谓词，`resolveSafeRedirectTarget` 明确返回 `string`，避免安全跳转目标在 `middleware` 和认证页面里继续被识别成 `string | null | undefined`。
- 这次修复直接解除 `middleware.ts` 里 `new URL(safeTarget, request.url)` 的构建类型错误，登录页带 `redirect` 参数的安全跳转链路也一起受益。

影响范围：
- `src/lib/shared/auth-redirect.ts`
- `middleware.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`

验证情况：
- `node --import tsx --test "src/lib/shared/auth-redirect.test.ts" "middleware.test.ts"`
- 额外执行 `pnpm exec tsc --noEmit --pretty false`；当时仓库里仍剩两处与本次修复无关的既有类型问题，已在后续维护中补齐。

### 类型收口补齐
- 修正了 `src/app/(app)/chunks/use-expression-cluster-actions.ts` 中删除表达依赖的空值兜底写法，避免 `deleteUserPhraseFromApi` 被 TypeScript 继续识别为可能缺失。
- 修正了 `src/lib/server/phrases/service.ts` 中“删除主表达后补位主表达”的空值收口，在写 cluster membership 前显式守卫 `nextMainUserPhraseId`，让删除补位逻辑和类型约束保持一致。
- 这次补齐后，仓库当前 `pnpm exec tsc --noEmit --pretty false` 已通过。

影响范围：
- `src/app/(app)/chunks/use-expression-cluster-actions.ts`
- `src/lib/server/phrases/service.ts`

验证情况：
- `pnpm exec tsc --noEmit --pretty false`
- `node --import tsx --test "src/lib/server/phrases/logic.test.ts" "src/app/(app)/chunks/use-expression-cluster-actions.test.tsx"`

### 重入口二轮拆分治理
- 将 `src/app/(app)/chunks/page.tsx` 的页面级动作链路拆到 `src/app/(app)/chunks/use-chunks-page-actions.ts`，集中收口 focus detail 删除回退、expression map 打开、expression map 启动复习和 cluster 补录链路。
- 将 `src/app/(app)/chunks/page.tsx` 的底部多 sheet / panel 组装拆到 `src/app/(app)/chunks/chunks-page-sheets.tsx`，主页面继续保留路由态、筛选态和总装配职责。
- 将 `src/features/lesson/components/lesson-reader.tsx` 的 selection、激活短语、训练态详情桥接和桌面划词同步拆到 `src/features/lesson/components/use-lesson-reader-controller.ts`。
- 将 `lesson-reader` 的对话分支和移动端句子分组装配拆到 `src/features/lesson/components/lesson-reader-dialogue-content.tsx` 与 `src/features/lesson/components/lesson-reader-mobile-sections.tsx`，减少主容器内联分支复杂度。
- 更新 `docs/project-maintenance-playbook.md`，补充 `chunks/page` 与 `lesson-reader` 第二轮拆分时的优先边界和回归要求。

影响范围：
- `src/app/(app)/chunks/page.tsx`
- `src/app/(app)/chunks/use-chunks-page-actions.ts`
- `src/app/(app)/chunks/chunks-page-sheets.tsx`
- `src/features/lesson/components/lesson-reader.tsx`
- `src/features/lesson/components/use-lesson-reader-controller.ts`
- `src/features/lesson/components/lesson-reader-dialogue-content.tsx`
- `src/features/lesson/components/lesson-reader-mobile-sections.tsx`
- `docs/project-maintenance-playbook.md`
- `openspec/changes/decompose-chunks-page-and-lesson-reader/tasks.md`

验证情况：
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/app/(app)/chunks/page.interaction.test.tsx"`
- `node --import tsx --import ./src/test/setup-dom.ts --test "src/features/lesson/components/lesson-reader.interaction.test.tsx"`
- `pnpm exec tsc --noEmit --pretty false`
