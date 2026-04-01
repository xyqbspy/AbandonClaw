## MODIFIED Requirements

### Requirement: 改动认证入口或关键 API route

维护流程 MUST 在实现任何认证入口、登录跳转规则、接口访问边界或高成本外部调用改动前，先审计请求入口、访问控制、失败保护与回归测试范围。对于高成本或敏感 API route，维护者不得只检查“是否已登录”，还 MUST 同时检查角色权限、输入规模限制、错误暴露和热路径重复查询问题。

#### Scenario: 准备调整高成本或敏感 API route

- **WHEN** 维护者准备修改会触发模型调用、批量重生成、重型解析或用户资料热路径的 API route
- **THEN** 必须先盘点 middleware 边界、route 内权限、输入规模限制、错误收敛和测试覆盖
- **AND** 不得只修补单个 route 的局部判断而忽略完整请求链路
