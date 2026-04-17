## MODIFIED Requirements

### Requirement: Scene full 后台准备和播放必须不压制 block 主路径
scene detail 页 MUST 继续以 block 为主播放单元，scene full 作为 secondary 音频资源进行准备和播放。

#### Scenario: scene full 冷却期间
- **GIVEN** 某个 scene full 最近失败并处于冷却期
- **WHEN** 页面执行后台预热或用户点击 full
- **THEN** 系统 MUST NOT 让 full 反复生成挤占 block 播放资源
- **AND** block 播放、block 预热和 fallback CTA MUST 继续可用

#### Scenario: scene full 可以重试
- **GIVEN** scene full 未处于冷却期
- **WHEN** 用户明确点击 full 或后台调度允许
- **THEN** 系统 MAY 尝试准备 scene full
- **AND** 当前用户点击的 block 播放仍 MUST 高于 full 后台任务
