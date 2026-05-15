export type TestUserKind = "normal" | "restricted" | "admin";

export interface TestUserEnvConfig {
  normalEmail: string;
  restrictedEmail: string;
  adminEmail: string;
  password: string;
  allowedResetDomain: string | null;
  adminEmails: string[];
}

export interface SeedValidationOptions {
  requireGate?: boolean;
}

export interface ResetValidationOptions {
  requireGate?: boolean;
}

export interface SeededTestUserSpec {
  kind: TestUserKind;
  email: string;
  username: string;
  accessStatus: "active" | "readonly";
  shouldBeAdmin: boolean;
}

export interface TestAuthUser {
  id: string;
  email: string | null;
  emailConfirmedAt: string | null;
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
}

export interface EnsureAuthUserInput {
  email: string;
  password: string;
  username: string;
  kind: TestUserKind;
  emailConfirmed: boolean;
}

export interface UpsertProfileInput {
  id: string;
  username: string;
  accessStatus: "active" | "readonly";
}

export interface TestUserDataAccess {
  listAuthUsers(): Promise<TestAuthUser[]>;
  createAuthUser(input: EnsureAuthUserInput): Promise<TestAuthUser>;
  updateAuthUser(userId: string, input: EnsureAuthUserInput): Promise<TestAuthUser>;
  upsertProfile(input: UpsertProfileInput): Promise<void>;
  selectRows<T extends Record<string, unknown>>(
    table: string,
    filters: Record<string, string | string[]>,
    columns: string,
  ): Promise<T[]>;
  deleteRows(
    table: string,
    filters: Record<string, string | string[]>,
  ): Promise<number>;
}

export interface SeedTestUserResult {
  kind: TestUserKind;
  email: string;
  userId: string;
  created: boolean;
  accessStatus: "active" | "readonly";
  isAdminEnvReady: boolean;
}

export interface ResetTableResult {
  table: string;
  count: number;
}

export interface ResetTestUserResult {
  email: string;
  userId: string;
  tables: ResetTableResult[];
}

const REQUIRED_SEED_ENV = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "TEST_USER_PASSWORD",
  "TEST_NORMAL_EMAIL",
  "TEST_RESTRICTED_EMAIL",
  "TEST_ADMIN_EMAIL",
] as const;

const normalizeBooleanEnv = (value: string | undefined) =>
  value?.trim().toLowerCase() === "true";

const normalizeEmail = (value: string | undefined, envName: string) => {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized || !normalized.includes("@")) {
    throw new Error(`缺少或非法 env: ${envName}`);
  }
  return normalized;
};

const normalizeNonEmpty = (value: string | undefined, envName: string) => {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    throw new Error(`缺少 env: ${envName}`);
  }
  return normalized;
};

const normalizeEmailList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const loadTestUserEnvConfig = (
  env: NodeJS.ProcessEnv = process.env,
  options?: {
    requirePassword?: boolean;
  },
): TestUserEnvConfig => {
  const password = options?.requirePassword === false ? (env.TEST_USER_PASSWORD?.trim() ?? "") : normalizeNonEmpty(env.TEST_USER_PASSWORD, "TEST_USER_PASSWORD");

  return {
    normalEmail: normalizeEmail(env.TEST_NORMAL_EMAIL, "TEST_NORMAL_EMAIL"),
    restrictedEmail: normalizeEmail(env.TEST_RESTRICTED_EMAIL, "TEST_RESTRICTED_EMAIL"),
    adminEmail: normalizeEmail(env.TEST_ADMIN_EMAIL, "TEST_ADMIN_EMAIL"),
    password,
    allowedResetDomain: env.TEST_USER_ALLOWED_DOMAIN?.trim().toLowerCase() || null,
    adminEmails: normalizeEmailList(env.ADMIN_EMAILS),
  };
};

export const validateSeedEnv = (
  env: NodeJS.ProcessEnv = process.env,
  options: SeedValidationOptions = {},
) => {
  const requireGate = options.requireGate !== false;
  if (requireGate && !normalizeBooleanEnv(env.ALLOW_TEST_USER_SEED)) {
    throw new Error("拒绝执行：需要显式设置 ALLOW_TEST_USER_SEED=true");
  }

  for (const name of REQUIRED_SEED_ENV) {
    normalizeNonEmpty(env[name], name);
  }

  return loadTestUserEnvConfig(env);
};

export const validateResetEnv = (
  env: NodeJS.ProcessEnv = process.env,
  options: ResetValidationOptions = {},
) => {
  const requireGate = options.requireGate !== false;
  if (requireGate && !normalizeBooleanEnv(env.ALLOW_TEST_USER_RESET)) {
    throw new Error("拒绝执行：需要显式设置 ALLOW_TEST_USER_RESET=true");
  }

  normalizeNonEmpty(env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  const config = loadTestUserEnvConfig(env, { requirePassword: false });
  const whitelist = getAllowedResetEmails(config);

  if (whitelist.length === 0 && !config.allowedResetDomain) {
    throw new Error("拒绝执行：未配置测试账号白名单，且未配置 TEST_USER_ALLOWED_DOMAIN");
  }

  return config;
};

export const getAllowedResetEmails = (config: TestUserEnvConfig) =>
  Array.from(new Set([config.normalEmail, config.restrictedEmail, config.adminEmail]));

export const isAllowedResetEmail = (email: string, config: TestUserEnvConfig) => {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return false;
  if (getAllowedResetEmails(config).includes(normalized)) return true;
  if (!config.allowedResetDomain) return false;
  return normalized.endsWith(`@${config.allowedResetDomain}`);
};

export const getSeededTestUserSpecs = (config: TestUserEnvConfig): SeededTestUserSpec[] => [
  {
    kind: "normal",
    email: config.normalEmail,
    username: "test-normal",
    accessStatus: "active",
    shouldBeAdmin: false,
  },
  {
    kind: "restricted",
    email: config.restrictedEmail,
    username: "test-restricted",
    accessStatus: "readonly",
    shouldBeAdmin: false,
  },
  {
    kind: "admin",
    email: config.adminEmail,
    username: "test-admin",
    accessStatus: "active",
    shouldBeAdmin: true,
  },
];

export const isAdminEnvReady = (email: string, config: TestUserEnvConfig) =>
  config.adminEmails.includes(email.trim().toLowerCase());

export async function seedTestUsers(
  config: TestUserEnvConfig,
  deps: TestUserDataAccess,
): Promise<SeedTestUserResult[]> {
  const existingUsers = await deps.listAuthUsers();
  const existingByEmail = new Map(
    existingUsers
      .map((user) => [user.email?.trim().toLowerCase() ?? "", user] as const)
      .filter(([email]) => Boolean(email)),
  );

  const results: SeedTestUserResult[] = [];

  for (const spec of getSeededTestUserSpecs(config)) {
    const payload: EnsureAuthUserInput = {
      email: spec.email,
      password: config.password,
      username: spec.username,
      kind: spec.kind,
      emailConfirmed: true,
    };
    const existing = existingByEmail.get(spec.email) ?? null;
    const authUser = existing
      ? await deps.updateAuthUser(existing.id, payload)
      : await deps.createAuthUser(payload);

    await deps.upsertProfile({
      id: authUser.id,
      username: spec.username,
      accessStatus: spec.accessStatus,
    });

    results.push({
      kind: spec.kind,
      email: spec.email,
      userId: authUser.id,
      created: !existing,
      accessStatus: spec.accessStatus,
      isAdminEnvReady: spec.shouldBeAdmin ? isAdminEnvReady(spec.email, config) : false,
    });
  }

  return results;
}

const findAuthUserByEmail = async (
  email: string,
  deps: TestUserDataAccess,
) => {
  const normalized = email.trim().toLowerCase();
  const users = await deps.listAuthUsers();
  return (
    users.find((user) => user.email?.trim().toLowerCase() === normalized) ?? null
  );
};

const isMissingTableError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Could not find the table") ||
    message.includes("relation") && message.includes("does not exist")
  );
};

const selectRowsOrEmpty = async <T extends Record<string, unknown>>(
  deps: TestUserDataAccess,
  table: string,
  filters: Record<string, string | string[]>,
  columns: string,
) => {
  try {
    return await deps.selectRows<T>(table, filters, columns);
  } catch (error) {
    if (isMissingTableError(error)) {
      return [] as T[];
    }
    throw error;
  }
};

const appendDeleteResult = async (
  results: ResetTableResult[],
  deps: TestUserDataAccess,
  table: string,
  filters: Record<string, string | string[]>,
) => {
  let count = 0;
  try {
    count = await deps.deleteRows(table, filters);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }
  results.push({ table, count });
};

export async function resetTestUserData(
  email: string,
  config: TestUserEnvConfig,
  deps: TestUserDataAccess,
): Promise<ResetTestUserResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isAllowedResetEmail(normalizedEmail, config)) {
    throw new Error(`拒绝重置：${normalizedEmail} 不在测试账号白名单内`);
  }

  const authUser = await findAuthUserByEmail(normalizedEmail, deps);
  if (!authUser) {
    throw new Error(`测试账号不存在：${normalizedEmail}`);
  }

  const userId = authUser.id;
  const results: ResetTableResult[] = [];

  const userPhraseRows = await selectRowsOrEmpty<{ id: string }>(
    deps,
    "user_phrases",
    { user_id: userId },
    "id",
  );
  const userPhraseIds = userPhraseRows
    .map((row) => String(row.id))
    .filter(Boolean);

  const clusterRows = await selectRowsOrEmpty<{ id: string }>(
    deps,
    "user_expression_clusters",
    { user_id: userId },
    "id",
  );
  const clusterIds = clusterRows
    .map((row) => String(row.id))
    .filter(Boolean);

  await appendDeleteResult(results, deps, "scene_phrase_recommendation_states", { user_id: userId });
  await appendDeleteResult(results, deps, "phrase_review_logs", { user_id: userId });
  await appendDeleteResult(results, deps, "user_phrase_relations", { user_id: userId });
  await appendDeleteResult(results, deps, "user_chunks", { user_id: userId });

  if (userPhraseIds.length > 0) {
    await appendDeleteResult(results, deps, "user_expression_cluster_members", {
      user_phrase_id: userPhraseIds,
    });
  }
  if (clusterIds.length > 0) {
    await appendDeleteResult(results, deps, "user_expression_cluster_members", {
      cluster_id: clusterIds,
    });
  }

  await appendDeleteResult(results, deps, "user_expression_clusters", { user_id: userId });
  await appendDeleteResult(results, deps, "user_phrases", { user_id: userId });
  await appendDeleteResult(results, deps, "user_daily_learning_stats", { user_id: userId });
  await appendDeleteResult(results, deps, "user_scene_practice_attempts", { user_id: userId });
  await appendDeleteResult(results, deps, "user_scene_practice_runs", { user_id: userId });
  await appendDeleteResult(results, deps, "user_scene_practice_sets", { user_id: userId });
  await appendDeleteResult(results, deps, "user_scene_variant_runs", { user_id: userId });
  await appendDeleteResult(results, deps, "user_scene_sessions", { user_id: userId });
  await appendDeleteResult(results, deps, "user_scene_progress", { user_id: userId });

  return {
    email: normalizedEmail,
    userId,
    tables: results,
  };
}
