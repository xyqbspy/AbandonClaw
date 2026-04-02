# AbandonClaw

基于 Next.js + Supabase 的英语学习应用，包含服务端场景存储、鉴权和 AI 缓存能力。

## 1）环境准备

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## 2）必填环境变量

```bash
GLM_API_KEY=
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-4.6

NEXT_PUBLIC_SUPABASE_URL=  # 或 SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # 或 SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=your-admin@example.com,another-admin@example.com
```

说明：

- `GLM_API_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY` 仅允许服务端使用。
- 不要在客户端代码中暴露 `SUPABASE_SERVICE_ROLE_KEY`。
- `/admin` 通过 `ADMIN_EMAILS` 做服务端访问控制。

## 2.1）本地运行建议

这个仓库最省心的本地工作流是：

- 默认不常驻前端服务
- 只想查看当前结果时，用后台 `preview:up`
- 只有确实需要热更新时，才用 `pnpm run dev` 或 `pnpm run dev:turbo`

推荐命令：

```bash
pnpm run preview:up
pnpm run preview:down
pnpm run preview:restart
pnpm run preview:status
pnpm run dev
pnpm run dev:turbo
```

推荐习惯：

- 大多数时候让 Codex 改代码，但不要长期挂着 `next dev`
- 只想看页面结果时，运行 `pnpm run preview:up`
- 需要实时 HMR 时，再运行 `pnpm run dev`，看完就关掉

如果你在 Windows 上想要更低操作成本的预览流：

- `pnpm run preview:up`：后台构建并启动 preview
- `pnpm run preview:status`：查看 preview 是否在运行
- `pnpm run preview:down`：关闭后台 preview 服务
- `pnpm run preview:restart`：重新构建并重启 preview

如果你想手动前台运行生产模式，也仍然可以直接组合：

```bash
pnpm run build
pnpm run start
```

后台预览管理器会把运行状态写到 `.tmp/preview-server.json`，日志写到 `.tmp/preview-server.log`。

## 3）数据库初始化（Supabase SQL Editor）

执行：

- [supabase/sql/20260316_init_auth_scenes_cache.sql](/d:/WorkCode/AbandonClaw/supabase/sql/20260316_init_auth_scenes_cache.sql)
- `supabase/sql/20260316_phase2_stability_admin_cache.sql`
- `supabase/sql/20260316_phase3_learning_loop_mvp.sql`

这些脚本会创建：

- `profiles`
- `scenes`
- `scene_variants`
- `ai_cache`
- `user_scene_progress`
- `updated_at` triggers
- RLS + policies

## 4）新增服务端接口

- `GET /api/me`
- `GET /api/scenes`
- `GET /api/scenes/[slug]`
- `DELETE /api/scenes/[slug]`（仅限导入场景）
- `POST /api/scenes/import`
- `GET /api/scenes/[slug]/variants`
- `POST /api/scenes/[slug]/variants`
- `POST /api/admin/seed-scenes`（仅 admin，且幂等）
- `POST /api/learning/scenes/[slug]/start`
- `POST /api/learning/scenes/[slug]/progress`
- `POST /api/learning/scenes/[slug]/complete`
- `POST /api/learning/scenes/[slug]/pause`
- `GET /api/learning/continue`
- `GET /api/learning/dashboard`
- `GET /api/learning/progress`
- `GET /api/admin/status`

## 5）架构说明

- `(app)` 下的应用路由现在都要求登录（服务端守卫）。
- 用户首次通过鉴权访问时，会自动确保 `profile` 已存在。
- Seed scenes 会通过服务端 service 按 `slug` upsert 到数据库。
- 场景导入解析和场景变体生成使用 DB-first 缓存策略：
  - 先查 `ai_cache` / 已持久化记录
  - 未命中时再回退到 GLM 调用
  - 再把结果回写数据库

## 5.1）OpenSpec 维护流程

这个仓库已经接入 OpenSpec，用于存量项目维护和变更控制。

关键路径：

- `openspec/config.yaml`
- `openspec/specs/`
- `openspec/changes/`
- `docs/project-maintenance-playbook.md`
- `docs/openspec-workflow.md`
- `CHANGELOG.md`

推荐流程：

```bash
pnpm run spec:list
pnpm run spec:validate
node_modules\\.bin\\openspec.CMD new change <change-name>
```

规则：

- 只要改动会影响行为、数据流、缓存、测试或跨页面 UI 一致性，优先先走 OpenSpec。
- 每次真实代码或文档改动后，都要同步更新 `CHANGELOG.md`。
- 在动 `scene`、`chunks`、`review` 或 `today` 这些主链路前，优先先看 `docs/project-maintenance-playbook.md`。
- 归档 change 前，先检查 `docs/openspec-workflow.md`。

## 5.2）测试

执行：

```bash
pnpm test
pnpm run test:unit
pnpm run test:interaction
pnpm run test:interaction:cache-refresh
pnpm run test:all
pnpm run build
```

说明：

- `pnpm test` 默认只跑单元测试。
- `*.test.ts` 用于纯单元测试。
- `*.test.tsx` 用于 DOM / 交互测试。
- `pnpm run test:interaction:cache-refresh` 会跑 `scenes` / `review` / `chunks` 以及共享 pull-to-refresh 的缓存刷新回归集合。
- 具体测试约定见 [test.md](./test.md)。

## 6）鉴权链路

- Middleware 会为以下路径刷新 Supabase SSR session：
  - 受保护页面：`/scenes`、`/scene/*`、`/today`、`/review`、`/chunks`、`/progress`、`/settings`、`/lesson`、`/admin`
  - 受保护接口：`/api/me`、`/api/scenes/*`、`/api/admin/*`
- Middleware 会跳过大部分公开 API，降低额外开销。
- 未登录访问受保护页面时，会跳转到 `/login?redirect=<original-path>`。
- 已登录用户访问 `/login` 或 `/signup` 时，会跳转到 `redirect` 参数指定的安全路径；若不安全则回到 `/scenes`。
- `POST /api/auth/logout` 会清掉服务端 session。

## 7）Seed Scenes

- 可执行 seed 入口：scene service 里的 `runSeedScenesSync()`（按 `slug` 幂等 upsert）。
- 手动触发：`POST /api/admin/seed-scenes`（要求用户在 `ADMIN_EMAILS` 中）。
- 自动触发点：
  - `listScenes()`
  - `getSceneBySlug()` / `getSceneRecordBySlug()`
  - admin 场景列表 / 详情查询

## 8）Learning Status MVP

- `user_scene_progress` 当前会存：
  - `status`（`not_started/in_progress/completed/paused`）
  - `progress_percent`
  - `last_sentence_index`
  - `last_variant_index`
  - `started_at/last_viewed_at/completed_at`
  - `total_study_seconds/today_study_seconds`
  - `saved_phrase_count`
- 轻量级日聚合表：
  - `user_daily_learning_stats`
- Scene 页面行为：
  - 进入场景 => start learning
  - 关键操作 / heartbeat => update progress
  - 标记完成 => complete learning
  - 离开场景 => pause learning

## 9）缓存 Key 规则

- 解析缓存 key 包含：
  - `cache_type`、`model`、`prompt_version`、`source_language`、`source_text_hash`
- 变体缓存 key 包含：
  - `cache_type`、`model`、`prompt_version`、`scene_id`、`scene_slug`、`variantCount`、`retainChunkRatio`、`theme`
- `force regenerate` 会绕过缓存读取，并把新的模型输出重新写回缓存。
- `ai_cache` 还包含观测字段：
  - `status`、`input_hash`、`source_ref`、`meta_json`、`expires_at`

## 10）Admin 路由

- `/admin`
- `/admin/scenes`
- `/admin/scenes/[id]`（内部 DB id）
- `/admin/imported`
- `/admin/variants`
- `/admin/cache`

所有 admin 路由都通过 `requireAdmin()` 做服务端保护，只允许邮箱出现在 `ADMIN_EMAILS` 中的用户访问。

## 11）调试清单

- 验证登录跳转：
  - 在未登录状态打开受保护页面，确认跳转 URL 中包含 `?redirect=`。
- 验证缓存命中 / 未命中：
  - 对同一个 `sourceText` 连续导入两次：
    - 第一次应写入缓存
    - 第二次应命中缓存
  - 在 admin 场景详情里强制重生成 variants 时，应绕过缓存读取。
- 验证 admin 边界：
  - 非 admin 用户访问 `/admin` 时应被重定向到 `/`。
- 验证学习闭环：
  - login -> open `/scene/<slug>` -> call start
  - interact for ~1 min -> progress updates with non-zero `studySecondsDelta`
  - mark complete in scene -> status becomes `completed`, progress `100`
  - open `/today` -> `continue learning` + `today tasks` + overview from real progress
  - open `/admin` or `/api/admin/status` -> learning summary updates
