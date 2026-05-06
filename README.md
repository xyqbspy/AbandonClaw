# AbandonClaw

基于 Next.js + Supabase 的英语学习应用，包含服务端场景存储、鉴权和 AI 缓存能力。

## 1）环境准备

```bash
pnpm install
cp .env.example .env.local
pnpm run dev
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
- 需要看页面或排查交互时，临时使用 `pnpm run dev`
- 需要确认生产构建时，手动组合 `pnpm run build` 和 `pnpm run start`
- 不再保留后台 preview 管理脚本，避免隐藏进程与状态文件带来的误判

本地开发命令：

```bash
pnpm run dev
```

生产模式验证命令：

```bash
pnpm run build
pnpm run start
```

推荐习惯：

- 大多数时候让 Codex 改代码，不长期挂着 `next dev`
- 需要 HMR 或人工看页面时，再临时运行 `pnpm run dev`，看完就关掉
- 需要排查生产模式差异时，使用 `build` + `start` 前台运行

说明：

- `pnpm run dev` 是仓库级默认本地开发入口
- `pnpm run dev:turbo` 不再作为默认推荐入口

## 3）数据库初始化（Supabase SQL Editor）

最小初始化参考：

- [supabase/sql/20260316_init_auth_scenes_cache.sql](/d:/WorkCode/AbandonClaw/supabase/sql/20260316_init_auth_scenes_cache.sql)
- `supabase/sql/20260316_phase2_stability_admin_cache.sql`
- `supabase/sql/20260316_phase3_learning_loop_mvp.sql`

这些脚本会创建基础表：

- `profiles`
- `scenes`
- `scene_variants`
- `ai_cache`
- `user_scene_progress`
- `updated_at` triggers
- RLS + policies

完整数据库演进脚本在 `supabase/sql/` 下，按文件名前缀顺序维护；具体数据边界和上线前检查见 `docs/dev/backend-release-readiness-checklist.md`。

## 4）文档入口

根 README 只保留启动和索引。业务语义、维护流程、测试策略和上线检查从下面入口继续读：

- 文档总入口：[docs/README.md](/d:/WorkCode/AbandonClaw/docs/README.md)
- 产品总览：[docs/meta/product-overview.md](/d:/WorkCode/AbandonClaw/docs/meta/product-overview.md)
- 技术总览：[docs/meta/technical-overview.md](/d:/WorkCode/AbandonClaw/docs/meta/technical-overview.md)
- 维护入口：[docs/dev/README.md](/d:/WorkCode/AbandonClaw/docs/dev/README.md)
- 维护手册：[docs/dev/project-maintenance-playbook.md](/d:/WorkCode/AbandonClaw/docs/dev/project-maintenance-playbook.md)
- 测试指南：[test.md](/d:/WorkCode/AbandonClaw/test.md) 与 [docs/dev/testing-policy.md](/d:/WorkCode/AbandonClaw/docs/dev/testing-policy.md)
- 上线检查：[docs/dev/backend-release-readiness-checklist.md](/d:/WorkCode/AbandonClaw/docs/dev/backend-release-readiness-checklist.md)

常见业务入口：

- 学习闭环、页面主链路、状态回写：先看 `docs/README.md` 的高频问题入口。
- 音频 / TTS / review pack：先看 `docs/system-design/audio-tts-pipeline.md`。
- OpenSpec / dev-log / CHANGELOG 收尾：先看 `docs/dev/README.md`。

## 5）常用命令

```bash
pnpm test
pnpm run test:unit
pnpm run test:interaction
pnpm run test:interaction:cache-refresh
pnpm run test:all
pnpm run build
pnpm run text:check-mojibake
pnpm run maintenance:check
```

说明：

- `pnpm test` 默认只跑单元测试。
- `*.test.ts` 用于纯单元测试。
- `*.test.tsx` 用于 DOM / 交互测试。
- `pnpm run test:interaction:cache-refresh` 会跑 `scenes` / `review` / `chunks` 以及共享 pull-to-refresh 的缓存刷新回归集合。
- `pnpm run text:check-mojibake` 检查文档是否出现高置信乱码。
- `pnpm run maintenance:check` 检查 OpenSpec 校验、active change 收尾状态和维护护栏。
- 具体测试约定见 [test.md](/d:/WorkCode/AbandonClaw/test.md)；AI 协作测试策略见 [docs/dev/testing-policy.md](/d:/WorkCode/AbandonClaw/docs/dev/testing-policy.md)。

默认只跑最小相关测试；改动触及主链路、状态流、缓存、权限或上线收尾时，再按 `docs/dev/testing-policy.md` 和对应 feature-flow 扩大验证范围。
