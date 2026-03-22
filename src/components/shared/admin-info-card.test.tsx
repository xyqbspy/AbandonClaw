import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminInfoCard, AdminInfoList, AdminNoticeCard } from "@/components/shared/admin-info-card";

test("AdminInfoCard 和 AdminInfoList 会渲染标题与信息项", () => {
  const html = renderToStaticMarkup(
    <AdminInfoCard title="学习活跃度">
      <AdminInfoList
        items={[
          { label: "学习中：", value: 3 },
          { label: "已完成：", value: 8, muted: true },
        ]}
      />
    </AdminInfoCard>,
  );

  assert.match(html, /学习活跃度/);
  assert.match(html, /学习中：/);
  assert.match(html, /已完成：/);
});

test("AdminNoticeCard 会渲染危险提示内容", () => {
  const html = renderToStaticMarkup(<AdminNoticeCard>删除后无法恢复</AdminNoticeCard>);
  assert.match(html, /删除后无法恢复/);
  assert.match(html, /text-destructive/);
});
