# 设计说明：document-maintenance-gaps

## Status

draft

## Current Gap

当前维护文档覆盖面并不平均。

已经有专项文档的区域：

- `today` 聚合映射
- `scene` 练习题生成
- `chunks` 数据保存契约
- `review` 来源、递进式练习、正式信号、调度
- 音频 / TTS 管线

仍明显缺文档的区域：

1. `scenes/page.tsx`
   - 页面同时承接列表缓存、进入前预热、导入、生成、删除和侧滑交互
   - 当前只有测试和维护手册零散提及，没有单独说明
2. `progress/page.tsx`
   - 页面很薄，但它消费的是服务端聚合字段，失败时还有降级兜底
   - 当前没有文档解释 `LearningOverview` 和页面卡片怎么对应
3. `chunks` focus detail / expression map
   - 当前已有 `chunks-data-mapping.md` 解释保存与关系语义
   - 但详情浮层、表达地图、补全、加 cluster、进入复习之间的页面职责还没有专项说明

## Decision

### 1. 以“高维护成本页面 / 链路”为单位补文档

这次不泛泛补“目录说明”，而是按真实维护入口补三份专项文档：

- `scenes-entry-flow.md`
- `progress-overview-mapping.md`
- `chunks-focus-detail-map.md`

每份文档都要覆盖：

- 入口文件和关键依赖
- 页面状态来源与服务端来源
- 主要动作链路
- 失败态 / 回退态 / 缓存语义
- 后续改动时必须一起检查的回归点

### 2. 不重复已有文档的领域边界

- `chunks-data-mapping.md` 继续负责“表达保存与数据契约”
- 新文档只补 `focus detail / expression map` 的页面职责与交互链路
- `scene-practice-generation.md` 继续负责练习题生成，不扩写 `scenes` 列表页
- `today-learning-mapping.md` 继续负责 today，不替代 `progress` 聚合说明

### 3. 在维护手册中增加稳定入口

`docs/project-maintenance-playbook.md` 要补上这三份文档入口，让维护者能从主手册直接跳到对应专项说明，而不是靠记忆搜索。

## Risks

- 如果文档只描述 UI，不写服务端字段来源，后续改聚合或缓存时仍然容易误判
- 如果文档范围和既有专项文档重叠过多，后续会出现多份文档互相漂移
- 如果不把回归点写进文档，新文档只能起到阅读作用，无法真正支撑维护

## Validation

- 新文档必须能明确回答对应页面 / 链路的关键状态来源与动作边界
- 项目维护手册里必须能直接找到这三份新文档入口
- 文档更新后执行 `pnpm run text:check-mojibake`
