# Review Writeback

## 1. 目标

说明 review 结果如何写回正式学习信号、调度和聚合摘要。

## 2. 入口

- 普通表达 due review
- scene practice 回补

## 3. 主链路

1. 页面推进 review 阶段
2. 用户提交结果
3. 前端调用 review submit / scene practice 相关 API
4. 服务端写回 review logs、summary、next review
5. today / progress / review summary 消费更新后的聚合

## 4. 关键状态/回写节点

- review result
- output confidence / full output / variant rewrite / target coverage 等正式信号
- review scheduling 相关字段

## 5. 失败与降级

- 提交失败时不能误刷新队列
- 来源场景不可访问时要降级，而不是硬跳转
- 本地临时阶段不应被误当成正式回写结果

## 6. 改动时一起检查

- review page 阶段推进
- review source contract
- review practice signals
- review scheduling signals

## 7. 建议回归

- review 提交成功后会刷新 summary 和下一条队列状态
- scene practice 回补提交不会误走普通表达提交流程
- 提交失败时不会误清当前队列或误前进到下一项
- 来源场景不可访问时仍能稳定降级

## 8. 第五阶段补充

### 8.1 提交成功后的最小结果反馈

- 普通表达 review 提交成功后，不再只提示“提交成功”。
- 页面现在会复用 `submitPhraseReviewFromApi()` 返回的 `summary`：
  - 若仍有待复习项，提示剩余数量
  - 若当前队列已清空，提示本轮回忆可以先收住
- 这层只消费现有 `summary`，不新增新的回写结果字段。

### 8.2 review 提交的最小业务事件

- 普通表达 review 提交成功后，会记录 `review_submitted`
- 当前事件摘要包含：
  - `reviewResult`
  - `dueReviewCount`
  - `reviewedTodayCount`
  - `recognitionState`
  - `outputConfidence`
  - `fullOutputStatus`
  - `variantRewriteStatus`
  - `variantRewritePromptId`
  - `fullOutputCoverage`
- 作用是让“页面提交成功但用户不知道还剩多少、当时做了什么判断”这类排查更直接

## 9. 递进式练习正式信号补充

- 普通表达 review 最终提交时，会把变体改写完成状态写入 `phrase_review_logs`：
  - `variant_rewrite_status`
  - `variant_rewrite_prompt_id`
- 完整输出会由服务端做确定性目标表达覆盖判断：
  - `full_output_coverage = contains_target / missing_target / not_started`
- `full_output_coverage` 不是 AI 质量评分，只表示完整输出是否用进目标表达。
- 用户改写草稿和完整输出全文不沉淀为长期表达资产字段。
- scene practice 回补继续走原有 practice run / attempt / complete 链路，不混入普通表达 review submit。
