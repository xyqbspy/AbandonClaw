import { logServerEvent } from "@/lib/server/logger";

// 已知第三方库内部竞态:msedge-tts 的 WebSocket onmessage/onclose 回调里裸读
// `this._streams[requestId].audio`,在我们主动 close() 后 Edge 服务器还推剩下的
// 帧就会触发,典型错误形态:
//   TypeError: Cannot read properties of undefined (reading 'audio')
//   at WebSocket.onmessage (node_modules/msedge-tts/dist/MsEdgeTTS.js:142:42)
// 这类异常不影响当前请求的最终结果(我们已经在 service.ts 里 close + reject),
// 但裸抛会成为 uncaughtException 让 Node 进入"半死"状态,体现为 PM2 不重启但
// 后续请求短时间内不响应,直到事件循环把残留状态挤掉(俗称"10 秒自愈")。
const isKnownMsEdgeTtsWebSocketRace = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message ?? "";
  const stack = error.stack ?? "";
  const isAudioReadError =
    message.includes("'audio'") || message.includes('"audio"');
  const fromMsEdgeTts =
    stack.includes("msedge-tts") || stack.includes("MsEdgeTTS");
  return isAudioReadError && fromMsEdgeTts;
};

export const __testables = { isKnownMsEdgeTtsWebSocketRace };

let installed = false;

export const installProcessSafetyGuards = () => {
  if (installed) return;
  installed = true;

  process.on("uncaughtException", (error) => {
    if (isKnownMsEdgeTtsWebSocketRace(error)) {
      logServerEvent("warn", "[process-guard] swallowed msedge-tts ws race", {
        module: "process-guard",
        error,
      });
      return;
    }
    logServerEvent("error", "[process-guard] uncaughtException — exiting", {
      module: "process-guard",
      error,
    });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    if (isKnownMsEdgeTtsWebSocketRace(reason)) {
      logServerEvent("warn", "[process-guard] swallowed msedge-tts ws race", {
        module: "process-guard",
        error: reason,
      });
      return;
    }
    logServerEvent("error", "[process-guard] unhandledRejection", {
      module: "process-guard",
      error: reason,
    });
  });
};
