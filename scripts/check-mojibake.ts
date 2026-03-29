import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT_DIR = process.cwd();
const TARGET_DIRS = ["src", "scripts"];
const TEXT_FILE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".html",
]);

const IGNORED_RELATIVE_PATHS = new Set([
  "scripts/check-mojibake.ts",
]);

const SUSPICIOUS_PATTERNS = [
  "�",
  "馃",
  "鐐瑰嚮",
  "绛夊緟",
  "浠婃棩",
  "瀛︿範",
  "娣诲姞",
  "鍏宠仈",
  "閲嶆柊",
  "鐢熸垚",
  "琛ュ叏",
  "褰撳墠",
  "鉁",
  "锟",
  "€�",
] as const;

type MatchRecord = {
  path: string;
  line: number;
  text: string;
  pattern: string;
};

function isTextFile(path: string) {
  return [...TEXT_FILE_EXTENSIONS].some((extension) => path.endsWith(extension));
}

function walk(dirPath: string, visitor: (filePath: string) => void) {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") {
      continue;
    }

    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, visitor);
      continue;
    }

    if (entry.isFile() && isTextFile(fullPath)) {
      visitor(fullPath);
    }
  }
}

function scanFile(filePath: string) {
  const relativePath = relative(ROOT_DIR, filePath).replaceAll("\\", "/");
  if (IGNORED_RELATIVE_PATHS.has(relativePath)) {
    return [];
  }

  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const matches: MatchRecord[] = [];

  lines.forEach((line, index) => {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (line.includes(pattern)) {
        matches.push({
          path: relative(ROOT_DIR, filePath),
          line: index + 1,
          text: line.trim(),
          pattern,
        });
        break;
      }
    }
  });

  return matches;
}

function main() {
  const allMatches: MatchRecord[] = [];

  for (const targetDir of TARGET_DIRS) {
    const fullTargetDir = join(ROOT_DIR, targetDir);
    let exists = false;
    try {
      exists = statSync(fullTargetDir).isDirectory();
    } catch {
      exists = false;
    }
    if (!exists) continue;

    walk(fullTargetDir, (filePath) => {
      allMatches.push(...scanFile(filePath));
    });
  }

  if (allMatches.length === 0) {
    console.log("未发现高置信度乱码片段。");
    return;
  }

  console.error("发现疑似乱码，请优先检查以下位置：");
  for (const match of allMatches) {
    console.error(`- ${match.path}:${match.line} [${match.pattern}] ${match.text}`);
  }
  process.exitCode = 1;
}

main();
