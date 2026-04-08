# Feature Map

本文档用于描述项目的核心功能结构、主链路、模块边界与文档索引。
目标是让开发者或 AI 在修改前，先理解项目“整体是怎么运转的”，避免只按局部代码惯性修改。

---

## 1. 项目目标

一句话说明项目在做什么：

> 这是一个通过场景训练推动用户从“看懂”到“能输出”的英语学习系统。

如果后续项目定位发生变化，应优先更新这里。

---

## 2. 当前主链路

主链路是项目最重要的行为路径，任何改动都优先检查是否影响这里。

示例：

1. 用户进入 Today
2. 系统判断下一步推荐动作
3. 用户进入 Scene
4. 用户完成理解 / 跟读 / 练习
5. 系统记录 Session 与 Expression 进度
6. 用户回到 Today 或进入 Review
7. Review 成功后回写学习状态

如果改动会影响这条链路中的任一步，必须先评估上下游影响。

---

## 3. 核心功能模块

### 3.1 Today
作用：
- 作为用户当天训练的主入口
- 负责决定“下一步最该做什么”

输入：
- 未完成 session
- review 积压状态
- 新 scene 可用状态

输出：
- 主推荐动作
- 次级推荐动作

关键规则：
- 有未完成 session 时优先继续当前训练
- review 超阈值时优先推荐回忆
- 新 scene 不应覆盖未完成 session

相关文档：
- `docs/feature-map/today.md`
- `docs/testing-policy.md`

---

### 3.2 Scene
作用：
- 承载一次完整训练场景
- 组织输入、理解、练习与完成判断

输入：
- scene 内容
- expression 映射
- 当前 session 状态

输出：
- 学习动作记录
- session 更新
- 完成状态

关键规则：
- Scene 不只是内容页，而是训练站
- 完成不应只靠“浏览过”
- 至少需要满足有效学习证据

相关文档：
- `docs/feature-map/scene.md`

---

### 3.3 Expression Item
作用：
- 作为长期学习对象
- 承载阶段状态、review 信息和来源场景

输入：
- scene/chunk/关键句映射
- 用户学习行为

输出：
- 学习阶段
- review 信息
- 表达库沉淀

关键规则：
- Expression 是长期学习对象，不是 chunk 的简单镜像
- 阶段推进依赖学习证据，而非单纯浏览

相关文档：
- `docs/feature-map/expression-item.md`

---

### 3.4 Session
作用：
- 记录一次 scene 学习过程
- 支持中断恢复与 today 推荐

输入：
- 当前 scene
- 当前训练步骤
- 已完成动作

输出：
- 恢复点
- 完成判断
- 推荐依据

关键规则：
- 用户中断后应能恢复，而不是重新开始
- Session 是 today 编排的重要依据

相关文档：
- `docs/feature-map/session.md`

---

### 3.5 Review
作用：
- 承载回忆与长期记忆巩固
- 与 scene / expression 联动

输入：
- expression 当前阶段
- review 计划或到期状态

输出：
- 回忆结果
- 阶段回写
- 后续推荐动作

关键规则：
- Review 不是孤立卡片页
- 回忆结果应回写表达状态
- 必要时应能引导用户回到原场景继续练习

相关文档：
- `docs/feature-map/review.md`

---

## 4. 核心对象关系

项目中的核心对象：

- Scene：训练容器
- Expression Item：长期学习对象
- Session：一次训练过程状态
- Review：回忆与巩固机制

关系说明：
- Scene 提供训练内容与上下文
- Expression Item 负责长期学习进度
- Session 负责一次训练过程与恢复点
- Review 负责长期记忆强化与状态回写

如果新增功能涉及这些对象，必须说明：
- 影响哪个对象
- 是否新增对象关系
- 是否改变原有状态流转

---

## 5. 当前核心规则白名单

以下规则属于项目骨架，除非明确要改，否则不要轻易改变语义：

- Today 推荐优先级
- Scene / Session / Review 主链路
- Expression 阶段定义
- 学习证据模型
- Scene 完成判定
- Review 回写规则

任何涉及这些规则的改动，都应：
- 优先补充说明
- 评估上下游影响
- 视情况更新测试与文档

---

## 6. 文档索引建议

建议后续逐步补齐以下文档：

- `docs/feature-map/today.md`
- `docs/feature-map/scene.md`
- `docs/feature-map/expression-item.md`
- `docs/feature-map/session.md`
- `docs/feature-map/review.md`

每份子文档建议包含：
- 模块目标
- 输入
- 输出
- 状态
- 核心规则
- 上下游依赖
- 常见改动风险
- 测试关注点

---

## 7. 修改前检查清单

在改任何复杂功能前，先确认：

- 这次改动影响哪个模块？
- 是否影响主链路？
- 是否影响核心对象关系？
- 是否影响规则白名单？
- 是否需要同步更新 feature-map 文档？
- 是否需要补测试或调整测试语义？

---

## 8. 给 AI 的使用建议

修改复杂功能前，优先执行以下顺序：

1. 先读本文件
2. 再读对应模块文档
3. 再定位相关代码
4. 最后决定属于 Fast Track、Cleanup 还是 Spec-Driven

不要一上来直接从代码局部开始猜业务。