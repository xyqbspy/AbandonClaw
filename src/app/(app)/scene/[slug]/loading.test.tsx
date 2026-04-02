import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { render, screen } from "@testing-library/react";

import SceneDetailLoading from "./loading";

test("SceneDetailLoading 会渲染场景骨架而不是空白", () => {
  render(<SceneDetailLoading />);

  assert.notEqual(screen.queryByLabelText("场景加载骨架"), null);
});
