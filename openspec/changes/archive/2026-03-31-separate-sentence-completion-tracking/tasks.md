## Status

implemented

## 实施

- [x] 1.1 盘点 `service.ts`、learning API、dashboard 聚合中哪些字段或事件仍把“进入句子练习”近似当成“句子完成”。
- [x] 1.2 调整服务端学习状态记录模型，显式区分句子已进入练习、句子已完成和场景练习已完成。
- [x] 1.3 调整 `today` / `continueLearning` / scene learning state 的聚合消费，统一使用新的服务端语义。
- [x] 1.4 为旧字段与历史记录补兼容解释层或迁移策略，避免把旧记录错误升级为句子完成。

## 验证

- [x] 2.1 补充或更新服务层测试，覆盖句子练习进入、句子完成、场景练习完成和 done 判定。
- [x] 2.2 补充或更新 API / 聚合测试，覆盖 dashboard、continue learning 和 scene learning state 的返回语义。
- [x] 2.3 补充或更新 today / scene 页面回归测试，覆盖服务端语义调整后的入口文案与状态推进。
- [x] 2.4 执行受影响测试并记录验证结果与未覆盖风险。

## 文档

- [x] 3.1 在实现完成后更新本 change 的任务状态。
- [x] 3.2 在代码实际改动完成后更新根目录 `CHANGELOG.md`，只记录用户可感知的学习状态变化。
