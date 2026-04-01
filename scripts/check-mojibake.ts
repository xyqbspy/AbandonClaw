import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT_DIR = process.cwd();
const TARGET_DIRS = ["src", "scripts", "docs", "openspec"];
const ROOT_FILES = ["AGENTS.md", "CHANGELOG.md", "README.md", "test.md"];

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
  ".md",
  ".yaml",
  ".yml",
]);

const IGNORED_RELATIVE_PATHS = new Set(["scripts/check-mojibake.ts"]);
const IGNORED_RELATIVE_PREFIXES = ["openspec/changes/archive/"];
const IGNORED_LINE_PATTERNS = [
  "优先拦截 `馃`、`鐐瑰嚮`、`�` 这类高置信度乱码片段。",
];

const SUSPICIOUS_PATTERNS = [
  "锟",
  "棣",
  "閻愮懓鍤",
  "缁涘绶",
  "娴犲﹥妫",
  "鐎涳缚绡",
  "濞ｈ濮",
  "閸忓疇浠",
  "闁插秵鏌",
  "閻㈢喐鍨",
  "鐞涖儱鍙",
  "瑜版挸澧",
  "閴",
  "閿",
  "鈧拷",
  "\uFFFD",
] as const;

type MatchRecord = {
  path: string;
  line: number;
  text: string;
  pattern: string;
};

function isTextFile(filePath: string) {
  return TEXT_FILE_EXTENSIONS.has(extname(filePath).toLowerCase());
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
  if (IGNORED_RELATIVE_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
    return [];
  }

  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const matches: MatchRecord[] = [];

  lines.forEach((line, index) => {
    if (IGNORED_LINE_PATTERNS.some((pattern) => line.includes(pattern))) {
      return;
    }
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (line.includes(pattern)) {
        matches.push({
          path: relativePath,
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
    if (!existsSync(fullTargetDir)) continue;

    let isDirectory = false;
    try {
      isDirectory = statSync(fullTargetDir).isDirectory();
    } catch {
      isDirectory = false;
    }
    if (!isDirectory) continue;

    walk(fullTargetDir, (filePath) => {
      allMatches.push(...scanFile(filePath));
    });
  }

  for (const rootFile of ROOT_FILES) {
    const fullPath = join(ROOT_DIR, rootFile);
    if (!existsSync(fullPath)) continue;
    allMatches.push(...scanFile(fullPath));
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
