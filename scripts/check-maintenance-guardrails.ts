import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

type OpenSpecChange = {
  name: string;
  completedTasks?: number;
  totalTasks?: number;
  status?: string;
};

type CheckResult = {
  name: string;
  ok: boolean;
  messages: string[];
};

const projectRoot = process.cwd();
const isWindows = process.platform === "win32";

const resolveCommand = (command: string) => {
  if (!isWindows) return command;
  if (command === "pnpm") return `${command}.exe`;
  return command;
};

const run = (command: string, args: string[]) => {
  const result = spawnSync(resolveCommand(command), args, {
    cwd: projectRoot,
    encoding: "utf8",
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.error
      ? [result.error.message, result.stderr ?? ""].filter(Boolean).join("\n")
      : (result.stderr ?? ""),
  };
};

const normalizePath = (value: string) => value.replaceAll("\\", "/");

const runOpenSpecValidate = (): CheckResult => {
  const result = run("pnpm", ["exec", "openspec", "validate", "--all", "--strict"]);
  return {
    name: "openspec validate --all --strict",
    ok: result.status === 0,
    messages:
      result.status === 0
        ? ["OpenSpec 全量校验通过。"]
        : [
            "OpenSpec 全量校验失败。",
            result.stdout.trim(),
            result.stderr.trim(),
          ].filter(Boolean),
  };
};

const getActiveChanges = () => {
  const result = run("pnpm", ["exec", "openspec", "list", "--json"]);
  if (result.status !== 0) {
    throw new Error(
      ["读取 OpenSpec active changes 失败。", result.stdout.trim(), result.stderr.trim()]
        .filter(Boolean)
        .join("\n"),
    );
  }
  const parsed = JSON.parse(result.stdout) as { changes?: OpenSpecChange[] };
  return parsed.changes ?? [];
};

const readTasksUncheckedCount = (changeName: string) => {
  const tasksPath = join(projectRoot, "openspec", "changes", changeName, "tasks.md");
  if (!existsSync(tasksPath)) return 0;
  const content = readFileSync(tasksPath, "utf8");
  return content.match(/^- \[ \]/gm)?.length ?? 0;
};

const checkActiveChanges = (): CheckResult => {
  const changes = getActiveChanges();
  const messages: string[] = [];
  let ok = true;

  for (const change of changes) {
    const uncheckedCount = readTasksUncheckedCount(change.name);
    if (uncheckedCount > 0) {
      ok = false;
      messages.push(`${change.name}: tasks.md 仍有 ${uncheckedCount} 个未完成任务。`);
    }
    if (change.status === "complete") {
      ok = false;
      messages.push(`${change.name}: 状态为 complete，但仍在 active changes 中，请先 archive。`);
    }
  }

  if (messages.length === 0) {
    messages.push("未发现未收尾的 active change。");
  }

  return {
    name: "OpenSpec active changes",
    ok,
    messages,
  };
};

const getCurrentBranch = () => run("git", ["branch", "--show-current"]).stdout.trim();

const getChangedFiles = () =>
  run("git", ["status", "--short"])
    .stdout.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizePath(line.slice(3).trim()));

const USER_VISIBLE_PREFIXES = [
  "src/app/",
  "src/components/",
  "src/features/",
  "src/lib/utils/",
  "src/lib/server/",
  "supabase/sql/",
  "middleware.ts",
  "next.config.ts",
];

const checkChangelogWarning = () => {
  const branch = getCurrentBranch();
  const changedFiles = getChangedFiles();
  const changedChangelog = changedFiles.includes("CHANGELOG.md");
  const maybeUserVisible = changedFiles.some((file) =>
    USER_VISIBLE_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );

  if (branch !== "main" || !maybeUserVisible || changedChangelog) {
    return null;
  }

  return "当前在 main，且存在可能用户可感知的文件变更；请人工确认是否需要更新 CHANGELOG.md。";
};

const results: CheckResult[] = [];

try {
  results.push(runOpenSpecValidate());
  results.push(checkActiveChanges());
} catch (error) {
  results.push({
    name: "maintenance check bootstrap",
    ok: false,
    messages: [error instanceof Error ? error.message : String(error)],
  });
}

const warnings = [checkChangelogWarning()].filter((value): value is string => Boolean(value));
const failed = results.filter((result) => !result.ok);

for (const result of results) {
  const marker = result.ok ? "OK" : "FAIL";
  console.log(`[${marker}] ${result.name}`);
  for (const message of result.messages) {
    console.log(`  - ${message}`);
  }
}

for (const warning of warnings) {
  console.log(`[WARN] ${warning}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
