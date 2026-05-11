import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import VerifyEmailPage from "./page";

test("/verify-email renders resend verification form", () => {
  const html = renderToStaticMarkup(<VerifyEmailPage />);

  assert.match(html, /验证邮箱/);
  assert.match(html, /注册邮箱/);
  assert.match(html, /重新发送验证邮件/);
  assert.match(html, /去登录/);
});
