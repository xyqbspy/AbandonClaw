import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const localRequire = createRequire(import.meta.url);
const nodeModule = localRequire("node:module") as typeof import("node:module");

const mockedModules = {
  "next/link": {
    __esModule: true,
    default: ({
      href,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href, ...props }, children),
  },
  "@/components/shared/action-loading": {
    LoadingState: ({ text }: { text: string }) => React.createElement("div", null, text),
  },
} satisfies Record<string, unknown>;

const originalRequire = nodeModule.Module.prototype.require;
nodeModule.Module.prototype.require = function patchedRequire(this: unknown, request: string) {
  if (request in mockedModules) {
    return mockedModules[request as keyof typeof mockedModules];
  }
  return originalRequire.call(this, request);
};

afterEach(() => {
  cleanup();
});

test("TodayContinueCard 在 pending 时展示骨架并禁用按钮", async () => {
  const { TodayContinueCard } = localRequire("./today-continue-card") as typeof import("./today-continue-card");
  let clicked = false;

  render(
    <TodayContinueCard
      title="正在恢复今天的学习进度"
      subtitle="稍等一下，正在同步你上次学到的场景和步骤。"
      stepLabel="正在加载"
      stepIcon="🎧"
      helperText="正在恢复继续学习入口"
      progressPercent={0}
      isPending
      ctaLabel="正在恢复进度..."
      onContinue={() => {
        clicked = true;
      }}
    />,
  );

  assert.ok(screen.getByRole("button", { name: "正在恢复进度..." }).hasAttribute("disabled"));
  screen.getByLabelText("继续学习进度加载中");
  screen.getByLabelText("继续学习说明加载中");
  fireEvent.click(screen.getByRole("button", { name: "正在恢复进度..." }));
  assert.equal(clicked, false);
});

test("TodayWelcomeCard 会渲染欢迎语和连续学习天数", async () => {
  const { TodayWelcomeCard } = localRequire("./today-welcome-card") as typeof import("./today-welcome-card");

  render(<TodayWelcomeCard displayName="xyqbspy" streakDays={7} />);

  screen.getByText("欢迎回来，xyqbspy");
  screen.getByText("7");
  screen.getByText("连续学习");
});

test("TodayLearningPathSection 会处理点击和 locked 状态", async () => {
  const { TodayLearningPathSection } = localRequire(
    "./today-learning-path-section",
  ) as typeof import("./today-learning-path-section");
  const clickedIds: string[] = [];

  render(
    <TodayLearningPathSection
      tasks={[
        {
          id: "task-scene",
          title: "场景输入",
          description: "",
          durationMinutes: 10,
          done: false,
          actionHref: "/scene/demo",
          status: "available",
          actionLabel: "继续，听熟这段",
        },
        {
          id: "task-review",
          title: "回忆复习",
          description: "",
          durationMinutes: 5,
          done: false,
          actionHref: "/review",
          status: "locked",
        },
      ]}
      onOpenTask={(task) => {
        clickedIds.push(task.id);
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /场景输入/ }));
  assert.deepEqual(clickedIds, ["task-scene"]);

  const lockedButton = screen.getByRole("button", { name: /回忆复习/ });
  assert.ok(lockedButton.hasAttribute("disabled"));
  fireEvent.click(lockedButton);
  assert.deepEqual(clickedIds, ["task-scene"]);
});

test("TodaySavedExpressionsSection 会渲染表达列表和跳转入口", async () => {
  const { TodaySavedExpressionsSection } = localRequire(
    "./today-saved-expressions-section",
  ) as typeof import("./today-saved-expressions-section");

  render(
    <TodaySavedExpressionsSection
      savedPhraseCount={2}
      items={[
        { key: "a", text: "burn yourself out", meta: "把自己熬垮" },
        { key: "b", text: "call it a day", meta: "今天先到这" },
      ]}
    />,
  );

  screen.getByText("burn yourself out", { exact: false });
  screen.getByText("把自己熬垮");
  const link = screen.getByRole("link");
  assert.equal(link.getAttribute("href"), "/chunks");
});

test("TodayReviewSummaryCard 会根据待复习数量切换状态文案", async () => {
  const { TodayReviewSummaryCard } = localRequire("./today-review-summary-card") as typeof import("./today-review-summary-card");
  let clicked = 0;

  const { rerender } = render(
    <TodayReviewSummaryCard
      reviewAccuracy={92}
      dueReviewCount={3}
      onClick={() => {
        clicked += 1;
      }}
    />,
  );

  screen.getByText("92%");
  screen.getByText(/3 条表达待复习/);
  fireEvent.click(screen.getByRole("button"));
  assert.equal(clicked, 1);

  rerender(
    <TodayReviewSummaryCard
      reviewAccuracy={null}
      dueReviewCount={0}
      onClick={() => {
        clicked += 1;
      }}
    />,
  );

  screen.getByText("--");
  screen.getByText(/当前没有待复习内容/);
});

test("TodayRecommendedScenesSection 会处理 loading 和列表点击", async () => {
  const { TodayRecommendedScenesSection } = localRequire(
    "./today-recommended-scenes-section",
  ) as typeof import("./today-recommended-scenes-section");
  const openCalls: string[] = [];

  const { rerender } = render(
    <TodayRecommendedScenesSection
      loading
      recommendedScenes={[]}
      emptyText="暂无推荐"
      loadingText="加载场景中..."
      getRecommendationReason={() => ""}
      getRecommendationBadge={() => ""}
      onOpenScene={(slug) => {
        openCalls.push(slug);
      }}
    />,
  );

  screen.getByText("加载场景中...");

  rerender(
    <TodayRecommendedScenesSection
      loading={false}
      recommendedScenes={[
        {
          id: "scene-1",
          slug: "coffee-chat",
          title: "Coffee Chat",
          subtitle: "At the cafe",
          difficulty: "Intermediate",
          estimatedMinutes: 9,
          sentenceCount: 8,
          sceneType: "dialogue",
          sourceType: "builtin",
          createdAt: "2026-03-21T00:00:00.000Z",
          variantLinks: [],
          learningStatus: "in_progress",
          progressPercent: 30,
          lastViewedAt: "2026-03-21T00:00:00.000Z",
        },
      ]}
      emptyText="暂无推荐"
      loadingText="加载场景中..."
      getRecommendationReason={() => "可以顺手接着练"}
      getRecommendationBadge={() => "⭐ 继续"}
      onOpenScene={(slug) => {
        openCalls.push(slug);
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: /Coffee Chat/ }));
  assert.deepEqual(openCalls, ["coffee-chat"]);
});
