import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const generateCalls: Array<Record<string, unknown>> = [];

const mockedModules = {
  "@/lib/utils/scenes-api": {
    generatePersonalizedSceneFromApi: async (payload: Record<string, unknown>) => {
      generateCalls.push(payload);
      return {
        scene: {
          slug: "generated-scene",
          title: "Generated Scene",
        },
        personalization: {
          relatedChunkVariantsUsed: [],
          relatedChunkVariantsMatched: [],
        },
      };
    },
  },
  "@/components/ui/sheet": {
    Sheet: ({
      open,
      children,
    }: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      children: React.ReactNode;
    }) => (open ? <div>{children}</div> : null),
    SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(
  this: unknown,
  request: string,
) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let GenerateSceneSheetModule: typeof import("./generate-scene-sheet") | null = null;

const getGenerateSceneSheet = () => {
  if (!GenerateSceneSheetModule) {
    const modulePath = localRequire.resolve("./generate-scene-sheet");
    delete localRequire.cache[modulePath];
    GenerateSceneSheetModule = localRequire("./generate-scene-sheet") as typeof import("./generate-scene-sheet");
  }
  return GenerateSceneSheetModule.GenerateSceneSheet;
};

afterEach(() => {
  cleanup();
  generateCalls.length = 0;
  GenerateSceneSheetModule = null;
});

test("GenerateSceneSheet 默认按句子生成并提交 anchor_sentence 模式", async () => {
  const GenerateSceneSheet = getGenerateSceneSheet();
  render(
    <GenerateSceneSheet
      open
      onOpenChange={() => undefined}
      onGenerated={() => undefined}
    />,
  );

  fireEvent.change(screen.getByLabelText("锚点句子"), {
    target: { value: "I don't care" },
  });
  fireEvent.click(screen.getByRole("button", { name: "生成场景" }));

  await waitFor(() => {
    assert.equal(generateCalls.length, 1);
  });

  assert.equal(generateCalls[0]?.mode, "anchor_sentence");
  assert.equal(generateCalls[0]?.promptText, "I don't care");
});

test("GenerateSceneSheet 切到按情境生成后会提交 context 模式", async () => {
  const GenerateSceneSheet = getGenerateSceneSheet();
  render(
    <GenerateSceneSheet
      open
      onOpenChange={() => undefined}
      onGenerated={() => undefined}
    />,
  );

  fireEvent.click(screen.getByRole("tab", { name: "按情境生成" }));
  assert.ok(screen.getByText("场景方向"));

  fireEvent.change(screen.getByLabelText("场景方向"), {
    target: { value: "我想练礼貌拒绝加班" },
  });
  fireEvent.click(screen.getByRole("button", { name: "生成场景" }));

  await waitFor(() => {
    assert.equal(generateCalls.length, 1);
  });

  assert.equal(generateCalls[0]?.mode, "context");
  assert.equal(generateCalls[0]?.promptText, "我想练礼貌拒绝加班");
});
