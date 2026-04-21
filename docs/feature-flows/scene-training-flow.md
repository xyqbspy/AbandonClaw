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
- practice set 本体读取服务端失败时，允许继续使用本地缓存降级；但本地缓存命中不能跳过服务端 latest set 请求。

### 5.1 Practice set 读取 / 生成 / run 关系

- 进入 scene 后，页面先用 `scene-learning-flow-v2` 中的本地 practice set 秒开，再后台 GET `/api/learning/scenes/{slug}/practice/set`。
- 服务端返回 latest generated practice set 后，页面必须回填本地缓存并刷新 generated state。
- 点击开始练习时：
  - 若已有 latest practice set，直接进入 practice，不重复调用生成接口。
  - 若没有 practice set，先生成题目、保存到服务端，再写入本地缓存并进入 practice。
  - 若当前 latest practice set 来自旧本地缓存，启动 run 前先尝试 POST 保存到服务端，保证后续 run / attempt 的 `practiceSetId` 有服务端锚点。
- 手动重新生成时，必须保存为新的服务端 practice set，并废弃同来源旧 generated set；旧 run / attempt 保持原 `practice_set_id` 不改写。
- run / attempt / mode-complete / complete 写入前，服务端必须校验 `practiceSetId` 属于当前 user + scene。

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
