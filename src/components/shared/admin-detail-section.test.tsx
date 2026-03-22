import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AdminCodeBlock,
  AdminDetailGrid,
  AdminDetailItem,
  AdminDetailSection,
} from "@/components/shared/admin-detail-section";

test("AdminDetailSection 会渲染标题、字段和代码块", () => {
  const html = renderToStaticMarkup(
    <AdminDetailSection title="元信息">
      <AdminDetailGrid>
        <AdminDetailItem label="id:" value="scene-1" />
      </AdminDetailGrid>
      <AdminCodeBlock>{"{\"ok\":true}"}</AdminCodeBlock>
    </AdminDetailSection>,
  );

  assert.match(html, /元信息/);
  assert.match(html, /id:/);
  assert.match(html, /scene-1/);
  assert.match(html, /\{&quot;ok&quot;:true\}/);
});
