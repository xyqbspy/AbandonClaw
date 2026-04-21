import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { JSDOM } from "jsdom";

if (typeof document === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  globalThis.window = dom.window as unknown as typeof globalThis & Window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.Node = dom.window.Node;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
  });
}

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const mockedModules = {
  "@/components/ui/sheet": {
    Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
  "@/features/chunks/components/focus-detail-sheet": {
    FocusDetailSheet: () => null,
  },
  "@/features/chunks/components/move-into-cluster-sheet": {
    MoveIntoClusterSheet: () => null,
  },
  "@/features/chunks/components/expression-map-sheet": {
    ExpressionMapSheet: () => null,
  },
  "./chunks-quick-add-related-sheet": {
    ChunksQuickAddRelatedSheet: () => null,
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

let ChunksPageSheetsModule: typeof import("./chunks-page-sheets") | null = null;

function getChunksPageSheets() {
  if (!ChunksPageSheetsModule) {
    const modulePath = localRequire.resolve("./chunks-page-sheets");
    delete localRequire.cache[modulePath];
    ChunksPageSheetsModule = localRequire("./chunks-page-sheets") as typeof import("./chunks-page-sheets");
  }
  return ChunksPageSheetsModule.ChunksPageSheets;
}

afterEach(() => {
  cleanup();
  ChunksPageSheetsModule = null;
});

function createBaseProps() {
  return {
    manual: {
      open: true,
      onOpenChange: () => undefined,
      itemType: "expression" as const,
      onItemTypeChange: () => undefined,
      text: "",
      onTextChange: () => undefined,
      sentence: "",
      onSentenceChange: () => undefined,
      saving: false,
      state: {
        title: "添加学习内容",
        description: "desc",
        itemTypeLabel: "记录类型",
        footerGridClassName: "grid-cols-2",
        isSaving: false,
        isPrimarySaving: false,
        isSecondarySaving: false,
        primaryActionLabel: "保存到表达库",
        secondaryActionLabel: "保存并加入复习",
        showSecondaryAction: true,
      },
      assistLoading: false,
      assist: null,
      selectedMap: {},
      onLoadAssist: () => undefined,
      onToggleSelected: () => undefined,
      onSave: () => undefined,
      onReset: () => undefined,
      clearAssist: () => undefined,
      normalizeSimilarLabel: (value: string | null | undefined) => value ?? "",
      renderExampleSentenceCards: () => null,
      handlePronounceSentence: () => undefined,
      speakingText: null,
      loadingText: null,
      labels: {
        itemTypeExpression: "表达",
        itemTypeSentence: "句子",
        expressionTextLabel: "表达",
        expressionTextPlaceholder: "placeholder",
        generatingSuggestions: "生成中",
        findMoreRelated: "找更多关联",
        currentInputCard: "当前输入",
        similarExpressionsAuto: "同类",
        similarEmpty: "空",
        contrastExpressionsAuto: "对照",
        noContrastExpressions: "空",
        sentenceMainLabel: "句子",
        sentenceMainPlaceholder: "placeholder",
        sentenceAutoHint: "hint",
      },
    },
    quickAdd: {
      open: false,
      onOpenChange: () => undefined,
    },
    generatedSimilar: {
      open: false,
      onOpenChange: () => undefined,
      savingSelected: false,
      generatingForId: null,
      seedExpressionText: "",
      candidates: [],
      selectedMap: {},
      onToggleCandidate: () => undefined,
      onSaveSelected: () => undefined,
      onReset: () => undefined,
      state: {
        title: "",
        description: "",
        showSeedExpression: false,
        centerExpressionLabel: "",
        showGenerating: false,
        generatingLabel: "",
        showEmpty: false,
        emptyLabel: "",
        showCandidates: false,
        closeLabel: "关闭",
        submitLabel: "提交",
      },
      normalizeSimilarLabel: (value: string | null | undefined) => value ?? "",
      close: () => undefined,
    },
    focusDetail: { open: false, onOpenChange: () => undefined } as never,
    moveIntoCluster: { open: false, onOpenChange: () => undefined } as never,
    expressionMap: { open: false, onOpenChange: () => undefined } as never,
    apple: {
      panel: "",
      button: "",
      buttonStrong: "",
      inputPanel: "",
      metaText: "",
      bannerDanger: "",
      bannerInfo: "",
      listItem: "",
    },
  };
}

test("ChunksPageSheets 在表达模式下让保存并加入复习保持主按钮", () => {
  const ChunksPageSheets = getChunksPageSheets();
  render(<ChunksPageSheets {...createBaseProps()} />);

  const saveButton = screen.getByRole("button", { name: "保存到表达库" });
  const reviewButton = screen.getByRole("button", { name: "保存并加入复习" });

  assert.ok(saveButton.className.includes("app-button-secondary"));
  assert.ok(!saveButton.className.includes("app-button-ghost"));
  assert.ok(reviewButton.className.includes("app-button-primary"));
  assert.ok(!reviewButton.className.includes("app-button-ghost"));
});

test("ChunksPageSheets 在句子模式下让保存句子保持次按钮", () => {
  const ChunksPageSheets = getChunksPageSheets();
  const props = createBaseProps();
  props.manual.itemType = "sentence";
  props.manual.state.footerGridClassName = "grid-cols-1";
  props.manual.state.primaryActionLabel = "保存句子";
  props.manual.state.showSecondaryAction = false;

  render(<ChunksPageSheets {...props} />);

  const saveSentenceButton = screen.getByRole("button", { name: "保存句子" });
  assert.ok(saveSentenceButton.className.includes("app-button-secondary"));
  assert.ok(!saveSentenceButton.className.includes("app-button-ghost"));
});
