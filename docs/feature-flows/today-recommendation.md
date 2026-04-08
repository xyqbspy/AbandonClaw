# Today Recommendation

## 1. 目标

说明 `today` 页如何决定主推荐动作，以及不同任务之间的优先级。

## 2. 主要输入

- continue learning scene
- repeat practice / repeat variants
- due review summary
- output task

## 3. 流转

1. 先判断是否存在可继续的 scene / session
2. 再判断是否存在 repeat practice / variant continue
3. 再展示 review / output 等聚合任务
4. 页面把结果翻译成主 CTA、任务卡片和说明文案

## 4. 回写与下游

- 用户点击主 CTA 会进入 scene 或 review
- 完成 scene / review 后，today 的推荐结果会跟随聚合数据变化

## 5. 失败与降级

- 如果聚合字段缺失，today 不应自己推断底层原始事件
- continue learning 缺失时，允许降级到其它可做任务

## 6. 改动时一起检查

- continue learning 选择规则
- review task 展示
- output task 锁定 / 解锁条件
