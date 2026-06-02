## 1. Proposal 阶段

- [x] 1.1 新建 `expand-anonymous-trial-experience` OpenSpec change。
- [x] 1.2 写明 `/trial` 独立试用层、匿名只读能力、写入拒绝、预生成练习题边界。
- [x] 1.3 写明不开放主应用路由、不新增匿名生成配额、不做匿名数据迁移。
- [x] 1.4 运行 `openspec validate expand-anonymous-trial-experience --strict`。

## 2. 路由与入口

- [x] 2.1 新增 `/trial` 匿名试用列表页。
- [x] 2.2 新增 `/trial/scene/[slug]` 匿名试用详情页。
- [x] 2.3 中间件只新增 `/trial/*` 匿名白名单，确认 `/scenes`、`/scene`、`/today`、`/review`、`/chunks`、`/progress` 仍要求登录。
- [x] 2.4 首页“免登录试用”入口切换到 `/trial`。
- [x] 2.5 保留 `/share/scene/[slug]` 分享入口，不强制删除。

## 3. 精选场景与只读详情

- [x] 3.1 确认 4-5 条公开精选场景 slug，要求场景、句子、详情和主要 TTS 数据完整。
- [x] 3.2 新增或复用匿名精选场景读取 helper。
- [x] 3.3 匿名列表展示场景标题、简介、可学习重点和进入按钮。
- [x] 3.4 匿名详情展示场景正文、句子列表、chunk/detail 信息。
- [x] 3.5 匿名详情播放已生成 TTS；缺失 TTS 时不得触发实时生成。

## 4. 预生成练习题

- [x] 4.1 新增或复用预生成练习题只读读取 helper。
- [x] 4.2 匿名详情中展示预生成练习题。
- [x] 4.3 支持前端本地选择答案和本地反馈。
- [x] 4.4 禁止匿名提交练习结果、写 practice run、写 progress 或加入复习。
- [x] 4.5 无预生成题集时显示注册后生成/练习引导，不调用生成接口。

## 5. 写入与生成阻断

- [x] 5.1 导入场景、生成场景、生成练习题入口在匿名模式下提示注册。
- [x] 5.2 保存表达、加入复习、提交练习、写 progress/review 在匿名模式下提示注册。
- [x] 5.3 服务端写入和生成类 API 保持匿名拒绝，前端阻断不能作为唯一边界。
- [x] 5.4 注册引导统一使用现有匿名引导组件或最小扩展，不新增重复文案体系。

## 6. 测试与验证

- [x] 6.1 路由守卫测试：`/trial/*` 可匿名访问，主应用路由仍跳登录。
- [x] 6.2 页面测试：匿名列表展示 4-5 条场景，详情可展示句子和已生成 TTS 控件。
- [x] 6.3 练习测试：预生成题可本地作答，但提交被阻断并提示注册。
- [x] 6.4 API 测试：导入、生成、保存、加入复习、提交、progress/review 写入仍拒绝匿名。
- [x] 6.5 运行最小相关测试、类型检查或 build，并记录未覆盖项。

## 7. 文档与收尾

- [x] 7.1 同步 `docs/feature-map/anonymous-trial.md`。
- [x] 7.2 同步 `docs/domain-rules/auth-api-boundaries.md`。
- [x] 7.3 记录 `docs/dev/dev-log.md`。
- [x] 7.4 对照 proposal/design/spec delta 做实现 review。
- [x] 7.5 完成 OpenSpec archive 前同步 stable spec。
- [x] 7.6 若用户可感知变化进入 `main`，更新正式 `CHANGELOG.md`。
