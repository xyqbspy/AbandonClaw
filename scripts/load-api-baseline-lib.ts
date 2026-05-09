import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type RequestConfig = {
  baseUrl: string;
  path: string;
  method: string;
  body: string | null;
  cookie: string | null;
  origin: string | null;
  idempotencyKeyPrefix?: string | null;
  extraHeaders?: Record<string, string>;
  redirect?: RequestRedirect;
};

export type RequestResult = {
  status: number;
  durationMs: number;
  ok: boolean;
  requestId: string | null;
  headers: Record<string, string>;
  bodyText: string;
  bodyJson: unknown | null;
};

export type LoadConfig = RequestConfig & {
  requests: number;
  concurrency: number;
};

export type LoadSummary = {
  totalRequests: number;
  concurrency: number;
  okCount: number;
  errorCount: number;
  statusCounts: Record<string, number>;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  avgMs: number;
};

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const resolveProjectPath = (targetPath: string) =>
  path.isAbsolute(targetPath) ? targetPath : path.join(projectRoot, targetPath);

export const loadEnvFile = (filename: string) => {
  const filePath = resolveProjectPath(filename);
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

export const loadDefaultEnvFiles = () => {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
};

export const readBodyFile = (bodyFile: string | null) => {
  if (!bodyFile) return null;
  return fs.readFileSync(resolveProjectPath(bodyFile), "utf8");
};

export const readJsonFile = <T>(filePath: string | null): T | null => {
  if (!filePath) return null;
  return JSON.parse(fs.readFileSync(resolveProjectPath(filePath), "utf8")) as T;
};

export const writeJsonFile = (filePath: string, value: unknown) => {
  const resolvedPath = resolveProjectPath(filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

export const getCliArg = (args: string[], name: string) => {
  const prefix = `--${name}=`;
  const raw = args.find((item) => item.startsWith(prefix));
  return raw ? raw.slice(prefix.length).trim() : null;
};

export const hasCliFlag = (args: string[], name: string) => args.includes(`--${name}`);

export const percentile = (sorted: number[], p: number) => {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index];
};

export const toBodyPreview = (bodyText: string, maxLength = 240) => {
  if (!bodyText) return "";
  if (bodyText.length <= maxLength) return bodyText;
  return `${bodyText.slice(0, maxLength)}...`;
};

const parseJsonSafely = (raw: string) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const buildHeaders = (config: RequestConfig, requestIndex: number) => {
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
  for (const [key, value] of Object.entries(config.extraHeaders ?? {})) {
    headers.set(key, value);
  }
  return headers;
};

export const runRequest = async (
  config: RequestConfig,
  requestIndex = 0,
): Promise<RequestResult> => {
  const startedAt = performance.now();
  const response = await fetch(`${config.baseUrl}${config.path}`, {
    method: config.method,
    headers: buildHeaders(config, requestIndex),
    body: config.body,
    redirect: config.redirect ?? "follow",
  });
  const durationMs = performance.now() - startedAt;
  const bodyText = await response.text();
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    durationMs,
    ok: response.ok,
    requestId: response.headers.get("x-request-id"),
    headers,
    bodyText,
    bodyJson: parseJsonSafely(bodyText),
  };
};

export const summarizeLoadResults = (
  results: Array<Pick<RequestResult, "status" | "durationMs" | "ok">>,
  concurrency: number,
): LoadSummary => {
  const durations = results.map((item) => item.durationMs).sort((a, b) => a - b);
  const statusCounts = results.reduce<Record<string, number>>((acc, item) => {
    const key = String(item.status);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const okCount = results.filter((item) => item.ok).length;

  return {
    totalRequests: results.length,
    concurrency,
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
        : Number(
            (
              results.reduce((sum, item) => sum + item.durationMs, 0) / results.length
            ).toFixed(2),
          ),
  };
};

export const runLoad = async (config: LoadConfig) => {
  const results: Array<Pick<RequestResult, "status" | "durationMs" | "ok">> = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < config.requests) {
      const currentIndex = cursor;
      cursor += 1;
      results.push(await runRequest(config, currentIndex));
    }
  };

  await Promise.all(Array.from({ length: config.concurrency }, () => worker()));
  return summarizeLoadResults(results, config.concurrency);
};
