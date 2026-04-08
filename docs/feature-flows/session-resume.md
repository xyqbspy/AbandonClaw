# Session Resume

## 1. 目标

说明 session 如何支持用户中断后恢复，以及 today / scene 如何消费恢复信息。

## 2. 入口

- 用户从 today 点击继续学习
- 用户重新进入某个 scene
- repeat practice / repeat variant 恢复

## 3. 主链路

1. 服务端读取 progress + session
2. 组装 continue learning item
3. today 按优先级展示 continue 入口
4. scene 根据 session 恢复到对应步骤或视图

## 4. 关键状态/回写节点

- 用户继续学习后会刷新 last viewed / last active
- 完成更多步骤后，session 与 progress 一起推进

## 5. 失败与降级

- 旧 session 字段缺失时，需要保守兼容
- 不应把兼容状态直接翻译成新的用户可见步骤

## 6. 改动时一起检查

- continue learning 聚合
- scene session 恢复
- repeat practice / variant resume

## 7. 建议回归

- today 能稳定展示 continue learning 入口
- 用户重新进入 scene 后会恢复到正确步骤或视图
- repeat practice / repeat variant 恢复不会覆盖正常 scene resume
- 旧 session 缺字段时仍按保守兼容逻辑降级
