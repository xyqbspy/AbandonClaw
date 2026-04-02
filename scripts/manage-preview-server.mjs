import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const rootDir = process.cwd();
const tmpDir = path.join(rootDir, ".tmp");
const statePath = path.join(tmpDir, "preview-server.json");
const logPath = path.join(tmpDir, "preview-server.log");
const nextBinPath = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT || "3000";
const host = process.env.HOST || "127.0.0.1";
const command = process.argv[2] || "status";

function ensureTmpDir() {
  fs.mkdirSync(tmpDir, { recursive: true });
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
}

function writeState(state) {
  ensureTmpDir();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}

function clearState() {
  try {
    fs.unlinkSync(statePath);
  } catch {
    // ignore
  }
}

async function canReachPreview(targetHost, targetPort) {
  return await new Promise((resolve) => {
    const socket = net.createConnection(
      {
        host: targetHost,
        port: Number(targetPort),
      },
      () => {
        socket.destroy();
        resolve(true);
      },
    );

    socket.setTimeout(2500);
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function isProcessRunning(pid) {
  if (!pid || Number.isNaN(Number(pid))) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function runNode(args, options = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function printStatus(state = readState()) {
  if (!state) {
    console.log("preview 未启动");
    return;
  }

  const running = isProcessRunning(state.pid);
  const reachable = running
    ? await canReachPreview(state.host ?? host, state.port ?? port)
    : false;
  if (!running || !reachable) {
    clearState();
    console.log("preview 记录存在，但进程已退出");
    console.log(`日志: ${logPath}`);
    return;
  }

  console.log("preview 正在运行");
  console.log(`PID: ${state.pid}`);
  console.log(`地址: http://${state.host}:${state.port}`);
  console.log(`日志: ${logPath}`);
  console.log(`启动时间: ${state.startedAt}`);
}

async function startPreview() {
  const current = readState();
  if (current) {
    const running = isProcessRunning(current.pid);
    const reachable = running
      ? await canReachPreview(current.host ?? host, current.port ?? port)
      : false;
    if (running && reachable) {
      await printStatus(current);
      return;
    }
    clearState();
  }

  ensureTmpDir();
  console.log("正在构建后台 preview...");
  runNode([nextBinPath, "build"]);

  const logFd = fs.openSync(logPath, "a");
  const child = spawn(process.execPath, [nextBinPath, "start", "-p", port, "-H", host], {
    cwd: rootDir,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    shell: false,
    windowsHide: true,
    env: {
      ...process.env,
    },
  });

  child.unref();
  fs.closeSync(logFd);

  writeState({
    pid: child.pid,
    host,
    port,
    startedAt: new Date().toISOString(),
    logPath: path.relative(rootDir, logPath),
  });

  console.log(`后台 preview 已启动: http://${host}:${port}`);
  console.log(`PID: ${child.pid}`);
  console.log(`日志: ${logPath}`);
}

async function stopPreview() {
  const current = readState();
  if (!current) {
    console.log("preview 未启动");
    return;
  }

  const pid = Number(current.pid);
  const reachable = await canReachPreview(current.host ?? host, current.port ?? port);
  if (!isProcessRunning(pid) || !reachable) {
    clearState();
    console.log("preview 已停止（清理残留状态完成）");
    return;
  }

  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      cwd: rootDir,
      stdio: "ignore",
      shell: false,
    });
    if (result.status !== 0) {
      clearState();
      console.log("preview 状态已清理，但 taskkill 未成功结束旧 PID");
      return;
    }
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch (error) {
      console.error(`停止 preview 失败: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  clearState();
  console.log(`preview 已停止，PID: ${pid}`);
}

switch (command) {
  case "up":
    await startPreview();
    break;
  case "down":
    await stopPreview();
    break;
  case "restart":
    await stopPreview();
    await startPreview();
    break;
  case "status":
    await printStatus();
    break;
  default:
    console.error("用法: node scripts/manage-preview-server.mjs <up|down|restart|status>");
    process.exit(1);
}
