## 1. 数据模型与类型

- [x] 1.1 新增 Supabase migration，为 `phrase_review_logs` 添加 `variant_rewrite_status`、`variant_rewrite_prompt_id`、`full_output_coverage` nullable 字段与 check constraints。
- [x] 1.2 更新 review 服务端类型，定义变体改写状态、固定改写方向 id、完整输出覆盖结果的联合类型。
- [x] 1.3 更新 request schema 与 normalize 逻辑，允许旧客户端缺字段时保持兼容空值，并让幂等 key 包含新增正式信号。

## 2. 服务端写入、聚合与调度

- [x] 2.1 更新 `submitPhraseReview()`，在写入 `phrase_review_logs` 时保存新增正式信号，并保持 `again / hard / good` 主反馈不变。
- [x] 2.2 增加确定性完整输出覆盖 helper，只做目标表达包含判断，不调用 AI，不输出质量评分。
- [x] 2.3 更新 latest signal 查询、due 排序与 `schedulingFocus` 解释，让未命中目标表达和未完成迁移训练能被保守消费。
- [x] 2.4 更新 `resolveNextReviewAt()`，在保留最终 feedback 主方向的前提下细调新增信号对应的下一次复习时间。
- [x] 2.5 更新 `getReviewSummary()` 与 learning summary 消费，返回变体改写完成数、目标表达覆盖数和目标表达未覆盖数等稳定摘要字段。

## 3. Review 页面与用户反馈

- [x] 3.1 更新 review 页面提交 payload，带上变体改写状态、固定方向 id、完整输出覆盖输入所需字段。
- [x] 3.2 更新 review stage panel / labels，去掉“变体改写仍只是 TODO”的误导口径，明确它是正式训练信号但不是 AI 质量评分。
- [x] 3.3 更新调度提示文案 helper，展示“需要补目标表达完整输出”“需要补迁移改写”等稳定解释。
- [x] 3.4 检查 scene practice 回补路径，确认新增普通表达 review 信号不会污染场景回补提交与完成逻辑。

## 4. 测试

- [x] 4.1 补充 request schema / API handler 测试，覆盖新增字段合法、非法、缺省兼容和幂等 payload。
- [x] 4.2 补充 review service logic 测试，覆盖完整输出覆盖 helper、调度关注点、下一次复习时间和历史空值兼容。
- [x] 4.3 补充 review summary 测试，覆盖今日变体改写、目标表达覆盖和未覆盖聚合。
- [x] 4.4 补充 review 页面 interaction / selector 测试，覆盖完整普通表达递进流程提交新增信号，场景回补不受影响。
- [x] 4.5 运行最小相关测试：review API、review service、review page interaction、review selectors、learning summary/today 相关测试。

## 5. 文档与收尾

- [x] 5.1 更新 `docs/system-design/review-progressive-practice.md`，同步正式阶段、降级路径和明确不收项。
- [x] 5.2 更新 `docs/system-design/review-practice-signals.md`，同步新增字段、落库位置、聚合摘要和历史兼容策略。
- [x] 5.3 更新 `docs/domain-rules/review-scheduling-rules.md` 与 `docs/feature-flows/review-writeback.md`，同步调度消费和回写链路。
- [x] 5.4 更新 `docs/dev/dev-log.md`，记录本轮收口项、明确不收项、验证结果和剩余风险。
- [x] 5.5 运行 `node_modules\\.bin\\openspec.CMD validate formalize-review-progressive-practice --strict`。
- [x] 5.6 运行 `pnpm run maintenance:check` 或说明阻塞原因；完成实现 Review 后 archive。

## 6. 本轮不收项记录

- [x] 6.1 确认未引入 AI 评分、语法评分、自然度评分或语气评分。
- [x] 6.2 确认未把用户自由输出全文沉淀为长期表达资产字段。
- [x] 6.3 确认未重写 `again / hard / good` 主调度算法。
- [x] 6.4 确认未让 `today` 直接解释原始 `phrase_review_logs`。
- [x] 6.5 确认未改变 scene practice 回补正式链路。
