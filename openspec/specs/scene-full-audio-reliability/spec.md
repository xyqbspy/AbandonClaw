## Purpose
定义 scene full 音频失败诊断、短时冷却、准备态回看与 block-first fallback 承接规则，降低完整场景音频失败带来的重复撞墙和排障成本。该 capability 在学习闭环中承接 `scene full` 专项可靠性边界，而不重复定义通用播放编排或接口运行护栏。

## Requirements

### Requirement: Scene full 失败必须有稳定内部原因
系统 MUST 在 scene full 生成或播放失败时记录稳定的内部失败原因，同时继续向用户展示受控中文提示。

#### Scenario: provider 生成失败
- **WHEN** scene full TTS provider 返回错误或生成请求失败
- **THEN** 系统 MUST 将失败归类为 `provider_error` 或 `timeout`
- **AND** observability MUST 记录 `failureReason`
- **AND** UI MUST NOT 直接暴露上游原始错误

#### Scenario: scene full 内容不可合成
- **WHEN** scene full segments 为空、合并后为空或没有可读文本
- **THEN** 系统 MUST 将失败归类为 `segment_assembly_failed`
- **AND** 不应继续发起 provider 生成请求

#### Scenario: 生成结果为空
- **WHEN** provider 返回成功但音频 buffer/blob 为空
- **THEN** 系统 MUST 将失败归类为 `empty_audio_result`

#### Scenario: storage 或 signed url 失败
- **WHEN** storage 上传失败或 signed url 获取失败
- **THEN** 系统 MUST 记录 `storage_upload_failed` 或 `signed_url_failed`
- **AND** 如果 inline fallback 仍可播放，系统 MAY 不把本次视为用户可感知失败

### Requirement: 同一个 scene full 连续失败后必须短时冷却
系统 MUST 对同一个 scene full 的连续失败做短时冷却，避免用户短时间重复触发相同失败请求。

#### Scenario: 冷却窗口内再次点击 full
- **GIVEN** 某个 scene full 最近生成或播放失败
- **WHEN** 用户在冷却窗口内再次点击 full 播放
- **THEN** 系统 MUST NOT 立即重新触发 scene full 生成
- **AND** 系统 MUST 记录冷却命中事件
- **AND** 系统 MUST 提示用户先使用 block / 逐段跟读，稍后再试

#### Scenario: 冷却过期后再次点击 full
- **GIVEN** 某个 scene full 最近失败但冷却窗口已过期
- **WHEN** 用户再次点击 full 播放
- **THEN** 系统 MAY 重新尝试获取或生成 scene full 音频

#### Scenario: scene full 成功后清理冷却
- **WHEN** 某个 scene full 成功 ready 或成功播放
- **THEN** 系统 MUST 清理该 scene full 的失败冷却状态

### Requirement: Scene full 准备态必须可回看
系统 MUST 在最小业务事件中区分 scene full 的 ready、cold、pending、failed_recently 与 cooling_down 状态。

#### Scenario: 缓存已 ready
- **WHEN** 用户点击 full 且 scene full 已在缓存中
- **THEN** 系统 MUST 记录 `scene_full_play_ready`
- **AND** payload SHOULD 包含 `sceneFullKey` 与 `readiness = ready`

#### Scenario: 冷启动或已有请求等待
- **WHEN** 用户点击 full 且资源未 ready
- **THEN** 系统 MUST 记录 wait/fetch 类事件
- **AND** payload MUST 区分 `cold` 或 `pending`

#### Scenario: 最近失败或冷却中
- **WHEN** 用户点击 full 且该 scene full 最近失败或正在冷却
- **THEN** 系统 MUST 记录 `failed_recently` 或 `cooling_down`
- **AND** payload MUST 包含失败原因和剩余冷却信息

### Requirement: Scene full 失败后必须优先承接到 block 路径
系统 MUST 在 scene full 失败后保持 scene detail 的 block-first 体验连续性。

#### Scenario: 当前 block 可定位
- **WHEN** scene full 播放失败且当前 block 可定位
- **THEN** UI SHOULD 提供“继续从当前 block 跟读”类 CTA
- **AND** CTA 点击后 SHOULD 复用现有 block 播放或逐段跟读路径

#### Scenario: 当前 block 不可定位
- **WHEN** scene full 播放失败但当前 block 不可定位
- **THEN** UI MAY 回退到 active sentence 或首句 CTA
- **AND** observability SHOULD 记录 fallback 目标
