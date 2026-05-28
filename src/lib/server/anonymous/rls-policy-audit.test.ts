import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const SQL_DIR = resolve(__dirname, "..", "..", "..", "..", "supabase", "sql");
const RLS_MIGRATION_FILE = "20260528_phase26_anonymous_rls_public_content.sql";

const readAllMigrationSql = () => {
  const files = readdirSync(SQL_DIR).filter((name) => name.endsWith(".sql"));
  return files
    .map((name) => ({ name, content: readFileSync(join(SQL_DIR, name), "utf-8") }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const PUBLIC_CONTENT_TABLES = ["scenes", "scene_variants", "chunks", "phrases"];

const USER_STATE_TABLES = [
  "profiles",
  "user_scene_progress",
  "user_chunks",
  "user_phrases",
  "user_phrase_relations",
  "user_scene_sessions",
  "user_scene_practice_runs",
  "user_scene_practice_attempts",
  "user_scene_practice_sets",
  "user_scene_variant_runs",
  "user_expression_clusters",
  "user_expression_cluster_members",
  "user_daily_learning_stats",
  "user_daily_high_cost_usage",
  "phrase_review_logs",
  "scene_phrase_recommendation_state",
  "learning_study_time_anomalies",
];

interface PolicyDescriptor {
  policyName: string;
  table: string;
  command: string;
  roles: string[];
  usingClause: string;
  withCheckClause: string;
  sourceFile: string;
}

const POLICY_REGEX =
  /create\s+policy\s+"?([A-Za-z0-9_\-]+)"?\s+on\s+public\.([A-Za-z0-9_]+)\s+for\s+(select|insert|update|delete|all)\s+to\s+([A-Za-z0-9_, \t]+?)(?:\s+using\s*\(([^;]*?)\))?(?:\s+with\s+check\s*\(([^;]*?)\))?\s*;/gi;

const extractPolicies = (): PolicyDescriptor[] => {
  const files = readAllMigrationSql();
  const policies: PolicyDescriptor[] = [];
  for (const { name, content } of files) {
    let match: RegExpExecArray | null;
    while ((match = POLICY_REGEX.exec(content)) !== null) {
      const [, policyName, table, command, rolesRaw, usingRaw, withCheckRaw] = match;
      policies.push({
        policyName,
        table,
        command: command.toLowerCase(),
        roles: rolesRaw
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
        usingClause: (usingRaw ?? "").trim(),
        withCheckClause: (withCheckRaw ?? "").trim(),
        sourceFile: name,
      });
    }
  }
  return policies;
};

test("phase26 RLS migration 为 4 个公共内容表挂上 anon SELECT 策略", () => {
  const phase26 = readFileSync(join(SQL_DIR, RLS_MIGRATION_FILE), "utf-8").toLowerCase();
  for (const table of PUBLIC_CONTENT_TABLES) {
    assert.match(
      phase26,
      new RegExp(`create\\s+policy\\s+"[^"]+"\\s+on\\s+public\\.${table}\\s+for\\s+select\\s+to\\s+anon`, "i"),
      `phase26 应为 ${table} 创建 anon SELECT 策略`,
    );
  }
});

test("scenes anon 策略仅放行 is_public = true 公开场景", () => {
  const policies = extractPolicies();
  const scenesAnonPolicies = policies.filter(
    (p) =>
      p.table === "scenes" &&
      p.command === "select" &&
      p.roles.includes("anon"),
  );
  assert.equal(scenesAnonPolicies.length, 1, "scenes 仅应有 1 条 anon SELECT 策略");
  assert.match(
    scenesAnonPolicies[0].usingClause.toLowerCase().replace(/\s+/g, " "),
    /is_public\s*=\s*true/,
    "scenes anon 策略 USING 子句必须限制 is_public = true",
  );
});

test("scene_variants anon 策略通过父 scene is_public 关联放行", () => {
  const policies = extractPolicies();
  const variantsAnonPolicies = policies.filter(
    (p) =>
      p.table === "scene_variants" &&
      p.command === "select" &&
      p.roles.includes("anon"),
  );
  assert.equal(variantsAnonPolicies.length, 1, "scene_variants 仅应有 1 条 anon SELECT 策略");
  const usingNormalized = variantsAnonPolicies[0].usingClause.toLowerCase().replace(/\s+/g, " ");
  assert.match(usingNormalized, /from public\.scenes/);
  assert.match(usingNormalized, /is_public\s*=\s*true/);
});

test("chunks anon 策略放行全部 chunks (词条/语块视为公开词典)", () => {
  const policies = extractPolicies();
  const chunksAnonPolicies = policies.filter(
    (p) =>
      p.table === "chunks" &&
      p.command === "select" &&
      p.roles.includes("anon"),
  );
  assert.equal(chunksAnonPolicies.length, 1, "chunks 仅应有 1 条 anon SELECT 策略");
  assert.match(
    chunksAnonPolicies[0].usingClause.toLowerCase(),
    /true/,
    "chunks anon 策略 USING 子句必须为 true (全表可读)",
  );
});

test("phrases anon 策略仅放行 is_builtin/is_core 表达,用户自定义表达不暴露", () => {
  const policies = extractPolicies();
  const phrasesAnonPolicies = policies.filter(
    (p) =>
      p.table === "phrases" &&
      p.command === "select" &&
      p.roles.includes("anon"),
  );
  assert.equal(phrasesAnonPolicies.length, 1, "phrases 仅应有 1 条 anon SELECT 策略");
  const usingNormalized = phrasesAnonPolicies[0].usingClause.toLowerCase().replace(/\s+/g, " ");
  assert.match(usingNormalized, /is_builtin\s*=\s*true/);
  assert.match(usingNormalized, /is_core\s*=\s*true/);
});

test("ai_cache 不对 anon 暴露(默认 deny)", () => {
  const policies = extractPolicies();
  const aiCacheAnonPolicies = policies.filter(
    (p) =>
      p.table === "ai_cache" &&
      p.roles.includes("anon"),
  );
  assert.equal(
    aiCacheAnonPolicies.length,
    0,
    "ai_cache 内部缓存表不应对 anon 开放,违反请提交 design + 单独 spec 评审",
  );
});

test("所有用户态表均无 anon policy(deny-by-default 不变量)", () => {
  const policies = extractPolicies();
  const violations: string[] = [];
  for (const table of USER_STATE_TABLES) {
    const anonPolicies = policies.filter(
      (p) => p.table === table && p.roles.includes("anon"),
    );
    if (anonPolicies.length > 0) {
      violations.push(
        `${table}: ${anonPolicies
          .map((p) => `${p.policyName} (${p.sourceFile})`)
          .join(", ")}`,
      );
    }
  }
  assert.equal(
    violations.length,
    0,
    `用户态表禁止对 anon 开放任何策略, 检测到违规:\n${violations.join("\n")}`,
  );
});

test("anonymous_sessions / anonymous_funnel_events / daily_anon_cost_report 对 anon 显式 deny", () => {
  const policies = extractPolicies();
  const blocked = ["anonymous_sessions", "anonymous_funnel_events", "daily_anon_cost_report"];
  for (const table of blocked) {
    const anonPolicies = policies.filter(
      (p) => p.table === table && p.roles.includes("anon"),
    );
    assert.ok(
      anonPolicies.length >= 1,
      `${table} 应当至少有 1 条 anon 显式 deny 策略 (using false)`,
    );
    for (const p of anonPolicies) {
      assert.match(
        p.usingClause.toLowerCase(),
        /false/,
        `${table}.${p.policyName} USING 必须为 false (拒绝 anon 直读)`,
      );
    }
  }
});
