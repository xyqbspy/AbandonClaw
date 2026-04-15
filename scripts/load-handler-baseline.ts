import { performance } from "node:perf_hooks";
import { clearIdempotencyStore } from "@/lib/server/idempotency";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
import { handleReviewSubmitPost } from "@/app/api/review/handlers";
import { handlePracticeGeneratePost } from "@/app/api/practice/generate/route";
import { handleLearningSceneProgressPost } from "@/app/api/learning/scenes/[slug]/progress/route";

type ScenarioName = "review-submit" | "learning-progress" | "practice-generate";

type ScenarioResult = {
  name: ScenarioName;
  totalRequests: number;
  concurrency: number;
  statusCounts: Record<string, number>;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  avgMs: number;
};

const sampleScene = {
  id: "scene-1",
  slug: "scene-1",
  title: "Scene 1",
  type: "monologue",
  sections: [
    {
      id: "sec-1",
      blocks: [
        {
          id: "blk-1",
          type: "monologue",
          sentences: [
            {
              id: "s1",
              text: "I am running on empty.",
              chunks: [
                {
                  id: "chunk-1",
                  key: "chunk-1",
                  text: "running on empty",
                  start: 5,
                  end: 21,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const prefix = `--${name}=`;
    const raw = args.find((item) => item.startsWith(prefix));
    return raw ? raw.slice(prefix.length).trim() : null;
  };

  const scenario = (getArg("scenario") ?? "all") as ScenarioName | "all";
  const requests = Math.max(1, Number.parseInt(getArg("requests") ?? "30", 10) || 30);
  const concurrency = Math.max(
    1,
    Math.min(requests, Number.parseInt(getArg("concurrency") ?? "5", 10) || 5),
  );

  return { scenario, requests, concurrency };
};

const percentile = (sorted: number[], p: number) => {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
};

const summarizeDurations = (
  name: ScenarioName,
  durations: number[],
  statuses: number[],
  totalRequests: number,
  concurrency: number,
): ScenarioResult => {
  const sorted = [...durations].sort((a, b) => a - b);
  const statusCounts = statuses.reduce<Record<string, number>>((acc, item) => {
    const key = String(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return {
    name,
    totalRequests,
    concurrency,
    statusCounts,
    minMs: Number((sorted[0] ?? 0).toFixed(2)),
    p50Ms: Number(percentile(sorted, 0.5).toFixed(2)),
    p95Ms: Number(percentile(sorted, 0.95).toFixed(2)),
    maxMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
    avgMs:
      sorted.length === 0
        ? 0
        : Number((sorted.reduce((sum, item) => sum + item, 0) / sorted.length).toFixed(2)),
  };
};

const runConcurrent = async (
  totalRequests: number,
  concurrency: number,
  execute: (index: number) => Promise<Response>,
) => {
  const durations: number[] = [];
  const statuses: number[] = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < totalRequests) {
      const current = cursor;
      cursor += 1;
      const startedAt = performance.now();
      const response = await execute(current);
      durations.push(performance.now() - startedAt);
      statuses.push(response.status);
      if (!response.ok) {
        throw new Error(`Scenario request failed with status ${response.status}.`);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { durations, statuses };
};

const buildJsonRequest = (
  url: string,
  body: unknown,
  extraHeaders?: Record<string, string>,
) =>
  new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: new URL(url).origin,
      ...(extraHeaders ?? {}),
    },
    body: JSON.stringify(body),
  });

const benchmarkReviewSubmit = async (requests: number, concurrency: number) => {
  clearIdempotencyStore();
  const dependencies = {
    requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
    submitPhraseReview: async () => ({ id: "phrase-1", reviewResult: "good" } as never),
    getReviewSummary: async () => ({ dueCount: 3 } as never),
  };

  const { durations, statuses } = await runConcurrent(requests, concurrency, async (index) =>
    handleReviewSubmitPost(
      buildJsonRequest(
        "http://localhost/api/review/submit",
        {
          userPhraseId: "phrase-1",
          reviewResult: "good",
        },
        { "x-idempotency-key": `benchmark-review-${index + 1}` },
      ),
      dependencies,
    ),
  );

  return summarizeDurations("review-submit", durations, statuses, requests, concurrency);
};

const benchmarkLearningProgress = async (requests: number, concurrency: number) => {
  clearIdempotencyStore();
  const dependencies = {
    requireCurrentProfile: async () => ({ user: { id: "user-1" } } as never),
    updateSceneProgress: async () =>
      ({
        status: "in_progress",
        progressPercent: 42,
      }) as never,
  };

  const { durations, statuses } = await runConcurrent(requests, concurrency, async (index) =>
    handleLearningSceneProgressPost(
      buildJsonRequest(
        "http://localhost/api/learning/scenes/scene-1/progress",
        {
          progressPercent: 42,
          studySecondsDelta: 5,
          savedPhraseDelta: 0,
        },
        { "x-idempotency-key": `benchmark-learning-${index + 1}` },
      ),
      { params: Promise.resolve({ slug: "scene-1" }) },
      dependencies,
    ),
  );

  return summarizeDurations("learning-progress", durations, statuses, requests, concurrency);
};

const benchmarkPracticeGenerate = async (requests: number, concurrency: number) => {
  clearRateLimitStore();
  const { durations, statuses } = await runConcurrent(requests, concurrency, async (index) =>
    handlePracticeGeneratePost(
      buildJsonRequest("http://localhost/api/practice/generate", {
        scene: sampleScene,
        exerciseCount: 4,
      }),
      {
        requireCurrentProfile: async () =>
          ({ user: { id: `benchmark-user-${index + 1}` }, profile: {} } as never),
        callGlmChatCompletion: async () =>
          JSON.stringify({
            version: "v1",
            exercises: [{ id: "p1", type: "typing", prompt: "p", answer: { text: "a" } }],
          }),
        buildExerciseSpecsFromScene: () =>
          [{ id: "fallback-1", type: "typing", prompt: "p", answer: { text: "a" } }] as never,
      },
    ),
  );

  return summarizeDurations("practice-generate", durations, statuses, requests, concurrency);
};

async function main() {
  const { scenario, requests, concurrency } = parseArgs();
  const scenarios: ScenarioName[] =
    scenario === "all"
      ? ["review-submit", "learning-progress", "practice-generate"]
      : [scenario];

  const results: ScenarioResult[] = [];

  for (const item of scenarios) {
    if (item === "review-submit") {
      results.push(await benchmarkReviewSubmit(requests, concurrency));
      continue;
    }
    if (item === "learning-progress") {
      results.push(await benchmarkLearningProgress(requests, concurrency));
      continue;
    }
    results.push(await benchmarkPracticeGenerate(requests, concurrency));
  }

  console.log(
    JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        mode: "in-process-handler-baseline",
        requests,
        concurrency,
        results,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error("[load-handler-baseline] failed", error);
  process.exitCode = 1;
});
