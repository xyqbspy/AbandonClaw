# AbandonClaw

Next.js + Supabase English-learning app with server-side scene storage, auth, and AI cache.

## 1) Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## 2) Required Env

```bash
GLM_API_KEY=
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
GLM_MODEL=glm-4.6

NEXT_PUBLIC_SUPABASE_URL=  # or SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # or SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=your-admin@example.com,another-admin@example.com
```

Notes:
- `GLM_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
- `/admin` uses `ADMIN_EMAILS` for server-side access control.

## 3) Database Init (Supabase SQL Editor)

Run:
- [supabase/sql/20260316_init_auth_scenes_cache.sql](/d:/WorkCode/AbandonClaw/supabase/sql/20260316_init_auth_scenes_cache.sql)
- `supabase/sql/20260316_phase2_stability_admin_cache.sql`
- `supabase/sql/20260316_phase3_learning_loop_mvp.sql`

This creates:
- `profiles`
- `scenes`
- `scene_variants`
- `ai_cache`
- `user_scene_progress`
- `updated_at` triggers
- RLS + policies

## 4) New Server APIs

- `GET /api/me`
- `GET /api/scenes`
- `GET /api/scenes/[slug]`
- `DELETE /api/scenes/[slug]` (imported scenes only)
- `POST /api/scenes/import`
- `GET /api/scenes/[slug]/variants`
- `POST /api/scenes/[slug]/variants`
- `POST /api/admin/seed-scenes` (admin only, idempotent)
- `POST /api/learning/scenes/[slug]/start`
- `POST /api/learning/scenes/[slug]/progress`
- `POST /api/learning/scenes/[slug]/complete`
- `POST /api/learning/scenes/[slug]/pause`
- `GET /api/learning/continue`
- `GET /api/learning/dashboard`
- `GET /api/learning/progress`
- `GET /api/admin/status`

## 5) Architecture Notes

- App routes under `(app)` now require auth (server-side guard).
- First authenticated request ensures profile exists.
- Seed scenes are upserted to DB by slug via server service.
- Scene import parse and scene variants generation use DB-first cache:
  - check `ai_cache` / persisted records first
  - fallback to GLM call
  - write back to DB

## 5.1) Testing

Run:

```bash
pnpm test
pnpm run test:unit
pnpm run test:interaction
pnpm run test:interaction:cache-refresh
pnpm run test:all
pnpm run build
```

Notes:
- `pnpm test` defaults to unit tests only.
- `*.test.ts` is for pure unit tests.
- `*.test.tsx` is for DOM / interaction tests.
- `pnpm run test:interaction:cache-refresh` runs the focused cache-refresh regression set for `scenes` / `review` / `chunks` and shared pull-to-refresh behavior.
- See [test.md](./test.md) for the project testing conventions.

## 6) Auth Flow

- Middleware refreshes Supabase SSR session for:
  - protected pages (`/scenes`, `/scene/*`, `/today`, `/review`, `/chunks`, `/progress`, `/settings`, `/lesson`, `/admin`)
  - protected APIs (`/api/me`, `/api/scenes/*`, `/api/admin/*`)
- Middleware skips most public APIs to reduce overhead.
- Unauthenticated page access redirects to `/login?redirect=<original-path>`.
- Logged-in users visiting `/login` or `/signup` are redirected to `redirect` query (if safe path) or `/scenes`.
- `POST /api/auth/logout` clears server session.

## 7) Seed Scenes

- Executable seed entry: `runSeedScenesSync()` in scene service (idempotent upsert by `slug`).
- Manual trigger: `POST /api/admin/seed-scenes` (requires admin user from `ADMIN_EMAILS`).
- Auto trigger:
  - `listScenes()`
  - `getSceneBySlug()` / `getSceneRecordBySlug()`
  - admin scene list/detail queries

## 8) Learning Status MVP

- `user_scene_progress` now stores:
  - `status` (`not_started/in_progress/completed/paused`)
  - `progress_percent`
  - `last_sentence_index`
  - `last_variant_index`
  - `started_at/last_viewed_at/completed_at`
  - `total_study_seconds/today_study_seconds`
  - `saved_phrase_count`
- Lightweight daily aggregation table:
  - `user_daily_learning_stats`
- Scene page behavior:
  - enter scene => start learning
  - key actions / heartbeat => update progress
  - mark complete => complete learning
  - leave scene => pause learning

## 9) Cache Key Rules

- Parse cache key includes:
  - `cache_type`, `model`, `prompt_version`, `source_language`, `source_text_hash`
- Variant cache key includes:
  - `cache_type`, `model`, `prompt_version`, `scene_id`, `scene_slug`, `variantCount`, `retainChunkRatio`, `theme`
- `force` regenerate bypasses cache reads and writes fresh model output back to cache.
- `ai_cache` includes observability metadata:
  - `status`, `input_hash`, `source_ref`, `meta_json`, `expires_at`

## 10) Admin Routes

- `/admin`
- `/admin/scenes`
- `/admin/scenes/[id]` (internal DB id)
- `/admin/imported`
- `/admin/variants`
- `/admin/cache`

All admin routes are server-protected by `requireAdmin()` and only allow users whose email appears in `ADMIN_EMAILS`.

## 11) Debug Checklist

- Verify login redirect:
  - Open a protected page when logged out and confirm redirect contains `?redirect=`.
- Verify cache hit/miss:
  - Import same `sourceText` twice:
    - first call should write cache
    - second call should hit cache
  - Force regenerate variants in admin scene detail should bypass cache read.
- Verify admin boundary:
  - Non-admin user accessing `/admin` should be redirected to `/`.
- Verify learning loop:
  - login -> open `/scene/<slug>` -> call start
  - interact for ~1 min -> progress updates with non-zero `studySecondsDelta`
  - mark complete in scene -> status becomes `completed`, progress `100`
  - open `/today` -> `continue learning` + `today tasks` + overview from real progress
  - open `/admin` or `/api/admin/status` -> learning summary updates
