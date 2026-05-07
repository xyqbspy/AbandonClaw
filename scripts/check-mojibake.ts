import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, join, relative } from "node:path";

const ROOT_DIR = process.cwd();
const TARGET_DIRS = ["src", "scripts", "docs", "openspec"];
const ROOT_FILES = ["AGENTS.md", "CHANGELOG.md", "README.md", "test.md"];
const ARCHIVE_RELATIVE_PREFIX = "openspec/changes/archive/";

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

type ScanOptions = {
  includeArchive?: boolean;
};

const normalizePath = (value: string) => value.replaceAll("\\", "/");

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

function shouldSkipFile(relativePath: string, options: ScanOptions) {
  if (IGNORED_RELATIVE_PATHS.has(relativePath)) {
    return true;
  }
  if (!options.includeArchive && relativePath.startsWith(ARCHIVE_RELATIVE_PREFIX)) {
    return true;
  }
  return false;
}

function scanFile(filePath: string, options: ScanOptions = {}) {
  const relativePath = normalizePath(relative(ROOT_DIR, filePath));
  if (shouldSkipFile(relativePath, options)) {
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

function runGit(args: string[]) {
  const result = spawnSync("git", args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => normalizePath(line.trim()))
    .filter(Boolean);
}

function getTouchedArchiveFiles() {
  const candidates = new Set<string>();

  for (const filePath of runGit(["diff", "--name-only"])) {
    candidates.add(filePath);
  }
  for (const filePath of runGit(["diff", "--name-only", "--cached"])) {
    candidates.add(filePath);
  }
  for (const filePath of runGit(["ls-files", "--others", "--exclude-standard"])) {
    candidates.add(filePath);
  }

  return [...candidates]
    .filter((filePath) => filePath.startsWith(ARCHIVE_RELATIVE_PREFIX))
    .map((filePath) => join(ROOT_DIR, filePath))
    .filter((filePath) => existsSync(filePath) && statSync(filePath).isFile() && isTextFile(filePath));
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

  for (const archiveFile of getTouchedArchiveFiles()) {
    allMatches.push(...scanFile(archiveFile, { includeArchive: true }));
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
