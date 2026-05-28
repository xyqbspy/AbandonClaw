-- Phase 26: Anonymous trial mode (enable-anonymous-trial-mode) - 公共内容表 anon SELECT 策略
-- 配套灰度分享链接(/share/scene/[slug])下未登录访客 SSR 直读公共场景 / 表达 / chunks 的需求;
-- 用户态表(user_* / phrase_review_logs / user_daily_high_cost_usage 等)继续依赖 RLS 默认 deny 行为对 anon 关闭。

-- ============================================================================
-- 1) scenes: anon 仅能 SELECT 公开场景
-- ----------------------------------------------------------------------------
-- 现状: 仅 authenticated 可见 (is_public OR created_by = auth.uid())
-- 调整: 新增 anon 专用策略, 限制为 is_public = true; created_by 字段对 anon 透出但仅出现在公开行内, 无 PII 泄漏。
drop policy if exists "scenes_select_anon_public" on public.scenes;
create policy "scenes_select_anon_public"
on public.scenes for select
to anon
using (is_public = true);

-- ============================================================================
-- 2) scene_variants: anon 仅能 SELECT 公开场景关联的变体
-- ----------------------------------------------------------------------------
drop policy if exists "scene_variants_select_anon_public" on public.scene_variants;
create policy "scene_variants_select_anon_public"
on public.scene_variants for select
to anon
using (
  exists (
    select 1
    from public.scenes s
    where s.id = scene_variants.scene_id
      and s.is_public = true
  )
);

-- ============================================================================
-- 3) chunks: anon 可直接 SELECT 所有 chunks(全部为词条/语块,非用户态)
-- ----------------------------------------------------------------------------
drop policy if exists "chunks_select_anon" on public.chunks;
create policy "chunks_select_anon"
on public.chunks for select
to anon
using (true);

-- ============================================================================
-- 4) phrases: anon 仅能 SELECT 内置/核心表达(is_builtin OR is_core),用户自定义保存的表达不暴露
-- ----------------------------------------------------------------------------
drop policy if exists "phrases_select_anon_builtin" on public.phrases;
create policy "phrases_select_anon_builtin"
on public.phrases for select
to anon
using (is_builtin = true or is_core = true);

-- ============================================================================
-- 5) ai_cache: 不对 anon 暴露
-- ----------------------------------------------------------------------------
-- 说明: ai_cache 包含模型完整输入/输出, 属内部数据, 已通过缺失 anon 策略默认 deny。
-- 不在此处补任何 anon 策略, 保持现状(仅 authenticated SELECT + service_role 写入)。

-- ============================================================================
-- 6) 用户态表 anon 访问验证(deny-by-default,但显式记录预期行为)
-- ----------------------------------------------------------------------------
-- 以下用户态表均已 enable RLS 且没有任何 anon policy, 因此 anon role 自动被拒绝。
-- 维护提醒: 未来新增 user_* / *_logs / *_anomalies / *_sessions / *_attempts / *_runs / *_sets 等
-- 用户态表时, 必须保持 "to anon" 缺失策略以默认 deny。
--
-- 当前已验证仅 to authenticated:
--   - public.profiles
--   - public.user_scene_progress
--   - public.user_chunks
--   - public.user_phrases
--   - public.user_phrase_relations
--   - public.user_scene_sessions
--   - public.user_scene_practice_runs
--   - public.user_scene_practice_attempts
--   - public.user_scene_practice_sets
--   - public.user_scene_variant_runs
--   - public.user_expression_clusters
--   - public.user_expression_cluster_members
--   - public.user_daily_learning_stats
--   - public.user_daily_high_cost_usage
--   - public.phrase_review_logs
--   - public.scene_phrase_recommendation_state
--   - public.learning_study_time_anomalies
--
-- 配套静态测试 (src/lib/server/anonymous/rls-policy-audit.test.ts) 解析本目录 SQL 文件,
-- 校验上述表均无 anon 策略, 防止未来人为破坏 deny-by-default 不变量。
