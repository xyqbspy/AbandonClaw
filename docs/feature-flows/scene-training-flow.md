# Scene Training Flow

## 1. 目标

说明用户从进入 scene 到完成练习并解锁变体的完整训练链路。

## 2. 入口

- 从 `scenes` 进入 `scene`
- 从 `today` 的 continue learning 进入 `scene`
- 已在 `scene` 内继续推进到 `practice` / `variants`

## 3. 主链路

1. 从 scenes 或 today 进入 scene
2. 阅读 / 听熟场景
3. 打开重点表达
4. 进入 practice
5. 完成 practice 后解锁 variants
6. scene 状态回写到 learning service

## 4. 关键状态/回写节点

### 4.1 关键节点

- scene detail 数据预热
- learning sync
- practice generate / run / attempt / complete
- variants 预热与打开

### 4.2 回写内容

- scene progress
- scene session
- practice 运行态
- continue learning / today summary

## 5. 失败与降级

- practice generate 失败时要有中文错误和失败保护
- 删除 practice 后重新生成时不能形成重复请求
- variant 不可用时不应提前暴露入口

## 6. 改动时一起检查

- scene-detail-page
- use-scene-learning-sync
- scene practice generation
- variants 入口与恢复

## 7. 建议回归

- 从 `scenes` / `today` 进入 `scene` 后仍能恢复到正确训练阶段
- practice 生成、开始、提交、完成的状态推进仍然闭环
- 完成 practice 后 variants 入口才解锁
- scene 训练推进后会同步刷新 continue learning / today summary
