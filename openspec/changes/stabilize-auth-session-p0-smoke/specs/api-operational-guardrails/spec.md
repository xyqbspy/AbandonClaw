## ADDED Requirements

### Requirement: 客户端用户态 API 错误必须收敛为可读状态
系统 MUST 对用户态页面首屏请求和关键动作请求的 401、403、429、500 与 network error 提供可读错误状态，不得把原始 `failed fetch` 或上游错误直接展示给用户。

#### Scenario: 首屏请求发生 network error
- **WHEN** Today、Scenes 或 Review 首屏用户态请求发生 network error 或 `failed fetch`
- **THEN** 页面 MUST 展示可读失败状态或重试入口
- **AND** 页面 MUST 不直接展示 `failed fetch`

#### Scenario: 首屏请求收到 401
- **WHEN** Today、Scenes 或 Review 首屏用户态请求收到 401
- **THEN** 页面 MUST 提示 `登录状态已失效，请重新登录` 或进入受控重新登录路径
- **AND** 页面 MUST 不继续展示误导性的已登录成功状态

#### Scenario: 首屏请求收到 403
- **WHEN** 用户态页面请求收到 403
- **THEN** 页面 MUST 展示权限不足的可读提示
- **AND** 页面 MUST 不展示原始服务端错误堆栈或英文权限错误

#### Scenario: 请求收到 429
- **WHEN** 用户态请求收到 429
- **THEN** 页面 MUST 展示 `操作太频繁，请稍后再试`
- **AND** 系统 MUST 不绕过既有限流

#### Scenario: 错误响应包含 requestId
- **WHEN** 用户态 API 错误响应包含 `requestId`
- **THEN** 前端 MUST 在 console 输出该 `requestId`
- **AND** 服务端日志 MUST 能用同一 `requestId` 定位对应请求

### Requirement: Review submit 失败必须可定位且可重试
系统 MUST 在 Review submit 请求期间防止重复提交，并在失败时保留当前题目状态、展示可读错误和允许用户重试。

#### Scenario: Review submit 成功
- **WHEN** 用户点击一次 Review CTA 提交当前复习结果且 API 成功
- **THEN** 系统 MUST 按既有 Review 语义写入结果并推进到下一步
- **AND** 按钮请求期间 MUST 处于 loading 或 disabled 状态

#### Scenario: Review submit 失败
- **WHEN** 用户提交 Review 结果但 API 返回失败或发生 network error
- **THEN** 页面 MUST 展示可读错误
- **AND** 页面 MUST 保留当前题目与用户输入状态
- **AND** 用户 MUST 可以重试
- **AND** 页面 MUST 不直接展示 `failed fetch`

#### Scenario: Review submit 重复点击
- **WHEN** Review submit 请求尚未完成
- **THEN** 系统 MUST 禁止重复提交同一题
- **AND** 系统 MUST 不因为重复点击写坏 review 状态
