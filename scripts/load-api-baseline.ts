import {
  getCliArg,
  hasCliFlag,
  loadDefaultEnvFiles,
  readBodyFile,
  runLoad,
} from "./load-api-baseline-lib";

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

const parseArgs = (): Config => {
  loadDefaultEnvFiles();

  const args = process.argv.slice(2);

  const baseUrl =
    getCliArg(args, "base-url") ?? process.env.LOAD_TEST_BASE_URL ?? "http://127.0.0.1:3000";
  const requestPath = getCliArg(args, "path") ?? "/";
  const method = (getCliArg(args, "method") ?? "GET").toUpperCase();
  const requests = Math.max(1, Number.parseInt(getCliArg(args, "requests") ?? "20", 10) || 20);
  const concurrency = Math.max(
    1,
    Math.min(requests, Number.parseInt(getCliArg(args, "concurrency") ?? "4", 10) || 4),
  );
  const bodyFile = getCliArg(args, "body-file");
  const body = readBodyFile(bodyFile);
  const cookie = getCliArg(args, "cookie") ?? process.env.LOAD_TEST_COOKIE ?? null;
  const origin = getCliArg(args, "origin") ?? process.env.LOAD_TEST_ORIGIN ?? null;
  const idempotencyKeyPrefix =
    getCliArg(args, "idempotency-key-prefix") ?? process.env.LOAD_TEST_IDEMPOTENCY_PREFIX ?? null;
  const dryRun = hasCliFlag(args, "dry-run");

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
