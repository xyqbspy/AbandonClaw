import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { CSP_DIRECTIVES, getCspHeader, isCspEnforce } from "./csp";

const originalCspEnforce = process.env.CSP_ENFORCE;

afterEach(() => {
  if (originalCspEnforce === undefined) {
    delete process.env.CSP_ENFORCE;
  } else {
    process.env.CSP_ENFORCE = originalCspEnforce;
  }
});

test("getCspHeader returns report-only key by default", () => {
  delete process.env.CSP_ENFORCE;
  assert.equal(getCspHeader().key, "Content-Security-Policy-Report-Only");
  assert.equal(getCspHeader().value, CSP_DIRECTIVES);
});

test("getCspHeader returns enforce key when CSP_ENFORCE=true", () => {
  process.env.CSP_ENFORCE = "true";
  assert.equal(getCspHeader().key, "Content-Security-Policy");
  assert.equal(getCspHeader().value, CSP_DIRECTIVES);
});

test("getCspHeader only treats exact string 'true' as enforce", () => {
  for (const value of ["1", "yes", "TRUE", "True", "  true", "true  ", "false", ""]) {
    process.env.CSP_ENFORCE = value;
    assert.equal(
      getCspHeader().key,
      "Content-Security-Policy-Report-Only",
      `CSP_ENFORCE=${JSON.stringify(value)} should not flip to enforce`,
    );
  }
});

test("isCspEnforce matches getCspHeader decision", () => {
  delete process.env.CSP_ENFORCE;
  assert.equal(isCspEnforce(), false);
  process.env.CSP_ENFORCE = "true";
  assert.equal(isCspEnforce(), true);
  process.env.CSP_ENFORCE = "TRUE";
  assert.equal(isCspEnforce(), false);
});

test("CSP_DIRECTIVES retains required connect-src sources", () => {
  for (const required of [
    "*.supabase.co",
    "*.upstash.io",
    "*.ingest.sentry.io",
    "open.bigmodel.cn",
  ]) {
    assert.ok(
      CSP_DIRECTIVES.includes(required),
      `CSP_DIRECTIVES should include ${required} in connect-src`,
    );
  }
});

test("CSP_DIRECTIVES retains report-uri so violations still flow to /api/csp-report", () => {
  assert.ok(CSP_DIRECTIVES.includes("report-uri /api/csp-report"));
});
