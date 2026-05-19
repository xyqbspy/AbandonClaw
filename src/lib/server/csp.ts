export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io https://*.sentry.io https://*.ingest.sentry.io https://o*.ingest.sentry.io https://open.bigmodel.cn http://model.imfan.top https://api.openai.com",
  "media-src 'self' https: blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "report-uri /api/csp-report",
].join("; ");

export const isCspEnforce = () => process.env.CSP_ENFORCE === "true";

export const getCspHeader = () => ({
  key: isCspEnforce() ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only",
  value: CSP_DIRECTIVES,
});
