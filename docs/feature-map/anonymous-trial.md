# Anonymous Trial（匿名试用 + 分享灰度入口）

## 1. 模块目标

匿名试用模块负责让未注册访客先体验公开场景学习的核心阅读层：场景列表、场景详情、句子气泡、翻译、相关短语详情和预生成 TTS 播放。

它**不是产品主链路**，而是独立灰度入口层，由 `ALLOW_ANONYMOUS_TRIAL` env 总开关控制。关闭时所有匿名路径直接退回 `/login`；主入口 today / scenes / scene / review / chunks / progress 永远要求登录。

## 2. 输入

- 首页试用入口：`/trial`
- 外部分享链接：`/share/scene/[slug]`
- 公共内容表：`scenes.is_public=true`
- 已上传的预生成 TTS 音频：Supabase Storage `tts-audio` bucket
- `X-Anonymous-Id` 请求头：前端 localStorage UUID v4 透传
- `ALLOW_ANONYMOUS_TRIAL`、`ANON_DAILY_SALT_SECRET`、匿名 TTS 配额 env

## 3. 输出

- `/trial` 渲染公开试用场景列表，视觉复用主 `/scenes` 的筛选条和场景卡片
- `/trial/scene/[slug]` 渲染匿名只读场景详情，视觉复用主 `/scene/[slug]` 的句子气泡、翻译、朗读和详情面板/弹层
- `/share/scene/[slug]` 继续作为分享灰度详情入口，使用同一匿名只读详情组件
- 导入、生成、练习、变体、保存、加入复习、实时 AI 解释等入口只保留外观，点击显示注册阻断
- 预生成 TTS 播放调 `/api/anonymous/tts/play`
- 三层注册引导：L1 顶栏提示 / L2 内联卡片 / L3 阻断弹窗
- 漏斗事件落盘到 `anonymous_funnel_events`

## 4. 核心规则

### 4.1 主入口完全不受灰度影响

- middleware `PROTECTED_PAGE_PREFIXES` 显式守护 today / scenes / scene / review / chunks / progress / settings / lesson / admin，匿名访问被强制重定向到 `/login`
- 该列表**不得**加 `/share` 或 `/trial`；`/share/*` 与 `/trial/*` 由 middleware 透传到页面，页面自己判 env 开关
- `SceneDetailClientPage`（主路由 `/scene/[slug]`）不动；匿名分支使用独立的只读组件和匿名 TTS 播放 API
- `/trial` 不得默认跳转到 `/share/scene/[slug]` 或某个固定场景；用户必须先看到试用场景列表，再自己点击进入详情

### 4.2 身份四道防线

1. localStorage UUID + `X-Anonymous-Id` 头识别同一访客
2. `ip_hash = SHA256(ip + daily_salt)` 做 IP 维度防绕过
3. `anonymous_sessions` 表 + 同 IP 当日 session 上限
4. 搜索引擎爬虫识别：不创建 anonymous_session、不计配额、不签发 TTS signed URL

### 4.3 只读能力与受限能力

- **允许**：公开场景列表读取、公开场景详情读取、公开 chunk/detail 展示、预生成 TTS 播放
- **注册阻断**：导入场景、生成场景、生成练习、生成/打开变体训练、保存表达、加入复习、提交 review、写 progress、实时 AI 解释、实时 TTS 生成
- **`tts_play`**：非 HighCostCapability，只读 Storage，走独立 `tts-playback-quota`，默认 30 次/天/anon
- **`explain_selection`**：默认匿名禁用，返回 `ANON_FEATURE_DISABLED`；若未来恢复灰度，必须显式设置 `ANON_ALLOW_EXPLAIN_SELECTION=true` 并同步配额/文档/测试

### 4.4 表权限边界

- 公开内容表只允许读取 `is_public=true` 或明确 builtin/core 的公开数据
- 所有用户态表（profiles / user_* / phrase_* / *_logs）不得对 anon role 加 SELECT 策略
- 匿名支撑表只 service role 可读写

### 4.5 匿名学习态不持久化

- 匿名期间的浏览状态、详情打开状态、阻断弹窗状态只留在前端内存或 sessionStorage
- 唯一持久化匿名数据是 `anonymous_sessions` 与漏斗事件，不存业务学习语义
- 注册后从零开始，本期不做匿名到注册数据迁移

## 5. 常见改动风险

- 改 `scenes.is_public` 或 RLS：必须检查 `/trial` 列表与 `/trial/scene` 详情仍只读公开数据
- 改主 `/scene/[slug]`：不得把登录态写入 hook 泄漏到匿名详情
- 改 `/api/explain-selection`：默认匿名必须保持 `ANON_FEATURE_DISABLED`
- 改 TTS：匿名只能查 Storage 已有签名 URL，不得 fallback 生成
- 改 middleware：不得把 `/share` 或 `/trial` 加入受保护前缀
- 加新匿名 capability：必须补身份、配额、防绕过、阻断、漏斗、文档和测试

## 6. 测试关注点

- 页面 audit：`src/app/trial/page.audit.test.ts`
- 匿名详情交互：`src/features/anonymous-trial/components/share-scene-preview-client.test.tsx`
- 匿名 TTS：`src/app/api/anonymous/tts/play/route.test.ts`
- 匿名 AI 默认阻断：`src/app/api/explain-selection/route.test.ts`
- 匿名 feature matrix / quota：`src/lib/server/anonymous/*.test.ts`
- RLS audit：`src/lib/server/anonymous/rls-policy-audit.test.ts`

## 7. 相关锚点

- 页面：`src/app/trial/`、`src/app/share/scene/[slug]/`
- 客户端：`src/features/anonymous-trial/`
- 服务端匿名边界：`src/lib/server/anonymous/`
- 公开场景读取：`src/lib/server/scene/service.ts`
- Spec：`openspec/specs/anonymous-trial-mode/spec.md`、`openspec/specs/auth-api-boundaries/spec.md`
- Env：`.env.example` 的“匿名试用灰度”段
