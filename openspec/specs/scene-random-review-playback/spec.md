# 规范文档：scene-random-review-playback

## Purpose

定义 `scenes` 列表页随机复习播放入口的资格、队列、scene full 音频复用、失败跳过和播放中视觉状态，确保跨场景被动听力复习不改变单场景详情页的完整场景循环播放语义。

## Requirements

### Requirement: scenes 页面必须提供合格场景的随机复习播放入口
系统 MUST 在 `scenes` 列表页提供一个随机复习播放入口，用于播放已达到复习门槛的完整场景音频。

#### Scenario: 存在合格场景时启动随机复习播放
- **WHEN** `scenes` 列表中存在 `progressPercent >= 60` 的场景
- **AND** 用户点击随机复习播放入口
- **THEN** 系统 MUST 从合格场景中随机选择一个起点开始播放
- **AND** 后续 MUST 按当前列表顺序继续播放下一个合格场景
- **AND** 到达最后一个合格场景后 MUST 回到第一个合格场景继续循环

#### Scenario: 不存在合格场景时不启动播放
- **WHEN** `scenes` 列表中不存在 `progressPercent >= 60` 的场景
- **THEN** 随机复习播放入口 MUST 明确不可启动
- **AND** 系统 SHOULD 给出完成 60% 以上场景后可播放的提示

### Requirement: 随机复习播放必须复用 scene full 音频语义
系统 MUST 播放每个场景的完整 scene full 音频，而不是把场景句子拆散后随机串播。

#### Scenario: 播放单个队列项
- **WHEN** 随机复习播放准备播放某个场景
- **THEN** 系统 MUST 获取该场景完整内容并组装 scene full segments
- **AND** MUST 复用现有 scene full TTS 生成、缓存和失败冷却策略
- **AND** MUST 以单次播放方式播放当前场景，播放结束后再推进到下一个场景

### Requirement: 随机复习播放不得破坏单场景循环播放
系统 MUST 保留 scene detail 中现有单场景完整音频循环播放语义。

#### Scenario: scene detail 使用完整场景循环
- **WHEN** 用户在 scene detail 内触发完整场景循环播放
- **THEN** 系统 MUST 继续使用单场景 loop 行为
- **AND** 不得因为新增随机复习播放而改变该入口的停止、加载和失败提示语义

### Requirement: 随机复习播放与单场景循环播放必须共享播放中状态语义
系统 MUST 让 `scenes` 随机复习播放入口与 scene detail 单场景循环播放入口保持一致的播放中状态表达。

#### Scenario: 随机复习播放入口处于播放中
- **WHEN** `scenes` 随机复习播放正在播放
- **THEN** 入口 MUST 保持与内部循环播放入口一致的白底圆形按钮形态
- **AND** 图标 SHOULD 使用旋转圆圈动效

#### Scenario: 随机复习播放入口未播放
- **WHEN** `scenes` 随机复习播放未播放
- **THEN** 入口 MUST 保持白底圆形按钮形态
- **AND** 图标 MUST 保持随机播放语义，不得替换成循环圆圈图标

#### Scenario: 单场景循环播放入口处于播放中
- **WHEN** scene detail 或句子气泡中的完整场景循环正在播放
- **THEN** 入口 MUST 保持白底圆形按钮形态
- **AND** 图标 SHOULD 使用旋转圆圈动效

#### Scenario: 播放入口未处于播放中
- **WHEN** 随机复习播放或单场景循环播放未播放
- **THEN** 圆圈图标 MUST 保持静止

### Requirement: 随机复习播放必须处理失败场景
系统 MUST 在单个场景详情获取失败、无可播放内容或 scene full 音频不可用时，不让整个播放队列进入不可恢复状态。

#### Scenario: 当前场景播放失败
- **WHEN** 当前队列项无法获取详情、没有可播放 segments 或 scene full 播放失败
- **THEN** 系统 SHOULD 跳过当前场景并尝试下一个合格场景
- **AND** 当一轮内所有合格场景均失败时 MUST 停止随机复习播放并给出受控提示
