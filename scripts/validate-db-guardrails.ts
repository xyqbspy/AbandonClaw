import fs from "node:fs";
import path from "node:path";

type GuardrailCheck = {
  table: string;
  file: string;
  patterns: string[];
};

const projectRoot = process.cwd();

const checks: GuardrailCheck[] = [
  {
    table: "user_scene_progress",
    file: "supabase/sql/20260316_init_auth_scenes_cache.sql",
    patterns: [
      "alter table public.user_scene_progress enable row level security;",
      'create policy "user_scene_progress_select_own"',
      'create policy "user_scene_progress_insert_own"',
      'create policy "user_scene_progress_update_own"',
      'create policy "user_scene_progress_delete_own"',
    ],
  },
  {
    table: "user_daily_learning_stats",
    file: "supabase/sql/20260316_phase3_learning_loop_mvp.sql",
    patterns: [
      "alter table public.user_daily_learning_stats enable row level security;",
      'create policy "user_daily_learning_stats_select_own"',
      'create policy "user_daily_learning_stats_insert_own"',
      'create policy "user_daily_learning_stats_update_own"',
      'create policy "user_daily_learning_stats_delete_own"',
    ],
  },
  {
    table: "user_scene_sessions",
    file: "supabase/sql/20260324_phase16_scene_training_station_mvp.sql",
    patterns: [
      "alter table public.user_scene_sessions enable row level security;",
      'create policy "user_scene_sessions_select_own"',
      'create policy "user_scene_sessions_insert_own"',
      'create policy "user_scene_sessions_update_own"',
      'create policy "user_scene_sessions_delete_own"',
    ],
  },
  {
    table: "user_phrases",
    file: "supabase/sql/20260317_phrase_favorites_mvp.sql",
    patterns: [
      "alter table public.user_phrases enable row level security;",
      'create policy "user_phrases_select_own"',
      'create policy "user_phrases_insert_own"',
      'create policy "user_phrases_update_own"',
      'create policy "user_phrases_delete_own"',
    ],
  },
  {
    table: "phrase_review_logs",
    file: "supabase/sql/20260317_phase6_review_loop_mvp.sql",
    patterns: [
      "alter table public.phrase_review_logs enable row level security;",
      'create policy "phrase_review_logs_select_own"',
      'create policy "phrase_review_logs_insert_own"',
    ],
  },
  {
    table: "user_phrase_relations",
    file: "supabase/sql/20260321_phase13_user_phrase_relations.sql",
    patterns: [
      "alter table public.user_phrase_relations enable row level security;",
      'create policy "user_phrase_relations_select_own"',
      'create policy "user_phrase_relations_insert_own"',
      'create policy "user_phrase_relations_update_own"',
      'create policy "user_phrase_relations_delete_own"',
    ],
  },
  {
    table: "user_expression_clusters",
    file: "supabase/sql/20260321_phase14_expression_clusters.sql",
    patterns: [
      "alter table public.user_expression_clusters enable row level security;",
      'create policy "user_expression_clusters_select_own"',
      'create policy "user_expression_clusters_insert_own"',
      'create policy "user_expression_clusters_update_own"',
      'create policy "user_expression_clusters_delete_own"',
    ],
  },
  {
    table: "user_expression_cluster_members",
    file: "supabase/sql/20260321_phase14_expression_clusters.sql",
    patterns: [
      "alter table public.user_expression_cluster_members enable row level security;",
      'create policy "user_expression_cluster_members_select_own"',
      'create policy "user_expression_cluster_members_insert_own"',
      'create policy "user_expression_cluster_members_update_own"',
      'create policy "user_expression_cluster_members_delete_own"',
    ],
  },
  {
    table: "user_scene_practice_runs",
    file: "supabase/sql/20260324_phase17_scene_practice_runs_mvp.sql",
    patterns: [
      "alter table public.user_scene_practice_runs enable row level security;",
      'create policy "user_scene_practice_runs_select_own"',
      'create policy "user_scene_practice_runs_insert_own"',
      'create policy "user_scene_practice_runs_update_own"',
      'create policy "user_scene_practice_runs_delete_own"',
    ],
  },
  {
    table: "user_scene_practice_attempts",
    file: "supabase/sql/20260324_phase17_scene_practice_runs_mvp.sql",
    patterns: [
      "alter table public.user_scene_practice_attempts enable row level security;",
      'create policy "user_scene_practice_attempts_select_own"',
      'create policy "user_scene_practice_attempts_insert_own"',
      'create policy "user_scene_practice_attempts_delete_own"',
    ],
  },
  {
    table: "user_scene_variant_runs",
    file: "supabase/sql/20260325_phase18_scene_variant_runs_mvp.sql",
    patterns: [
      "alter table public.user_scene_variant_runs enable row level security;",
      'create policy "user_scene_variant_runs_select_own"',
      'create policy "user_scene_variant_runs_insert_own"',
      'create policy "user_scene_variant_runs_update_own"',
      'create policy "user_scene_variant_runs_delete_own"',
    ],
  },
];

const readFile = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const results = checks.map((check) => {
  const content = readFile(check.file);
  const missing = check.patterns.filter((pattern) => !content.includes(pattern));
  return {
    ...check,
    missing,
    ok: missing.length === 0,
  };
});

const failed = results.filter((result) => !result.ok);

console.log(
  JSON.stringify(
    {
      checkedAt: new Date().toISOString(),
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      results: results.map(({ table, file, ok, missing }) => ({
        table,
        file,
        ok,
        missing,
      })),
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exitCode = 1;
}
