import { getBootCheckSnapshot } from "@/lib/server/boot-check";
import { installProcessSafetyGuards } from "@/lib/server/process-guard";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[boot]", JSON.stringify(getBootCheckSnapshot()));
    installProcessSafetyGuards();
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
