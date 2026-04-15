import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Config = {
  baseUrl: string;
  path: string;
  method: string;
  requests: number;
  concurrency: number;
  body: string | null;
  cookie: string | null;
  origin: string | null;
  idempotencyKeyPrefix: string | null;
  dryRun: boolean;
};

type Result = {
  status: number;
  durationMs: number;
  ok: boolean;
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const loadEnvFile = (filename: string) => {
  const filePath = path.join(projectRoot, filename);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const readBodyFile = (bodyFile: string | null) => {
  if (!bodyFile) return null;
  const fullPath = path.isAbsolute(bodyFile) ? bodyFile : path.join(projectRoot, bodyFile);
  return fs.readFileSync(fullPath, "utf8");
};

const parseArgs = (): Config => {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const prefix = `--${name}=`;
    const raw = args.find((item) => item.startsWith(prefix));
    return raw ? raw.slice(prefix.length).trim() : null;
  };
  const hasFlag = (name: string) => args.includes(`--${name}`);

  const baseUrl = getArg("base-url") ?? process.env.LOAD_TEST_BASE_URL ?? "http://127.0.0.1:3000";
  const requestPath = getArg("path") ?? "/";
  const method = (getArg("method") ?? "GET").toUpperCase();
  const requests = Math.max(1, Number.parseInt(getArg("requests") ?? "20", 10) || 20);
  const concurrency = Math.max(
    1,
    Math.min(requests, Number.parseInt(getArg("concurrency") ?? "4", 10) || 4),
  );
  const bodyFile = getArg("body-file");
  const body = readBodyFile(bodyFile);
  const cookie = getArg("cookie") ?? process.env.LOAD_TEST_COOKIE ?? null;
  const origin = getArg("origin") ?? process.env.LOAD_TEST_ORIGIN ?? null;
  const idempotencyKeyPrefix =
    getArg("idempotency-key-prefix") ?? process.env.LOAD_TEST_IDEMPOTENCY_PREFIX ?? null;
  const dryRun = hasFlag("dry-run");

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    path: requestPath.startsWith("/") ? requestPath : `/${requestPath}`,
    method,
    requests,
    concurrency,
    body,
    cookie,
    origin,
    idempotencyKeyPrefix,
    dryRun,
  };
};

const percentile = (sorted: number[], p: number) => {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
};

const buildHeaders = (config: Config, requestIndex: number) => {
  const headers = new Headers();
  if (config.body) {
    headers.set("content-type", "application/json");
  }
  if (config.cookie) {
    headers.set("cookie", config.cookie);
  }
  if (config.origin) {
    headers.set("origin", config.origin);
  }
  if (config.idempotencyKeyPrefix) {
    headers.set("x-idempotency-key", `${config.idempotencyKeyPrefix}-${requestIndex + 1}`);
  }
  return headers;
};

const runOne = async (config: Config, requestIndex: number): Promise<Result> => {
  const startedAt = performance.now();
  const response = await fetch(`${config.baseUrl}${config.path}`, {
    method: config.method,
    headers: buildHeaders(config, requestIndex),
    body: config.body,
  });
  const durationMs = performance.now() - startedAt;
  return {
    status: response.status,
    durationMs,
    ok: response.ok,
  };
};

const runLoad = async (config: Config) => {
  const results: Result[] = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < config.requests) {
      const currentIndex = cursor;
      cursor += 1;
      results.push(await runOne(config, currentIndex));
    }
  };

  await Promise.all(Array.from({ length: config.concurrency }, () => worker()));

  const durations = results.map((item) => item.durationMs).sort((a, b) => a - b);
  const statusCounts = results.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.status);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const okCount = results.filter((item) => item.ok).length;

  return {
    totalRequests: results.length,
    concurrency: config.concurrency,
    okCount,
    errorCount: results.length - okCount,
    statusCounts,
    minMs: Number(durations[0]?.toFixed(2) ?? 0),
    p50Ms: Number(percentile(durations, 0.5).toFixed(2)),
    p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
    maxMs: Number(durations[durations.length - 1]?.toFixed(2) ?? 0),
    avgMs:
      results.length === 0
        ? 0
        : Number((results.reduce((sum, item) => sum + item.durationMs, 0) / results.length).toFixed(2)),
  };
};

async function main() {
  const config = parseArgs();

  if (config.dryRun) {
    console.log(
      JSON.stringify(
        {
          ...config,
          bodyPreview: config.body ? `${config.body.slice(0, 120)}${config.body.length > 120 ? "..." : ""}` : null,
        },
        null,
        2,
      ),
    );
    return;
  }

  const startedAt = Date.now();
  const summary = await runLoad(config);
  console.log(
    JSON.stringify(
      {
        startedAt: new Date(startedAt).toISOString(),
        target: `${config.method} ${config.baseUrl}${config.path}`,
        ...summary,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error("[load-api-baseline] failed", error);
  process.exitCode = 1;
});
