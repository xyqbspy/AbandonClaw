# 设计说明：重构复习页面体验

Status

draft

Current Flow

当前入口：

- [page.tsx](/d:/WorkCode/AbandonClaw/src/app/(app)/review/page.tsx)

当前处理链路：

- 页面加载时并行读取 due review、review summary、可选的 session phrases
- 顶部展示摘要文本
- 中间优先展示场景练习回补卡块
- 下方展示当前普通表达复习卡
- 普通表达复习通过 `again / hard / good` 三按钮提交
- 场景回补通过内联输入框 + 检查按钮提交

当前回写 / 状态更新：

- 普通复习走 `submitPhraseReviewFromApi`
- 场景回补走 `start / attempt / complete`
- 两类链路都依赖 `review-page-cache` 回填与刷新

当前问题

- UI 层次平铺，缺少像 `review.html` 那样的阶段感和“当前正在做哪一步”的引导
- 页面有两个主要任务块，但没有统一叙事，用户容易把场景回补和表达复习理解成两套分离系统
- 普通表达复习卡动作太简短，缺少参考、回忆、变体和反馈的渐进过程
- 场景回补虽然有推荐题型，但交互仍偏表单提交，不够沉浸
- 部分期望交互（例如更强的 AI 反馈、变体改写检查、复习后自定义下一步建议）当前后端并未提供完整支持

Decision

### 1. 复习页改为“单主舞台 + 阶段式卡片”的沉浸流

页面将改为以当前主任务为中心：

- 顶部：今日进度、连贯的复习摘要、当前题号/剩余量
- 主卡片：当前复习内容
- 次级区：上下文、提示、参考、补充任务
- 底部固定主 CTA：进入下一题 / 完成当前步骤

### 2. 统一普通表达复习与场景回补的视觉语法

无论任务来自普通 due phrase 还是场景练习回补，都统一映射为：

- Step 1：回忆/唤醒
- Step 2：作答/变体练习
- Step 3：反馈/延展

这三步是前端交互分层，不等同于必须都有后端独立状态。

### 3. 现有后端能力优先复用，不足处先留 TODO，并允许分阶段补后端

若后端已有能力：

- 直接接入

若后端暂时没有能力：

- 在页面上保留明确 TODO 占位
- 使用本地前端状态完成演示型交互
- 不伪造正式学习完成信号

若该 TODO 对核心体验影响过大：

- 可以在同一个 change 里继续纳入后端任务
- 但必须先更新 proposal / design / tasks / spec delta
- 明确哪些部分会新增 API、哪些部分会新增落库、哪些部分仍保持前端占位

例如当前可能需要后端支持的方向：

- AI 自然度点评
- 改写建议打分
- 更细粒度的复习阶段统计
- review 阶段级完成记录
- 下一题推荐与队列编排增强

这些能力如果后端没准备好，本次先只做前端 UI 占位和 TODO 标识；如果用户确认继续推进，也可以在后续 implementation 中按优先级逐步补后端。

### 4. Selector 负责把后端数据翻译成统一“复习舞台模型”

新增或扩展 review selectors，把后端数据统一映射为：

- `hero progress`
- `current review stage`
- `review source`
- `prompt / expected answer / hint / reference`
- `available actions`
- `todo capability flags`

这样页面本身只做编排和显示，不直接散落判断 due phrase 与 scene inline practice 的差异。

### 5. 交互节奏允许“渐进显示”

参考 `review.html`，采用渐进 reveal：

- 默认先显示场景说明或表达目标
- 用户点击后显示参考/答案区
- 再进入输入与反馈区
- 最后进入下一题推进

这会改变当前一次性把所有控件都堆在页面上的方式。

Risks

- 普通表达复习的三按钮评分是当前真实后端写入口，改成分阶段 UI 后必须保证最终仍能清晰触发 `again / hard / good`
- 场景回补的推荐题型与 `review.html` 的“变体改写”不是完全等价，需要 selector 做适配，不能硬套
- TODO 占位如果处理不好，会给用户“功能已完成”的误导，需要明确文案说明
- 如果中途接入新后端契约，测试面会从纯页面交互扩大到 review API / learning API / cache 刷新链路

Validation

- 更新 `review-page-selectors` 单测，覆盖“普通表达复习 / 场景回补 / TODO 能力占位”的舞台模型映射
- 更新 `page.interaction.test.tsx`，覆盖新的阶段切换、查看参考、作答和下一题推进
- 如拆出新组件，补对应 interaction test
- 实施阶段若发现需要新后端契约，先回写 proposal / design / tasks / specs，再继续实现
- 若纳入后端任务，补充对应 API / service / cache 回归测试
