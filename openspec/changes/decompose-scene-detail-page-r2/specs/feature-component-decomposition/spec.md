# 规范文档：feature-component-decomposition

## ADDED Requirements

### Requirement: scene-detail-page.tsx 第二轮拆分必须保持主学习链路语义稳定

系统 MUST 在对 `scene-detail-page.tsx` 进行第二轮拆分时，把拆分范围限定为 scene detail 同目录的内部 hook、logic 或 view section，优先收口 practice run lifecycle、practice/variant prewarm、variant run lifecycle 和 view switch 装配；不得借拆分改变 scene 阅读、音频、表达保存、practice、variants、expression map、session 恢复、learning sync 或 scene 完成判定语义。

#### Scenario: 推进 scene-detail-page.tsx 二轮拆分时的范围边界

- **GIVEN** 维护者准备推进 `scene-detail-page.tsx` 第二轮拆分
- **WHEN** 决定本轮拆分对象时
- **THEN** 维护者 MUST 把拆分范围限定为同目录内部模块：practice run lifecycle hook、generation prewarm hook、variant run lifecycle hook 和 scene detail view switch section
- **AND** MUST NOT 改变 `use-scene-detail-data`、`use-scene-detail-actions`、`use-scene-detail-playback`、`use-scene-detail-route-state`、`use-scene-learning-sync` 的对外语义
- **AND** MUST NOT 改变 practice / variant / expression map 的 API、缓存 TTL、服务端契约、生成策略或业务文案
- **AND** MUST NOT 把 scene 私有训练组件、view section 或 class 常量提升为公共组件或全局 token

#### Scenario: scene detail 二轮拆分后的入口级回归

- **WHEN** 维护者完成 practice run lifecycle、generation prewarm、variant run lifecycle 或 view switch 装配拆分
- **THEN** `page.test.tsx` 与 `page.regression.test.tsx` MUST 继续通过，不得依靠重写测试或弱化断言来达成
- **AND** 新 hook MUST 各自带专属测试，覆盖成功、失败、缓存回写、去重、cleanup 或关键 handler 引用稳定性
- **AND** view switch section MUST 保持原有子组件 props 契约、按钮文案、loading 文案、`aria` / `data-testid` 和关键 DOM selector 兼容
- **AND** 页面级回归 MUST 覆盖 scene、practice、variants、expression-map、variant-study 五个主要 view 分支

