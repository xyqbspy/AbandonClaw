## ADDED Requirements

### Requirement: Scene practice set 缓存必须以服务端记录为权威来源
系统 MUST 允许 scene practice set 命中本地缓存时先渲染，但本地缓存不得成为 practice set 的唯一事实来源；存在服务端记录时，服务端记录必须作为恢复和跨端一致性的权威来源。

#### Scenario: 本地已有 practice set 缓存
- **WHEN** 用户进入 scene 且当前浏览器存在本地 practice set 缓存
- **THEN** 页面可以先用本地缓存渲染练习入口或练习页
- **AND** 系统必须继续请求服务端 latest practice set
- **AND** 服务端返回有效 practice set 后，页面和本地缓存必须同步到服务端结果

#### Scenario: 当前浏览器没有 practice set 缓存
- **WHEN** 用户进入 scene 且当前浏览器没有本地 practice set 缓存
- **THEN** 系统必须尝试读取服务端 latest practice set
- **AND** 若服务端存在可继续 practice set，页面必须恢复该题目集合而不是要求重新生成

#### Scenario: 服务端 practice set 读取失败
- **WHEN** 页面读取服务端 latest practice set 失败
- **THEN** 若本地存在可用缓存，页面可以继续使用本地缓存降级
- **AND** 页面不得把这次失败伪装成服务端无 practice set

