import assert from "node:assert/strict";
import test from "node:test";
import { clearRateLimitStore } from "@/lib/server/rate-limit";
import { POST } from "./route";

const createReport = (body: unknown, contentType = "application/csp-report", ip = "127.0.0.1") =>
  new Request("http://localhost/api/csp-report", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });

test.beforeEach(() => {
  clearRateLimitStore();
});

test("CSP report 接收 csp-report 格式 payload 并返回 204", async () => {
  const response = await POST(
    createReport({
      "csp-report": {
        "document-uri": "http://localhost/today",
        "violated-directive": "img-src",
        "blocked-uri": "https://evil.example.com/track.gif",
      },
    }),
  );
  assert.equal(response.status, 204);
});

test("CSP report 接收 Reporting API 数组格式 payload 并返回 204", async () => {
  const response = await POST(
    createReport(
      [
        {
          type: "csp-violation",
          body: {
            documentURL: "http://localhost/today",
            effectiveDirective: "script-src",
            blockedURL: "inline",
          },
        },
      ],
      "application/reports+json",
      "127.0.0.2",
    ),
  );
  assert.equal(response.status, 204);
});

test("CSP report 拒绝非法 JSON payload", async () => {
  const request = new Request("http://localhost/api/csp-report", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.3" },
    body: "not json",
  });
  const response = await POST(request);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "Invalid JSON payload.");
});

test("CSP report 拒绝缺少 csp-report 字段的 payload", async () => {
  const response = await POST(createReport({ random: "field" }, "application/json", "127.0.0.4"));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "Invalid CSP report payload.");
});

test("CSP report 命中限流时返回 429", async () => {
  const ip = "127.0.0.99";
  for (let i = 0; i < 30; i += 1) {
    const response = await POST(
      createReport(
        {
          "csp-report": { "document-uri": "http://localhost", "violated-directive": "img-src" },
        },
        "application/csp-report",
        ip,
      ),
    );
    assert.equal(response.status, 204);
  }

  const limited = await POST(
    createReport(
      {
        "csp-report": { "document-uri": "http://localhost", "violated-directive": "img-src" },
      },
      "application/csp-report",
      ip,
    ),
  );
  assert.equal(limited.status, 429);
});