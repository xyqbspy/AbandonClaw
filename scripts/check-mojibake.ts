import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

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

const IGNORED_RELATIVE_PATHS = new Set<string>();

const fromCodePoints = (...codePoints: number[]) => String.fromCodePoint(...codePoints);

const IGNORED_LINE_PATTERNS = [
  `优先拦截 \`${fromCodePoints(0x9983)}\`、\`${fromCodePoints(0x9410, 0x7470, 0x56ae)}\`、\`${fromCodePoints(0xfffd)}\` 这类高置信度乱码片段。`,
];

const SUSPICIOUS_PATTERNS = [
  fromCodePoints(0x9983),
  fromCodePoints(0x9410, 0x7470, 0x56ae),
  fromCodePoints(0x93c2, 0x626e, 0x6564, 0x93b4),
  fromCodePoints(0x7ec9, 0x8bf2, 0x59e9),
  fromCodePoints(0x93ba, 0x3128, 0x5d18),
  fromCodePoints(0x9359, 0xe21d, 0xe1f0),
  fromCodePoints(0x6d7c, 0x6c2b, 0x7d2d, 0x934f),
  fromCodePoints(0x6d93, 0x5b29, 0x7af4, 0x59dd),
  fromCodePoints(0x951f),
  fromCodePoints(0x68e3),
  fromCodePoints(0x95bb, 0x612e, 0x61d3, 0x9364),
  fromCodePoints(0x7f01, 0x6d98, 0xe62f, 0x7ef6),
  fromCodePoints(0x5a34, 0x72b2, 0xfe65, 0x59ab),
  fromCodePoints(0x940e, 0x6db3, 0x7f1a, 0x7ee1),
  fromCodePoints(0x6fde, 0xff48, 0xe1e7, 0x6fee),
  fromCodePoints(0x95b8, 0x5fd3, 0x7587, 0x6d60),
  fromCodePoints(0x95c1, 0x63d2, 0x79f5, 0x93cc),
  fromCodePoints(0x95bb, 0x3222, 0x5590, 0x9368),
  fromCodePoints(0x941e, 0x6d96, 0x5131, 0x9359),
  fromCodePoints(0x745c, 0x7248, 0x6338, 0x6fa7),
  fromCodePoints(0x95b4),
  fromCodePoints(0x95bf),
  fromCodePoints(0x9227, 0xe10a, 0x62f7),
  fromCodePoints(0xfffd),
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

export function findSuspiciousPatternsInText(raw: string, relativePath: string) {
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

function scanFile(filePath: string, options: ScanOptions = {}) {
  const relativePath = normalizePath(relative(ROOT_DIR, filePath));
  if (shouldSkipFile(relativePath, options)) {
    return [];
  }

  const raw = readFileSync(filePath, "utf8");
  return findSuspiciousPatternsInText(raw, relativePath);
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

export function main() {
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

const isDirectRun = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isDirectRun) {
  main();
}
