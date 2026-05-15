import { createBrowserClient } from "@supabase/ssr";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import type {
  LearningDashboardResponse,
} from "@/lib/utils/learning-api";
import { runRequest, type RequestResult } from "./load-api-baseline-lib";
import {
  resetTestUserData,
  type ResetTestUserResult,
  type TestUserEnvConfig,
} from "./test-users-lib";
import { createSupabaseTestUserAccess } from "./test-users-supabase";

type MemoryCookie = { name: string; value: string };

type SceneChunkSnapshot = {
  text: string;
  translation: string | null;
  sentenceText: string;
  sentenceIndex: number;
  blockId: string | null;
};

type SmokePhaseName =
  | "reset"
  | "login"
  | "redirect"
  | "today-initial"
  | "scene-detail"
  | "scene-start"
  | "scene-training"
  | "save-phrase"
  | "phrases-mine"
  | "review-due"
  | "review-submit"
  | "review-db-check"
  | "scene-complete"
  | "today-final"
  | "admin-login"
  | "admin-page"
  | "restricted-login"
  | "restricted-admin-denied";

export interface SmokePhaseResult {
  phase: SmokePhaseName;
  target: string;
  ok: boolean;
  status?: number;
  requestId?: string | null;
  summary: string;
}

export interface P0SmokeConfig {
  baseUrl: string;
  email: string;
  password: string;
  resetConfig: TestUserEnvConfig;
}

export interface P0SmokeReport {
  phases: SmokePhaseResult[];
  reset: ResetTestUserResult;
}

type ReviewLogSnapshot = {
  review_result: string;
  source: string | null;
};

type UserPhraseSnapshot = {
  id: string;
  review_status: string;
  review_count: number;
  correct_count: number;
  incorrect_count: number;
  source_scene_slug: string | null;
};

type LessonSentence = {
  text?: string;
  chunks?: Array<
    | string
    | {
        text?: string;
        translation?: string | null;
      }
  >;
  chunkDetails?: Array<{
    text?: string;
    translation?: string | null;
  }>;
};

type LessonBlock = {
  id?: string;
  sentences?: LessonSentence[];
};

type LessonSection = {
  blocks?: LessonBlock[];
};

type LessonShape = {
  sections?: LessonSection[];
};

export class SmokePhaseError extends Error {
  constructor(
    readonly phase: SmokePhaseName,
    readonly target: string,
    readonly summary: string,
    readonly status?: number,
    readonly requestId?: string | null,
  ) {
    super(`[${phase}] ${summary}`);
  }
}

class MemoryCookieStore {
  private readonly cookies = new Map<string, string>();

  getAll = () =>
    Array.from(this.cookies.entries()).map(([name, value]) => ({
      name,
      value,
    }));

  setAll = (
    cookies: Array<{
      name: string;
      value: string;
      options?: unknown;
    }>,
  ) => {
    for (const cookie of cookies) {
      this.cookies.set(cookie.name, cookie.value);
    }
  };

  toHeader() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const extractFirstSceneChunk = (lesson: LessonShape): SceneChunkSnapshot | null => {
  let sentenceIndex = 0;

  for (const section of lesson.sections ?? []) {
    for (const block of section.blocks ?? []) {
      for (const sentence of block.sentences ?? []) {
        const sentenceText = typeof sentence.text === "string" ? sentence.text.trim() : "";
        const structuredChunks = [
          ...(sentence.chunkDetails ?? []),
          ...(sentence.chunks ?? []).map((chunk) =>
            typeof chunk === "string"
              ? ({ text: chunk, translation: null } satisfies { text?: string; translation?: string | null })
              : chunk,
          ),
        ];
        for (const chunk of structuredChunks) {
          const text = typeof chunk?.text === "string" ? chunk.text.trim() : "";
          if (!text) continue;
          return {
            text,
            translation:
              typeof chunk.translation === "string" && chunk.translation.trim()
                ? chunk.translation.trim()
                : null,
            sentenceText,
            sentenceIndex,
            blockId: typeof block.id === "string" ? block.id : null,
          };
        }
        sentenceIndex += 1;
      }
    }
  }

  return null;
};

export const getStarterSlugFromDashboard = (dashboard: LearningDashboardResponse) =>
  dashboard.starterRecommendation?.scene?.slug ?? null;

const requestSummary = (result: RequestResult) => {
  if (result.ok) return `status=${result.status}`;
  const message =
    isRecord(result.bodyJson) && typeof result.bodyJson.error === "string"
      ? result.bodyJson.error
      : result.bodyText.slice(0, 180);
  return `status=${result.status}${result.requestId ? ` requestId=${result.requestId}` : ""} ${message}`.trim();
};

const pushPhase = (
  phases: SmokePhaseResult[],
  phase: SmokePhaseName,
  target: string,
  result: {
    ok: boolean;
    summary: string;
    status?: number;
    requestId?: string | null;
  },
) => {
  phases.push({
    phase,
    target,
    ok: result.ok,
    summary: result.summary,
    status: result.status,
    requestId: result.requestId,
  });
};

const expectOkJson = <T>(
  phase: SmokePhaseName,
  target: string,
  result: RequestResult,
) => {
  if (!result.ok || !isRecord(result.bodyJson)) {
    throw new SmokePhaseError(
      phase,
      target,
      requestSummary(result),
      result.status,
      result.requestId,
    );
  }
  return result.bodyJson as T;
};

const expectRedirectToToday = (result: RequestResult) => {
  const location = result.headers.location ?? "";
  return result.status >= 300 && result.status < 400 && /\/today\/?$/.test(location);
};

export const isAdminAccessDeniedResult = (result: RequestResult) =>
  result.status === 403 ||
  (result.status >= 300 && result.status < 400 && Boolean(result.headers.location?.trim()));

const loginWithPhase = async (
  phase: SmokePhaseName,
  target: string,
  email: string,
  password: string,
) => {
  try {
    return await loginWithPassword(email, password);
  } catch (error) {
    throw new SmokePhaseError(phase, target, error instanceof Error ? error.message : String(error));
  }
};

const loginWithPassword = async (email: string, password: string) => {
  const cookieStore = new MemoryCookieStore();
  const client = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    isSingleton: false,
    cookies: {
      getAll: cookieStore.getAll,
      setAll: cookieStore.setAll,
    },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw new Error(`Supabase 登录失败: ${error?.message ?? "missing session"}`);
  }

  const cookieHeader = cookieStore.toHeader();
  if (!cookieHeader) {
    throw new Error("Supabase 登录成功，但未生成 session cookie");
  }

  return {
    cookieHeader,
  };
};

const runAuthedRequest = (
  config: P0SmokeConfig,
  cookie: string,
  path: string,
  method: "GET" | "POST",
  body?: unknown,
  extraHeaders?: Record<string, string>,
  redirect?: RequestRedirect,
) =>
  runRequest({
    baseUrl: config.baseUrl,
    path,
    method,
    body: body === undefined ? null : JSON.stringify(body),
    cookie,
    origin: null,
    extraHeaders,
    redirect,
  });

const verifyReviewSideEffects = async (userPhraseId: string) => {
  const admin = createSupabaseAdminClient();

  const [{ data: reviewLogs, error: reviewError }, { data: userPhraseRows, error: phraseError }] =
    await Promise.all([
      admin
        .from("phrase_review_logs")
        .select("review_result,source")
        .eq("user_phrase_id", userPhraseId)
        .order("created_at", { ascending: false })
        .limit(1),
      admin
        .from("user_phrases")
        .select("id,review_status,review_count,correct_count,incorrect_count,source_scene_slug")
        .eq("id", userPhraseId)
        .limit(1),
    ]);

  if (reviewError) {
    throw new Error(`Failed to read phrase_review_logs: ${reviewError.message}`);
  }
  if (phraseError) {
    throw new Error(`Failed to read user_phrases: ${phraseError.message}`);
  }

  const reviewLog = ((reviewLogs ?? [])[0] ?? null) as ReviewLogSnapshot | null;
  const userPhrase = ((userPhraseRows ?? [])[0] ?? null) as UserPhraseSnapshot | null;

  if (!reviewLog) {
    throw new Error("phrase_review_logs 未写入");
  }
  if (!userPhrase) {
    throw new Error("user_phrases 未找到提交后的表达");
  }
  if (userPhrase.review_status !== "reviewing") {
    throw new Error(`user_phrase.review_status 异常: ${userPhrase.review_status}`);
  }
  if (userPhrase.review_count < 1 || userPhrase.correct_count < 1) {
    throw new Error("user_phrase 复习统计未推进");
  }
  if (reviewLog.review_result !== "good") {
    throw new Error(`phrase_review_logs.review_result 异常: ${reviewLog.review_result}`);
  }
};

export async function runP0AuthLoopSmoke(config: P0SmokeConfig): Promise<P0SmokeReport> {
  const phases: SmokePhaseResult[] = [];

  const reset = await resetTestUserData(
    config.email,
    config.resetConfig,
    createSupabaseTestUserAccess(),
  );
  pushPhase(phases, "reset", "service-role reset", {
    ok: true,
    summary: `已清空 ${reset.tables.reduce((sum, item) => sum + item.count, 0)} 条测试数据`,
  });

  const { cookieHeader } = await loginWithPhase(
    "login",
    "supabase.auth.signInWithPassword",
    config.email,
    config.password,
  );
  pushPhase(phases, "login", "supabase.auth.signInWithPassword", {
    ok: true,
    summary: "已拿到正式 session cookie",
  });

  const redirectResult = await runAuthedRequest(config, cookieHeader, "/login", "GET", undefined, undefined, "manual");
  if (!expectRedirectToToday(redirectResult)) {
    throw new SmokePhaseError(
      "redirect",
      "/login",
      requestSummary(redirectResult),
      redirectResult.status,
      redirectResult.requestId,
    );
  }
  pushPhase(phases, "redirect", "/login", {
    ok: true,
    summary: `登录后默认跳转 ${redirectResult.headers.location ?? "/today"}`,
    status: redirectResult.status,
    requestId: redirectResult.requestId,
  });

  const dashboardInitialResult = await runAuthedRequest(
    config,
    cookieHeader,
    "/api/learning/dashboard",
    "GET",
  );
  const dashboardInitial = expectOkJson<LearningDashboardResponse>(
    "today-initial",
    "/api/learning/dashboard",
    dashboardInitialResult,
  );
  if (getStarterSlugFromDashboard(dashboardInitial) !== "daily-greeting") {
    throw new SmokePhaseError(
      "today-initial",
      "/api/learning/dashboard",
      `starter recommendation 不是 daily-greeting，而是 ${getStarterSlugFromDashboard(dashboardInitial) ?? "null"}`,
      dashboardInitialResult.status,
      dashboardInitialResult.requestId,
    );
  }
  pushPhase(phases, "today-initial", "/api/learning/dashboard", {
    ok: true,
    summary: "starter recommendation = daily-greeting",
    status: dashboardInitialResult.status,
    requestId: dashboardInitialResult.requestId,
  });

  const sceneResult = await runAuthedRequest(config, cookieHeader, "/api/scenes/daily-greeting", "GET");
  const sceneBody = expectOkJson<{ scene?: LessonShape }>(
    "scene-detail",
    "/api/scenes/daily-greeting",
    sceneResult,
  );
  if (!sceneBody.scene) {
    throw new SmokePhaseError(
      "scene-detail",
      "/api/scenes/daily-greeting",
      "scene detail 缺少 scene",
      sceneResult.status,
      sceneResult.requestId,
    );
  }
  const firstChunk = extractFirstSceneChunk(sceneBody.scene);
  if (!firstChunk) {
    throw new SmokePhaseError(
      "scene-detail",
      "/api/scenes/daily-greeting",
      "daily-greeting 未找到 builtin chunk",
      sceneResult.status,
      sceneResult.requestId,
    );
  }
  pushPhase(phases, "scene-detail", "/api/scenes/daily-greeting", {
    ok: true,
    summary: `找到 builtin chunk: ${firstChunk.text}`,
    status: sceneResult.status,
    requestId: sceneResult.requestId,
  });

  const startResult = await runAuthedRequest(
    config,
    cookieHeader,
    "/api/learning/scenes/daily-greeting/start",
    "POST",
    {},
  );
  expectOkJson("scene-start", "/api/learning/scenes/daily-greeting/start", startResult);
  pushPhase(phases, "scene-start", "/api/learning/scenes/daily-greeting/start", {
    ok: true,
    summary: "scene start 成功",
    status: startResult.status,
    requestId: startResult.requestId,
  });

  const trainingPayloads: Array<{ event: string; selectedBlockId?: string }> = [
    { event: "full_play" },
    { event: "open_expression", selectedBlockId: firstChunk.blockId ?? undefined },
    { event: "sentence_completed" },
  ];

  for (const payload of trainingPayloads) {
    const trainingResult = await runAuthedRequest(
      config,
      cookieHeader,
      "/api/learning/scenes/daily-greeting/training",
      "POST",
      payload,
    );
    expectOkJson(
      "scene-training",
      "/api/learning/scenes/daily-greeting/training",
      trainingResult,
    );
  }
  pushPhase(phases, "scene-training", "/api/learning/scenes/daily-greeting/training", {
    ok: true,
    summary: "已写入 full_play / open_expression / sentence_completed",
  });

  const saveResult = await runAuthedRequest(
    config,
    cookieHeader,
    "/api/phrases/save",
    "POST",
    {
      text: firstChunk.text,
      learningItemType: "expression",
      translation: firstChunk.translation,
      sourceSceneSlug: "daily-greeting",
      sourceType: "scene",
      sourceSentenceIndex: firstChunk.sentenceIndex,
      sourceSentenceText: firstChunk.sentenceText,
      sourceChunkText: firstChunk.text,
    },
  );
  const saveBody = expectOkJson<{
    created: boolean;
    userPhrase?: { id?: string };
  }>("save-phrase", "/api/phrases/save", saveResult);
  const userPhraseId = saveBody.userPhrase?.id?.trim();
  if (!userPhraseId) {
    throw new SmokePhaseError(
      "save-phrase",
      "/api/phrases/save",
      "save phrase 响应缺少 userPhrase.id",
      saveResult.status,
      saveResult.requestId,
    );
  }
  pushPhase(phases, "save-phrase", "/api/phrases/save", {
    ok: true,
    summary: `已保存 scene chunk -> userPhrase ${userPhraseId}`,
    status: saveResult.status,
    requestId: saveResult.requestId,
  });

  const mineResult = await runAuthedRequest(
    config,
    cookieHeader,
    "/api/phrases/mine?status=saved&reviewStatus=all&learningItemType=expression&page=1&limit=20",
    "GET",
  );
  const mineBody = expectOkJson<{ rows?: Array<{ userPhraseId: string; sourceSceneSlug: string | null }> }>(
    "phrases-mine",
    "/api/phrases/mine",
    mineResult,
  );
  const mineRow = (mineBody.rows ?? []).find((row) => row.userPhraseId === userPhraseId) ?? null;
  if (!mineRow || mineRow.sourceSceneSlug !== "daily-greeting") {
    throw new SmokePhaseError(
      "phrases-mine",
      "/api/phrases/mine",
      "mine 未返回刚保存的 daily-greeting 表达",
      mineResult.status,
      mineResult.requestId,
    );
  }
  pushPhase(phases, "phrases-mine", "/api/phrases/mine", {
    ok: true,
    summary: "已确认刚保存表达进入 mine",
    status: mineResult.status,
    requestId: mineResult.requestId,
  });

  const dueResult = await runAuthedRequest(config, cookieHeader, "/api/review/due?limit=20", "GET");
  const dueBody = expectOkJson<{ rows?: Array<{ userPhraseId: string }> }>(
    "review-due",
    "/api/review/due",
    dueResult,
  );
  const dueRow = (dueBody.rows ?? []).find((row) => row.userPhraseId === userPhraseId) ?? null;
  if (!dueRow) {
    throw new SmokePhaseError(
      "review-due",
      "/api/review/due",
      "due 列表未返回刚保存表达",
      dueResult.status,
      dueResult.requestId,
    );
  }
  pushPhase(phases, "review-due", "/api/review/due", {
    ok: true,
    summary: "已确认表达进入 due",
    status: dueResult.status,
    requestId: dueResult.requestId,
  });

  const reviewSubmitResult = await runAuthedRequest(
    config,
    cookieHeader,
    "/api/review/submit",
    "POST",
    {
      userPhraseId,
      reviewResult: "good",
      source: "p0_smoke",
      recognitionState: "recognized",
      outputConfidence: "high",
      fullOutputStatus: "completed",
      variantRewriteStatus: "completed",
      variantRewritePromptId: "self",
      fullOutputText: `I can use ${firstChunk.text} in context.`,
    },
    { "x-idempotency-key": `p0-smoke-${Date.now()}` },
  );
  expectOkJson("review-submit", "/api/review/submit", reviewSubmitResult);
  pushPhase(phases, "review-submit", "/api/review/submit", {
    ok: true,
    summary: "review submit 成功",
    status: reviewSubmitResult.status,
    requestId: reviewSubmitResult.requestId,
  });

  await verifyReviewSideEffects(userPhraseId);
  pushPhase(phases, "review-db-check", "phrase_review_logs + user_phrases", {
    ok: true,
    summary: "已确认 phrase_review_logs 写入，user_phrase 状态推进为 reviewing",
  });

  const completeResult = await runAuthedRequest(
    config,
    cookieHeader,
    "/api/learning/scenes/daily-greeting/complete",
    "POST",
    {
      studySecondsDelta: 60,
      savedPhraseDelta: 1,
    },
  );
  expectOkJson("scene-complete", "/api/learning/scenes/daily-greeting/complete", completeResult);
  pushPhase(phases, "scene-complete", "/api/learning/scenes/daily-greeting/complete", {
    ok: true,
    summary: "daily-greeting 已完成",
    status: completeResult.status,
    requestId: completeResult.requestId,
  });

  const dashboardFinalResult = await runAuthedRequest(
    config,
    cookieHeader,
    "/api/learning/dashboard",
    "GET",
  );
  const dashboardFinal = expectOkJson<LearningDashboardResponse>(
    "today-final",
    "/api/learning/dashboard",
    dashboardFinalResult,
  );
  if (getStarterSlugFromDashboard(dashboardFinal) !== "self-introduction") {
    throw new SmokePhaseError(
      "today-final",
      "/api/learning/dashboard",
      `starter recommendation 不是 self-introduction，而是 ${getStarterSlugFromDashboard(dashboardFinal) ?? "null"}`,
      dashboardFinalResult.status,
      dashboardFinalResult.requestId,
    );
  }
  pushPhase(phases, "today-final", "/api/learning/dashboard", {
    ok: true,
    summary: "完成 daily-greeting 后推荐 self-introduction",
    status: dashboardFinalResult.status,
    requestId: dashboardFinalResult.requestId,
  });

  const { cookieHeader: adminCookie } = await loginWithPhase(
    "admin-login",
    "supabase.auth.signInWithPassword",
    config.resetConfig.adminEmail,
    config.password,
  );
  pushPhase(phases, "admin-login", "supabase.auth.signInWithPassword", {
    ok: true,
    summary: `admin 账号 ${config.resetConfig.adminEmail} 登录成功`,
  });

  const adminPageResult = await runAuthedRequest(
    config,
    adminCookie,
    "/admin",
    "GET",
    undefined,
    undefined,
    "manual",
  );
  if (adminPageResult.status !== 200) {
    throw new SmokePhaseError(
      "admin-page",
      "/admin",
      requestSummary(adminPageResult),
      adminPageResult.status,
      adminPageResult.requestId,
    );
  }
  pushPhase(phases, "admin-page", "/admin", {
    ok: true,
    summary: "admin 账号访问 /admin = 200",
    status: adminPageResult.status,
    requestId: adminPageResult.requestId,
  });

  const { cookieHeader: restrictedCookie } = await loginWithPhase(
    "restricted-login",
    "supabase.auth.signInWithPassword",
    config.resetConfig.restrictedEmail,
    config.password,
  );
  pushPhase(phases, "restricted-login", "supabase.auth.signInWithPassword", {
    ok: true,
    summary: `restricted 账号 ${config.resetConfig.restrictedEmail} 登录成功`,
  });

  const restrictedAdminResult = await runAuthedRequest(
    config,
    restrictedCookie,
    "/admin",
    "GET",
    undefined,
    undefined,
    "manual",
  );
  if (!isAdminAccessDeniedResult(restrictedAdminResult)) {
    throw new SmokePhaseError(
      "restricted-admin-denied",
      "/admin",
      requestSummary(restrictedAdminResult),
      restrictedAdminResult.status,
      restrictedAdminResult.requestId,
    );
  }
  pushPhase(phases, "restricted-admin-denied", "/admin", {
    ok: true,
    summary: `restricted 账号访问 /admin 被拒绝或重定向${restrictedAdminResult.status ? ` status=${restrictedAdminResult.status}` : ""}${restrictedAdminResult.headers.location ? ` location=${restrictedAdminResult.headers.location}` : ""}`,
    status: restrictedAdminResult.status,
    requestId: restrictedAdminResult.requestId,
  });

  return {
    phases,
    reset,
  };
}
