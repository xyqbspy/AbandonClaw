import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFocusDetailCloseState,
  buildFocusDetailState,
  createFocusDetailTrailItem,
  resolveFocusRelationTabOnDetailTabChange,
  resolveReopenFocusTrail,
  updateFocusDetailTrail,
} from "./chunks-focus-detail-logic";
import { UserPhraseItemResponse } from "@/lib/utils/phrases-api";

const first = createFocusDetailTrailItem({
  userPhraseId: "p1",
  text: "call it a day",
  kind: "library-similar",
  tab: "similar",
});

const second = createFocusDetailTrailItem({
  userPhraseId: "p2",
  text: "wrap things up",
  kind: "contrast",
  tab: "contrast",
});

test("updateFocusDetailTrail 会在 reset 和 append 间稳定切换", () => {
  assert.deepEqual(
    updateFocusDetailTrail({
      current: [first],
      nextItem: second,
      chainMode: "reset",
    }),
    [second],
  );

  assert.deepEqual(
    updateFocusDetailTrail({
      current: [first],
      nextItem: second,
      chainMode: "append",
    }),
    [first, second],
  );
});

test("updateFocusDetailTrail 遇到重复项时会截断并更新该节点", () => {
  const duplicate = createFocusDetailTrailItem({
    userPhraseId: "p1-new",
    text: "Call It A Day",
    kind: "library-similar",
    tab: "info",
  });

  assert.deepEqual(
    updateFocusDetailTrail({
      current: [first, second],
      nextItem: duplicate,
      chainMode: "append",
    }),
    [duplicate],
  );
});

test("resolveReopenFocusTrail 会返回目标节点、下一段 trail 和 tab", () => {
  assert.deepEqual(
    resolveReopenFocusTrail({
      trail: [first, second],
      index: 0,
    }),
    {
      target: first,
      nextTrail: [first],
      nextTab: "similar",
    },
  );

  assert.equal(
    resolveReopenFocusTrail({
      trail: [first],
      index: 2,
    }),
    null,
  );
});

test("buildFocusDetailState 会稳定构造 detail 状态", () => {
  const savedItem = { userPhraseId: "p1" } as UserPhraseItemResponse;
  assert.deepEqual(
    buildFocusDetailState({
      text: "call it a day",
      differenceLabel: "接近说法",
      kind: "library-similar",
      savedItem,
    }),
    {
      text: "call it a day",
      differenceLabel: "接近说法",
      kind: "library-similar",
      savedItem,
      assistItem: null,
    },
  );
});

test("buildFocusDetailCloseState 和 tab 联动规则会返回稳定结果", () => {
  assert.deepEqual(buildFocusDetailCloseState(), {
    open: false,
    actionsOpen: false,
    trail: [],
    tab: "info",
  });
  assert.equal(resolveFocusRelationTabOnDetailTabChange("similar", "contrast"), "similar");
  assert.equal(resolveFocusRelationTabOnDetailTabChange("contrast", "similar"), "contrast");
  assert.equal(resolveFocusRelationTabOnDetailTabChange("info", "contrast"), "contrast");
});
