import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.cookies) {
        event.request.cookies = "[Filtered]" as never;
      }
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        for (const key of Object.keys(headers)) {
          const lower = key.toLowerCase();
          if (lower === "authorization" || lower === "cookie" || lower.includes("token")) {
            headers[key] = "[Filtered]";
          }
        }
      }
      return event;
    },
  });
}
