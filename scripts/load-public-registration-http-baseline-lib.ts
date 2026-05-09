import type { RegistrationMode } from "@/lib/server/registration";
import {
  getCliArg,
  loadDefaultEnvFiles,
  readBodyFile,
  readJsonFile,
  RequestConfig,
  runLoad,
  runRequest,
  toBodyPreview,
  writeJsonFile,
} from "./load-api-baseline-lib";

type RawConfigFile = Partial<Record<string, unknown>>;

type ScenarioStatus = "passed" | "failed" | "blocked";

type ScenarioGroup =
  | "registration"
  | "email-verification"
  | "origin-and-rate-limit"
  | "quota-and-access"
  | "admin-status";

export type PublicBaselineConfig = {
  baseUrl: string;
  origin: string | null;
  invalidOrigin: string;
  expectedRegistrationMode: RegistrationMode | null;
  scenario: string;
  outputPath: string | null;
  dryRun: boolean;
  signupEmailPrefix: string | null;
  signupEmailDomain: string | null;
  signupPassword: string | null;
  signupUsername: string | null;
  inviteCode: string | null;
  verifiedCookie: string | null;
  unverifiedCookie: string | null;
  generationLimitedCookie: string | null;
  readonlyCookie: string | null;
  quotaExceededCookie: string | null;
  adminCookie: string | null;
  ipLimitCookies: string[];
  practiceGenerateBody: string;
  phraseSaveBody: string;
};

export type ScenarioResult = {
  name: string;
  group: ScenarioGroup;
  status: ScenarioStatus;
  description: string;
  reason?: string;
  expected?: Record<string, unknown>;
  actual?: Record<string, unknown>;
};

type ScenarioDefinition = {
  name: string;
  group: ScenarioGroup;
  description: string;
  run: (config: PublicBaselineConfig) => Promise<ScenarioResult>;
};

type BaselineSummary = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
};

export type BaselineRunResult = {
  startedAt: string;
  completedAt: string;
  baseUrl: string;
  expectedRegistrationMode: RegistrationMode | null;
  selectedScenario: string;
  outputPath: string | null;
  summary: BaselineSummary;
  results: ScenarioResult[];
};

const DEFAULT_ORIGIN = "http://127.0.0.1:3000";
const DEFAULT_INVALID_ORIGIN = "https://invalid.example.com";
const DEFAULT_PRACTICE_BODY = readBodyFile("scripts/load-samples/practice-generate.sample.json") ?? "";
const DEFAULT_PHRASE_SAVE_BODY =
  readBodyFile("scripts/load-samples/phrases-save.sample.json") ?? "";

const parseCookieList = (value: string | null) =>
  (value ?? "")
    .split("|||")
    .map((item) => item.trim())
    .filter(Boolean);

const pickValue = (
  cliValue: string | null,
  envValue: string | undefined,
  fileValue: unknown,
): string | null => {
  if (cliValue !== null) return cliValue;
  if (typeof envValue === "string") return envValue;
  if (typeof fileValue === "string") return fileValue;
  return null;
};

const parseRegistrationMode = (value: string | null): RegistrationMode | null => {
  if (value === "closed" || value === "invite_only" || value === "open") {
    return value;
  }
  return null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const normalizeBaseUrl = (value: string | null) =>
  (value ?? DEFAULT_ORIGIN).trim().replace(/\/$/, "");

const buildSignupEmail = (
  config: PublicBaselineConfig,
  label: string,
  timestamp = Date.now(),
) => {
  if (!config.signupEmailPrefix || !config.signupEmailDomain) return null;
  return `${config.signupEmailPrefix}+${label}-${timestamp}@${config.signupEmailDomain}`;
};

const blocked = (
  group: ScenarioGroup,
  name: string,
  description: string,
  reason: string,
): ScenarioResult => ({
  group,
  name,
  description,
  status: "blocked",
  reason,
});

const evaluateResponse = ({
  group,
  name,
  description,
  expected,
  response,
  extraActual,
  validate,
}: {
  group: ScenarioGroup;
  name: string;
  description: string;
  expected: Record<string, unknown>;
  response: Awaited<ReturnType<typeof runRequest>>;
  extraActual?: Record<string, unknown>;
  validate?: (response: Awaited<ReturnType<typeof runRequest>>) => string | null;
}): ScenarioResult => {
  const validationError = validate?.(response) ?? null;
  return {
    group,
    name,
    description,
    status: validationError ? "failed" : "passed",
    reason: validationError ?? undefined,
    expected,
    actual: {
      status: response.status,
      requestId: response.requestId,
      durationMs: Number(response.durationMs.toFixed(2)),
      bodyPreview: toBodyPreview(response.bodyText),
      ...extraActual,
    },
  };
};

const runJsonRequest = async (
  request: Omit<RequestConfig, "body"> & { body?: string | null },
) =>
  runRequest({
    ...request,
    body: request.body ?? null,
  });

const requestHasCode = (response: Awaited<ReturnType<typeof runRequest>>, code: string) =>
  isObject(response.bodyJson) && response.bodyJson.code === code;

const buildScenarioDefinitions = (): ScenarioDefinition[] => [
  {
    name: "registration-mode-visible",
    group: "registration",
    description: "注册入口返回当前 `REGISTRATION_MODE`。",
    run: async (config) => {
      if (!config.expectedRegistrationMode) {
        return blocked("registration", "registration-mode-visible", "注册入口返回当前 `REGISTRATION_MODE`。", "缺少 expectedRegistrationMode。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/auth/signup",
        method: "GET",
        cookie: null,
        origin: null,
      });
      return evaluateResponse({
        group: "registration",
        name: "registration-mode-visible",
        description: "注册入口返回当前 `REGISTRATION_MODE`。",
        expected: { mode: config.expectedRegistrationMode, status: 200 },
        response,
        extraActual: { mode: isObject(response.bodyJson) ? response.bodyJson.mode : null },
        validate: (current) => {
          if (current.status !== 200) return "注册模式接口未返回 200。";
          if (!isObject(current.bodyJson) || current.bodyJson.mode !== config.expectedRegistrationMode) {
            return "注册模式与预期不一致。";
          }
          return null;
        },
      });
    },
  },
  {
    name: "closed-signup-rejected",
    group: "registration",
    description: "`closed` 模式下注册被拒绝。",
    run: async (config) => {
      if (config.expectedRegistrationMode !== "closed") {
        return blocked("registration", "closed-signup-rejected", "`closed` 模式下注册被拒绝。", "当前 expectedRegistrationMode 不是 `closed`。");
      }
      const email = buildSignupEmail(config, "closed");
      if (!email || !config.signupPassword) {
        return blocked("registration", "closed-signup-rejected", "`closed` 模式下注册被拒绝。", "缺少 signupEmailPrefix、signupEmailDomain 或 signupPassword。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/auth/signup",
        method: "POST",
        origin: config.origin,
        cookie: null,
        body: JSON.stringify({
          email,
          password: config.signupPassword,
          username: config.signupUsername ?? "baseline-user",
        }),
      });
      return evaluateResponse({
        group: "registration",
        name: "closed-signup-rejected",
        description: "`closed` 模式下注册被拒绝。",
        expected: { status: 401, code: "AUTH_UNAUTHORIZED" },
        response,
        validate: (current) => {
          if (current.status !== 401) return "注册未返回 401。";
          if (!requestHasCode(current, "AUTH_UNAUTHORIZED")) {
            return "未返回 AUTH_UNAUTHORIZED。";
          }
          return null;
        },
      });
    },
  },
  {
    name: "invite-only-signup-without-invite-rejected",
    group: "registration",
    description: "`invite_only` 模式下无邀请码注册失败。",
    run: async (config) => {
      if (config.expectedRegistrationMode !== "invite_only") {
        return blocked("registration", "invite-only-signup-without-invite-rejected", "`invite_only` 模式下无邀请码注册失败。", "当前 expectedRegistrationMode 不是 `invite_only`。");
      }
      const email = buildSignupEmail(config, "invite-missing");
      if (!email || !config.signupPassword) {
        return blocked("registration", "invite-only-signup-without-invite-rejected", "`invite_only` 模式下无邀请码注册失败。", "缺少 signupEmailPrefix、signupEmailDomain 或 signupPassword。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/auth/signup",
        method: "POST",
        origin: config.origin,
        cookie: null,
        body: JSON.stringify({
          email,
          password: config.signupPassword,
          username: config.signupUsername ?? "baseline-user",
        }),
      });
      return evaluateResponse({
        group: "registration",
        name: "invite-only-signup-without-invite-rejected",
        description: "`invite_only` 模式下无邀请码注册失败。",
        expected: { status: 401, code: "AUTH_UNAUTHORIZED" },
        response,
        validate: (current) => {
          if (current.status !== 401) return "无邀请码注册未返回 401。";
          if (!requestHasCode(current, "AUTH_UNAUTHORIZED")) {
            return "无邀请码注册未返回 AUTH_UNAUTHORIZED。";
          }
          return null;
        },
      });
    },
  },
  {
    name: "invite-only-signup-with-invite-succeeds",
    group: "registration",
    description: "`invite_only` 模式下有效邀请码注册成功。",
    run: async (config) => {
      if (config.expectedRegistrationMode !== "invite_only") {
        return blocked("registration", "invite-only-signup-with-invite-succeeds", "`invite_only` 模式下有效邀请码注册成功。", "当前 expectedRegistrationMode 不是 `invite_only`。");
      }
      const email = buildSignupEmail(config, "invite-ok");
      if (!email || !config.signupPassword || !config.inviteCode) {
        return blocked("registration", "invite-only-signup-with-invite-succeeds", "`invite_only` 模式下有效邀请码注册成功。", "缺少 signupEmailPrefix、signupEmailDomain、signupPassword 或 inviteCode。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/auth/signup",
        method: "POST",
        origin: config.origin,
        cookie: null,
        body: JSON.stringify({
          email,
          password: config.signupPassword,
          username: config.signupUsername ?? "baseline-user",
          inviteCode: config.inviteCode,
        }),
      });
      return evaluateResponse({
        group: "registration",
        name: "invite-only-signup-with-invite-succeeds",
        description: "`invite_only` 模式下有效邀请码注册成功。",
        expected: { status: 201, emailVerificationRequired: true },
        response,
        validate: (current) => {
          if (current.status !== 201) return "邀请码注册未返回 201。";
          if (!isObject(current.bodyJson) || current.bodyJson.emailVerificationRequired !== true) {
            return "邀请码注册未返回 emailVerificationRequired=true。";
          }
          return null;
        },
      });
    },
  },
  {
    name: "unverified-app-redirects-to-verify-email",
    group: "email-verification",
    description: "未验证邮箱用户访问主应用会重定向到 `/verify-email`。",
    run: async (config) => {
      if (!config.unverifiedCookie) {
        return blocked("email-verification", "unverified-app-redirects-to-verify-email", "未验证邮箱用户访问主应用会重定向到 `/verify-email`。", "缺少 unverifiedCookie。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/today",
        method: "GET",
        origin: config.origin,
        cookie: config.unverifiedCookie,
        redirect: "manual",
      });
      const location = response.headers.location ?? null;
      return evaluateResponse({
        group: "email-verification",
        name: "unverified-app-redirects-to-verify-email",
        description: "未验证邮箱用户访问主应用会重定向到 `/verify-email`。",
        expected: { status: 307, locationContains: "/verify-email" },
        response,
        extraActual: { location },
        validate: (current) => {
          if (current.status < 300 || current.status >= 400) {
            return "主应用入口未返回重定向。";
          }
          if (!(current.headers.location ?? "").includes("/verify-email")) {
            return "重定向目标不是 /verify-email。";
          }
          return null;
        },
      });
    },
  },
  {
    name: "unverified-api-rejected",
    group: "email-verification",
    description: "未验证邮箱用户调用高成本 API 返回 403。",
    run: async (config) => {
      if (!config.unverifiedCookie) {
        return blocked("email-verification", "unverified-api-rejected", "未验证邮箱用户调用高成本 API 返回 403。", "缺少 unverifiedCookie。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/practice/generate",
        method: "POST",
        origin: config.origin,
        cookie: config.unverifiedCookie,
        body: config.practiceGenerateBody,
      });
      return evaluateResponse({
        group: "email-verification",
        name: "unverified-api-rejected",
        description: "未验证邮箱用户调用高成本 API 返回 403。",
        expected: { status: 403, code: "AUTH_FORBIDDEN" },
        response,
        validate: (current) => {
          if (current.status !== 403) return "未验证用户接口未返回 403。";
          if (!requestHasCode(current, "AUTH_FORBIDDEN")) {
            return "未验证用户接口未返回 AUTH_FORBIDDEN。";
          }
          return null;
        },
      });
    },
  },
  {
    name: "origin-mismatch-rejected",
    group: "origin-and-rate-limit",
    description: "受保护写接口会拒绝不匹配的 Origin。",
    run: async (config) => {
      if (!config.verifiedCookie) {
        return blocked("origin-and-rate-limit", "origin-mismatch-rejected", "受保护写接口会拒绝不匹配的 Origin。", "缺少 verifiedCookie。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/practice/generate",
        method: "POST",
        origin: config.invalidOrigin,
        cookie: config.verifiedCookie,
        body: config.practiceGenerateBody,
      });
      return evaluateResponse({
        group: "origin-and-rate-limit",
        name: "origin-mismatch-rejected",
        description: "受保护写接口会拒绝不匹配的 Origin。",
        expected: { status: 403 },
        response,
        validate: (current) => (current.status === 403 ? null : "Origin 拒绝未返回 403。"),
      });
    },
  },
  {
    name: "practice-generate-normal",
    group: "origin-and-rate-limit",
    description: "已验证用户可正常调用高成本接口。",
    run: async (config) => {
      if (!config.verifiedCookie) {
        return blocked("origin-and-rate-limit", "practice-generate-normal", "已验证用户可正常调用高成本接口。", "缺少 verifiedCookie。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/practice/generate",
        method: "POST",
        origin: config.origin,
        cookie: config.verifiedCookie,
        body: config.practiceGenerateBody,
      });
      return evaluateResponse({
        group: "origin-and-rate-limit",
        name: "practice-generate-normal",
        description: "已验证用户可正常调用高成本接口。",
        expected: { status: 200 },
        response,
        validate: (current) => (current.status === 200 ? null : "正常 generate 未返回 200。"),
      });
    },
  },
  {
    name: "user-rate-limit-hits-429",
    group: "origin-and-rate-limit",
    description: "同一用户短窗口高成本接口限流会命中 429。",
    run: async (config) => {
      if (!config.verifiedCookie) {
        return blocked("origin-and-rate-limit", "user-rate-limit-hits-429", "同一用户短窗口高成本接口限流会命中 429。", "缺少 verifiedCookie。");
      }
      const summary = await runLoad({
        baseUrl: config.baseUrl,
        path: "/api/practice/generate",
        method: "POST",
        origin: config.origin,
        cookie: config.verifiedCookie,
        body: config.practiceGenerateBody,
        requests: 6,
        concurrency: 1,
      });
      const hit429 = Number(summary.statusCounts["429"] ?? 0) > 0;
      return {
        group: "origin-and-rate-limit",
        name: "user-rate-limit-hits-429",
        description: "同一用户短窗口高成本接口限流会命中 429。",
        status: hit429 ? "passed" : "failed",
        reason: hit429 ? undefined : "同一用户限流未命中 429。",
        expected: { statusCountsIncludes: 429, requests: 6 },
        actual: summary,
      };
    },
  },
  {
    name: "ip-rate-limit-hits-429",
    group: "origin-and-rate-limit",
    description: "同一 IP 多账号访问高成本接口会命中 429。",
    run: async (config) => {
      if (config.ipLimitCookies.length < 3) {
        return blocked("origin-and-rate-limit", "ip-rate-limit-hits-429", "同一 IP 多账号访问高成本接口会命中 429。", "缺少至少 3 个 ipLimitCookies，无法避免先触发单用户限流。");
      }
      const statusCounts: Record<string, number> = {};
      const requests = 11;
      const durations: number[] = [];
      let hit429 = false;
      for (let index = 0; index < requests; index += 1) {
        const cookie = config.ipLimitCookies[index % config.ipLimitCookies.length] ?? null;
        const response = await runJsonRequest({
          baseUrl: config.baseUrl,
          path: "/api/practice/generate",
          method: "POST",
          origin: config.origin,
          cookie,
          body: config.practiceGenerateBody,
        });
        durations.push(response.durationMs);
        statusCounts[String(response.status)] = (statusCounts[String(response.status)] ?? 0) + 1;
        if (response.status === 429) {
          hit429 = true;
          break;
        }
      }
      return {
        group: "origin-and-rate-limit",
        name: "ip-rate-limit-hits-429",
        description: "同一 IP 多账号访问高成本接口会命中 429。",
        status: hit429 ? "passed" : "failed",
        reason: hit429 ? undefined : "同一 IP 多账号限流未命中 429。",
        expected: { statusCountsIncludes: 429, requests, distinctCookies: config.ipLimitCookies.length },
        actual: {
          statusCounts,
          executedRequests: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
          avgMs:
            durations.length === 0
              ? 0
              : Number((durations.reduce((sum, item) => sum + item, 0) / durations.length).toFixed(2)),
        },
      };
    },
  },
  {
    name: "daily-quota-exceeded-hits-429",
    group: "quota-and-access",
    description: "已耗尽 daily quota 的账号调用高成本接口会返回 429。",
    run: async (config) => {
      if (!config.quotaExceededCookie) {
        return blocked("quota-and-access", "daily-quota-exceeded-hits-429", "已耗尽 daily quota 的账号调用高成本接口会返回 429。", "缺少 quotaExceededCookie。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/practice/generate",
        method: "POST",
        origin: config.origin,
        cookie: config.quotaExceededCookie,
        body: config.practiceGenerateBody,
      });
      return evaluateResponse({
        group: "quota-and-access",
        name: "daily-quota-exceeded-hits-429",
        description: "已耗尽 daily quota 的账号调用高成本接口会返回 429。",
        expected: { status: 429, code: "DAILY_QUOTA_EXCEEDED" },
        response,
        validate: (current) => {
          if (current.status !== 429) return "daily quota 场景未返回 429。";
          if (!requestHasCode(current, "DAILY_QUOTA_EXCEEDED")) {
            return "daily quota 场景未返回 DAILY_QUOTA_EXCEEDED。";
          }
          return null;
        },
      });
    },
  },
  {
    name: "generation-limited-rejected",
    group: "quota-and-access",
    description: "`generation_limited` 用户会被高成本入口拒绝。",
    run: async (config) => {
      if (!config.generationLimitedCookie) {
        return blocked("quota-and-access", "generation-limited-rejected", "`generation_limited` 用户会被高成本入口拒绝。", "缺少 generationLimitedCookie。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/practice/generate",
        method: "POST",
        origin: config.origin,
        cookie: config.generationLimitedCookie,
        body: config.practiceGenerateBody,
      });
      return evaluateResponse({
        group: "quota-and-access",
        name: "generation-limited-rejected",
        description: "`generation_limited` 用户会被高成本入口拒绝。",
        expected: { status: 403, code: "AUTH_FORBIDDEN" },
        response,
        validate: (current) => {
          if (current.status !== 403) return "generation_limited 未返回 403。";
          if (!requestHasCode(current, "AUTH_FORBIDDEN")) {
            return "generation_limited 未返回 AUTH_FORBIDDEN。";
          }
          return null;
        },
      });
    },
  },
  {
    name: "readonly-write-rejected",
    group: "quota-and-access",
    description: "`readonly` 用户写入接口会被拒绝。",
    run: async (config) => {
      if (!config.readonlyCookie) {
        return blocked("quota-and-access", "readonly-write-rejected", "`readonly` 用户写入接口会被拒绝。", "缺少 readonlyCookie。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/phrases/save",
        method: "POST",
        origin: config.origin,
        cookie: config.readonlyCookie,
        body: config.phraseSaveBody,
      });
      return evaluateResponse({
        group: "quota-and-access",
        name: "readonly-write-rejected",
        description: "`readonly` 用户写入接口会被拒绝。",
        expected: { status: 403, code: "AUTH_FORBIDDEN" },
        response,
        validate: (current) => {
          if (current.status !== 403) return "readonly 写入未返回 403。";
          if (!requestHasCode(current, "AUTH_FORBIDDEN")) {
            return "readonly 写入未返回 AUTH_FORBIDDEN。";
          }
          return null;
        },
      });
    },
  },
  {
    name: "admin-status-shows-backend-and-usage",
    group: "admin-status",
    description: "`/api/admin/status` 会返回限流后端和今日高成本 usage 摘要。",
    run: async (config) => {
      if (!config.adminCookie) {
        return blocked("admin-status", "admin-status-shows-backend-and-usage", "`/api/admin/status` 会返回限流后端和今日高成本 usage 摘要。", "缺少 adminCookie。");
      }
      const response = await runJsonRequest({
        baseUrl: config.baseUrl,
        path: "/api/admin/status",
        method: "GET",
        origin: config.origin,
        cookie: config.adminCookie,
      });
      return evaluateResponse({
        group: "admin-status",
        name: "admin-status-shows-backend-and-usage",
        description: "`/api/admin/status` 会返回限流后端和今日高成本 usage 摘要。",
        expected: { status: 200, includes: ["rateLimitBackend.kind", "todayHighCostUsage.items"] },
        response,
        extraActual: {
          rateLimitBackendKind:
            isObject(response.bodyJson) && isObject(response.bodyJson.rateLimitBackend)
              ? response.bodyJson.rateLimitBackend.kind
              : null,
          todayHighCostUsageItems:
            isObject(response.bodyJson) &&
            isObject(response.bodyJson.todayHighCostUsage) &&
            Array.isArray(response.bodyJson.todayHighCostUsage.items)
              ? response.bodyJson.todayHighCostUsage.items.length
              : null,
        },
        validate: (current) => {
          if (current.status !== 200) return "admin status 未返回 200。";
          if (!isObject(current.bodyJson)) return "admin status 响应不是对象。";
          if (!isObject(current.bodyJson.rateLimitBackend) || !current.bodyJson.rateLimitBackend.kind) {
            return "admin status 缺少 rateLimitBackend.kind。";
          }
          if (
            !isObject(current.bodyJson.todayHighCostUsage) ||
            !Array.isArray(current.bodyJson.todayHighCostUsage.items)
          ) {
            return "admin status 缺少 todayHighCostUsage.items。";
          }
          return null;
        },
      });
    },
  },
];

export const getScenarioDefinitions = () => buildScenarioDefinitions();

export const buildPublicRegistrationBaselineConfig = (args: string[]): PublicBaselineConfig => {
  loadDefaultEnvFiles();
  const configFilePath = getCliArg(args, "config-file");
  const fileConfig = readJsonFile<RawConfigFile>(configFilePath);
  const readFromFile = (key: string) => fileConfig?.[key];

  return {
    baseUrl: normalizeBaseUrl(
      pickValue(getCliArg(args, "base-url"), process.env.PUBLIC_BASELINE_BASE_URL, readFromFile("baseUrl")),
    ),
    origin:
      pickValue(getCliArg(args, "origin"), process.env.PUBLIC_BASELINE_ORIGIN, readFromFile("origin")) ??
      DEFAULT_ORIGIN,
    invalidOrigin:
      pickValue(
        getCliArg(args, "invalid-origin"),
        process.env.PUBLIC_BASELINE_INVALID_ORIGIN,
        readFromFile("invalidOrigin"),
      ) ?? DEFAULT_INVALID_ORIGIN,
    expectedRegistrationMode: parseRegistrationMode(
      pickValue(
        getCliArg(args, "expected-registration-mode"),
        process.env.PUBLIC_BASELINE_EXPECTED_REGISTRATION_MODE,
        readFromFile("expectedRegistrationMode"),
      ),
    ),
    scenario: getCliArg(args, "scenario") ?? "all",
    outputPath:
      pickValue(getCliArg(args, "output"), process.env.PUBLIC_BASELINE_OUTPUT, readFromFile("outputPath")),
    dryRun: args.includes("--dry-run"),
    signupEmailPrefix: pickValue(
      getCliArg(args, "signup-email-prefix"),
      process.env.PUBLIC_BASELINE_SIGNUP_EMAIL_PREFIX,
      readFromFile("signupEmailPrefix"),
    ),
    signupEmailDomain: pickValue(
      getCliArg(args, "signup-email-domain"),
      process.env.PUBLIC_BASELINE_SIGNUP_EMAIL_DOMAIN,
      readFromFile("signupEmailDomain"),
    ),
    signupPassword: pickValue(
      getCliArg(args, "signup-password"),
      process.env.PUBLIC_BASELINE_SIGNUP_PASSWORD,
      readFromFile("signupPassword"),
    ),
    signupUsername: pickValue(
      getCliArg(args, "signup-username"),
      process.env.PUBLIC_BASELINE_SIGNUP_USERNAME,
      readFromFile("signupUsername"),
    ),
    inviteCode: pickValue(
      getCliArg(args, "invite-code"),
      process.env.PUBLIC_BASELINE_INVITE_CODE,
      readFromFile("inviteCode"),
    ),
    verifiedCookie: pickValue(
      getCliArg(args, "verified-cookie"),
      process.env.PUBLIC_BASELINE_VERIFIED_COOKIE,
      readFromFile("verifiedCookie"),
    ),
    unverifiedCookie: pickValue(
      getCliArg(args, "unverified-cookie"),
      process.env.PUBLIC_BASELINE_UNVERIFIED_COOKIE,
      readFromFile("unverifiedCookie"),
    ),
    generationLimitedCookie: pickValue(
      getCliArg(args, "generation-limited-cookie"),
      process.env.PUBLIC_BASELINE_GENERATION_LIMITED_COOKIE,
      readFromFile("generationLimitedCookie"),
    ),
    readonlyCookie: pickValue(
      getCliArg(args, "readonly-cookie"),
      process.env.PUBLIC_BASELINE_READONLY_COOKIE,
      readFromFile("readonlyCookie"),
    ),
    quotaExceededCookie: pickValue(
      getCliArg(args, "quota-exceeded-cookie"),
      process.env.PUBLIC_BASELINE_QUOTA_EXCEEDED_COOKIE,
      readFromFile("quotaExceededCookie"),
    ),
    adminCookie: pickValue(
      getCliArg(args, "admin-cookie"),
      process.env.PUBLIC_BASELINE_ADMIN_COOKIE,
      readFromFile("adminCookie"),
    ),
    ipLimitCookies: parseCookieList(
      pickValue(
        getCliArg(args, "ip-limit-cookies"),
        process.env.PUBLIC_BASELINE_IP_LIMIT_COOKIES,
        readFromFile("ipLimitCookies"),
      ),
    ),
    practiceGenerateBody:
      readBodyFile(
        pickValue(
          getCliArg(args, "practice-body-file"),
          process.env.PUBLIC_BASELINE_PRACTICE_BODY_FILE,
          readFromFile("practiceBodyFile"),
        ),
      ) ?? DEFAULT_PRACTICE_BODY,
    phraseSaveBody:
      readBodyFile(
        pickValue(
          getCliArg(args, "phrase-body-file"),
          process.env.PUBLIC_BASELINE_PHRASE_BODY_FILE,
          readFromFile("phraseBodyFile"),
        ),
      ) ?? DEFAULT_PHRASE_SAVE_BODY,
  };
};

export const summarizeBaselineResults = (results: ScenarioResult[]): BaselineSummary =>
  results.reduce<BaselineSummary>(
    (summary, result) => {
      summary.total += 1;
      if (result.status === "passed") summary.passed += 1;
      if (result.status === "failed") summary.failed += 1;
      if (result.status === "blocked") summary.blocked += 1;
      return summary;
    },
    { total: 0, passed: 0, failed: 0, blocked: 0 },
  );

export const buildDryRunPreview = (config: PublicBaselineConfig) => ({
  ...config,
  verifiedCookie: config.verifiedCookie ? "[provided]" : null,
  unverifiedCookie: config.unverifiedCookie ? "[provided]" : null,
  generationLimitedCookie: config.generationLimitedCookie ? "[provided]" : null,
  readonlyCookie: config.readonlyCookie ? "[provided]" : null,
  quotaExceededCookie: config.quotaExceededCookie ? "[provided]" : null,
  adminCookie: config.adminCookie ? "[provided]" : null,
  ipLimitCookies: config.ipLimitCookies.map(() => "[provided]"),
  practiceGenerateBodyPreview: toBodyPreview(config.practiceGenerateBody, 120),
  phraseSaveBodyPreview: toBodyPreview(config.phraseSaveBody, 120),
});

export const runPublicRegistrationBaseline = async (
  config: PublicBaselineConfig,
): Promise<BaselineRunResult> => {
  const startedAt = new Date();
  const selectedDefinitions =
    config.scenario === "all"
      ? getScenarioDefinitions()
      : getScenarioDefinitions().filter((item) => item.name === config.scenario);

  const results: ScenarioResult[] = [];
  for (const scenario of selectedDefinitions) {
    results.push(await scenario.run(config));
  }

  const output: BaselineRunResult = {
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    baseUrl: config.baseUrl,
    expectedRegistrationMode: config.expectedRegistrationMode,
    selectedScenario: config.scenario,
    outputPath: config.outputPath,
    summary: summarizeBaselineResults(results),
    results,
  };

  if (config.outputPath) {
    writeJsonFile(config.outputPath, output);
  }

  return output;
};
