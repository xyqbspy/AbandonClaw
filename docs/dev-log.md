# Dev Log

本文档用于记录开发过程中的实际改动、重构说明、验证情况、影响范围与后续待办。
它不是正式发布用 CHANGELOG，也不要求只记录用户可感知变化。

---

## 使用原则

适合记录：
- 重构
- 删除旧功能
- 调整实现方式
- 补测试
- 修复局部问题
- 开发中间态决策
- 尚未发布但已经落地的行为调整
- 验证情况和已知风险

不适合记录：
- 与项目无关的临时实验
- 纯废话式过程描述
- 与代码改动无关的泛泛讨论

---

## 记录格式

每条记录建议包含：

- 日期
- 标题
- 类型
- 背景
- 本次改动
- 影响范围
- 测试 / 验证
- 风险 / 未完成项
- 后续计划

---

## 日志条目模板

### [YYYY-MM-DD] <标题>

- 类型：重构 / 修复 / 删除 / 测试 / 文档 / 行为调整
- 状态：进行中 / 已完成 / 待验证

#### 背景
说明为什么要做这次改动：
- 当前问题是什么
- 是历史包袱、功能缺陷、实现不合理，还是产品方向变化

#### 本次改动
- 改动 1
- 改动 2
- 改动 3

#### 影响范围
- 影响模块：
- 影响页面：
- 是否影响主链路：是 / 否
- 是否影响用户可感知行为：是 / 否
- 是否需要同步文档：是 / 否

#### 测试 / 验证
- 已运行测试：
- 手动验证路径：
- 未验证部分：

#### 风险 / 未完成项
- 风险 1
- 风险 2
- 尚未处理项 1
- 尚未处理项 2

#### 后续计划
- 下一步任务 1
- 下一步任务 2

---

## 示例

### [2026-04-08] 收敛 Today 推荐逻辑并移除旧入口

- 类型：重构
- 状态：已完成

#### 背景
旧的 Today 页面同时存在多个入口，推荐逻辑分散，AI 在后续开发中容易误判主入口，用户也缺乏清晰的下一步指引。

#### 本次改动
- 收敛 Today 主 CTA 的判断逻辑
- 删除重复的次级入口
- 将“继续当前训练”作为未完成 session 的优先动作

#### 影响范围
- 影响模块：Today、Session
- 影响页面：Today 首页
- 是否影响主链路：是
- 是否影响用户可感知行为：是
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：today 相关单测、推荐逻辑测试
- 手动验证路径：
  - 存在未完成 session 时进入 Today
  - review 积压时进入 Today
- 未验证部分：与变体训练联动的推荐优先级

#### 风险 / 未完成项
- review 与 scene 并存时的边界优先级仍需进一步明确
- 当前文案仍偏系统化，后续需要收敛

#### 后续计划
- 更新 feature-map 中 Today 模块说明
- 补一条 Today 推荐优先级的验收清单

---

## 维护建议

- 每次完成一轮真实改动后追加一条记录
- 重大重构优先记录“为什么改”和“主链路是否变化”
- 删除功能时一定记录删除依据
- 若行为变化已稳定且准备发布，再从这里提炼正式 CHANGELOG

---

### [2026-04-08] 补齐 scenes、progress 与 chunks 详情专项维护文档

- 类型：文档
- 状态：已完成

#### 背景
仓库原本已经有 `today`、`review`、`scene practice`、`chunks data`、`audio tts` 等专项维护文档，但 `scenes` 列表页、`progress` 聚合页，以及 `chunks` 的 focus detail / expression map 仍缺独立说明。后续继续改这些区域时，只能翻代码和测试，不利于快速判断链路边界。

#### 本次改动
- 新增 `docs/scenes-entry-flow.md`
- 新增 `docs/progress-overview-mapping.md`
- 新增 `docs/chunks-focus-detail-map.md`
- 在 `docs/project-maintenance-playbook.md` 挂接对应入口

#### 影响范围
- 影响模块：Scenes、Progress、Chunks
- 影响页面：`/scenes`、`/progress`、`/chunks`
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：`pnpm run text:check-mojibake`
- 手动验证路径：已复核文档索引与维护入口
- 未验证部分：无

#### 风险 / 未完成项
- 新文档目前是首版，后续若对应链路继续演进，需要继续维护
- 仍有部分旧文档命名体系未完全收口到新目录分层

#### 后续计划
- 后续文档新增优先收敛到 `feature-map / feature-flows / system-design / dev / meta`
- 继续减少“同一逻辑分散在多个说明文件”的情况

---

### [2026-04-08] 固定 feature-map 与 feature-flows 目录结构

- 类型：文档
- 状态：已完成

#### 背景
仓库开始引入 `docs/feature-map/`、`docs/feature-flows/`、`docs/dev-log.md`、`docs/testing-policy.md` 这一套新文档体系，但 `feature-map` 与 `feature-flows` 当时只有 README，缺少稳定子文档。若不先固定结构，后续文档会继续散落，模块地图和链路说明也会混写。

#### 本次改动
- 固定 `docs/feature-map/` 目录并补齐：
  - `today.md`
  - `scene.md`
  - `session.md`
  - `expression-item.md`
  - `review.md`
- 固定 `docs/feature-flows/` 目录并补齐：
  - `today-recommendation.md`
  - `scene-training-flow.md`
  - `session-resume.md`
  - `review-writeback.md`
- 更新两个 README 的索引和边界说明
- 在 `docs/testing-policy.md`、`docs/project-maintenance-playbook.md` 补入口

#### 影响范围
- 影响模块：文档体系、维护入口
- 影响页面：无直接页面影响
- 是否影响主链路：否
- 是否影响用户可感知行为：否
- 是否需要同步文档：是

#### 测试 / 验证
- 已运行测试：`pnpm run text:check-mojibake`
- 手动验证路径：复核目录结构与 README 索引
- 未验证部分：无

#### 风险 / 未完成项
- 部分旧文档仍然使用旧命名习惯，后续还需要继续迁移或收口
- 新目录结构虽然固定了，但不同类别文档的边界仍需在后续改动中持续执行

#### 后续计划
- 后续主链路文档优先落到 `feature-flows/`
- 后续模块职责说明优先落到 `feature-map/`
