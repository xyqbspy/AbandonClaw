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

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Notes:
- `GLM_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code.

## 3) Database Init (Supabase SQL Editor)

Run:
- [supabase/sql/20260316_init_auth_scenes_cache.sql](/d:/WorkCode/AbandonClaw/supabase/sql/20260316_init_auth_scenes_cache.sql)

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
- `GET /api/scenes/[sceneId]/variants`
- `POST /api/scenes/[sceneId]/variants`

## 5) Architecture Notes

- App routes under `(app)` now require auth (server-side guard).
- First authenticated request ensures profile exists.
- Seed scenes are upserted to DB by slug via server service.
- Scene import parse and scene variants generation use DB-first cache:
  - check `ai_cache` / persisted records first
  - fallback to GLM call
  - write back to DB
