## Why

当前学习主链路里的动作按钮已经出现明显漂移：同样属于“主动作”的按钮，在 `scene`、`lesson`、`chunks`、`scenes` 生成入口里混用了主按钮色、白底次按钮和局部自定义底色；同样属于“次动作”的保存类按钮，也在 `chunks` 候选保存、手动录入、句子详情里出现了边框、底色和文字层级不一致的情况。继续按页面零散修补会让后续 AI 和人工维护都越来越难判断“哪个按钮该高亮、哪个按钮该降级”。

现在需要把学习主链路里的按钮层级收敛成一套稳定规则：主按钮、次按钮、图标按钮各自对应固定的视觉语义，并把已经发现的漂移点在同一轮最小必要收口，避免同一类按钮在不同页面继续各自演化。

## What Changes

- 为学习主链路新增“动作按钮视觉层级”能力，统一定义主按钮、次按钮、图标按钮在学习页面里的默认颜色、边框、底色与适用场景。
- 收口 `scene / lesson / chunks / scenes` 中已发现的按钮漂移点：
  - 把“加入复习 / 开始复习 / 生成场景”等主动作统一到同一主按钮层级。
  - 把“保存到表达库 / 保存并加入复习 / 保存句子 / 添加到表达库”等保存类动作统一到同一次按钮层级。
  - 把局部手写按钮样式尽量改回统一按钮语义，而不是继续堆页面特例。
- 同步补齐最小测试，确保主按钮与次按钮在目标页面里保持一致，不因后续局部改动再次漂移。
- 同步补充开发记录与相关实现文档入口，说明本轮收口范围。

## Stability Closure

### In This Round
- 收口学习主链路内“主动作按钮 / 次动作按钮”已经暴露出的颜色、边框、底色漂移。
- 收口 `lesson detail`、`chunks focus detail`、`chunks 手动录入`、`scene detail`、`scenes 生成入口` 之间对相同动作类型的不同视觉表达。
- 用稳定规则替代当前“看到不统一再单点修”的维护方式，补最小测试防止回漂。

### Not In This Round
- 不重做 `admin`、`marketing`、`settings` 等非学习主链路页面的全部按钮体系；这些页面虽然也使用同一按钮基础类，但不属于本轮要收口的学习动作语义。
- 不在本轮引入新的全局设计 token 命名体系，也不做大范围主题重构；本轮优先复用现有 `app-button-primary / secondary` 语义。
- 不统一所有表单输入框、segmented control、badge 等非按钮控件的表面样式。

### Risk Tracking
- 延后原因：如果把后台、营销页和所有控件一起纳入，会让本轮从“学习链路语义统一”失焦成“全站视觉重刷”。
- 风险记录位置：本 change 的 `design.md` 与 `tasks.md` 会明确记录只收学习主链路按钮，不收全站 UI 的边界。

## Capabilities

### New Capabilities
- `learning-action-button-hierarchy`: 定义学习主链路中主按钮、次按钮与图标按钮的统一视觉语义和适用边界。

### Modified Capabilities
- `detail-footer-actions`: 详情页 footer 中的复习与保存动作需要对齐到新的主次按钮层级。

## Impact

- 影响代码：
  - `src/app/(app)/scene/[slug]/*`
  - `src/features/lesson/components/*`
  - `src/app/(app)/chunks/*`
  - `src/features/chunks/components/*`
  - `src/app/(app)/scenes/*`
  - 可能涉及 `src/lib/ui/apple-style.ts` 中现有按钮语义的复用方式
- 影响测试：
  - scene / lesson / chunks 相关 interaction tests
  - 手动录入与详情 footer 的最小样式/交互回归
- 不影响：
  - 服务端 API、缓存、数据库模型
  - 学习状态流转与业务语义
