## 1. Review Stage Panel 样式收口

- [x] 1.1 将 `review-page-stage-panel.tsx` 中空队列标题、场景标题、表达标题、评分提示、调度提示和 reference toggle 的固定 class 抽为同文件局部常量。
- [x] 1.2 保留动态状态色的现有语义，只将固定基础层级收口为局部常量。
- [x] 1.3 确认不改变 Review 队列、阶段推进、提交、回写或来源跳转逻辑。

## 2. 文档收口

- [x] 2.1 更新 `docs/system-design/ui-style-audit.md`，记录本轮 Review stage panel 内部文案层级收口。
- [x] 2.2 明确不收项：不抽全局 token、不改 Review hero、不改按钮体系、不处理业务测试前置语义。

## 3. 验证

- [x] 3.1 运行 `pnpm exec eslint --max-warnings=0 'src/app/(app)/review/review-page-stage-panel.tsx'`。
- [x] 3.2 运行 `git diff --check`。
- [x] 3.3 运行 `node_modules\\.bin\\openspec.CMD validate continue-review-style-consolidation --strict`。

## Stability Closure

- 本轮收口：Review stage panel 内部文字层级和提示样式继续局部常量化。
- 明确不收：Review hero 视觉、全局 token 重命名、按钮组件体系、业务测试语义。
- 剩余风险记录位置：`docs/system-design/ui-style-audit.md`。
