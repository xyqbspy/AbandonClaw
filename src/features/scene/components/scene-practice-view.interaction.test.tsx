import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ScenePracticeView } from "./scene-practice-view";
import { sceneViewLabels } from "./scene-view-labels";
import { PracticeSet } from "@/lib/types/learning-flow";

afterEach(() => {
  cleanup();
});

const hasTextContent = (text: string) => (_content: string, element: Element | null) =>
  Boolean(element?.textContent?.includes(text));

const fillCurrentAnswer = (value: string) => {
  fireEvent.change(screen.getByPlaceholderText("输入你认为正确的表达"), {
    target: { value },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查答案" }));
};

const openHeaderMenu = () => {
  fireEvent.click(screen.getByRole("button", { name: "打开练习菜单" }));
};

async function completeClozeModule() {
  fillCurrentAnswer("call it a day");
  fillCurrentAnswer("take it easy");
  await waitFor(() => {
    const guidedRecallButton = screen.getByRole("button", { name: /半句复现/ });
    assert.equal(guidedRecallButton.hasAttribute("disabled"), false);
    assert.ok(screen.getAllByText("进行中").length >= 1);
  });
}

async function completeAllModules() {
  await completeClozeModule();
  fireEvent.click(screen.getByRole("button", { name: /半句复现/ }));
  fillCurrentAnswer("slow down a little tonight.");
  await waitFor(() => {
    assert.ok(screen.getByText("本轮练习总结"));
  });
}

const practiceSet: PracticeSet = {
  id: "practice-1",
  sourceSceneId: "scene-1",
  sourceSceneTitle: "Coffee Chat",
  sourceType: "original",
  modules: [
    {
      mode: "cloze",
      modeLabel: "填空练习",
      title: "开始练习",
      exercises: [
        {
          id: "exercise-1",
          type: "chunk_cloze",
          inputMode: "typing",
          sceneId: "scene-1",
          sentenceId: "sentence-1",
          chunkId: "chunk-1",
          prompt: "补全句子中的表达",
          answer: {
            text: "call it a day",
            acceptedAnswers: ["call it a day"],
          },
          cloze: {
            displayText: "I should ____ now.",
          },
        },
        {
          id: "exercise-2",
          type: "chunk_cloze",
          inputMode: "typing",
          sceneId: "scene-1",
          sentenceId: "sentence-2",
          chunkId: "chunk-2",
          prompt: "补全第二句中的表达",
          answer: {
            text: "take it easy",
            acceptedAnswers: ["take it easy"],
          },
          cloze: {
            displayText: "You should ____ tonight.",
          },
        },
      ],
    },
    {
      mode: "guided_recall",
      modeLabel: "半句复现",
      title: "开始练习",
      exercises: [
        {
          id: "guided-1",
          type: "typing",
          inputMode: "typing",
          sceneId: "scene-1",
          sentenceId: "sentence-3",
          prompt: "看到前半句，补出后半句",
          hint: "慢一点，别着急。",
          answer: {
            text: "slow down a little tonight.",
            acceptedAnswers: ["slow down a little tonight."],
          },
          cloze: {
            displayText: "Maybe you should ____",
          },
        },
      ],
    },
  ],
  exercises: [
    {
      id: "exercise-1",
      type: "chunk_cloze",
      inputMode: "typing",
      sceneId: "scene-1",
      sentenceId: "sentence-1",
      chunkId: "chunk-1",
      prompt: "补全句子中的表达",
      answer: {
        text: "call it a day",
        acceptedAnswers: ["call it a day"],
      },
      cloze: {
        displayText: "I should ____ now.",
      },
    },
    {
      id: "exercise-2",
      type: "chunk_cloze",
      inputMode: "typing",
      sceneId: "scene-1",
      sentenceId: "sentence-2",
      chunkId: "chunk-2",
      prompt: "补全第二句中的表达",
      answer: {
        text: "take it easy",
        acceptedAnswers: ["take it easy"],
      },
      cloze: {
        displayText: "You should ____ tonight.",
      },
    },
  ],
  status: "generated",
  createdAt: "2026-03-21T00:00:00.000Z",
};

test("ScenePracticeView 填空完成后会解锁半句复现模块", async () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  const guidedRecallButton = screen.getByRole("button", { name: /半句复现/ });
  assert.equal(guidedRecallButton.hasAttribute("disabled"), true);

  fireEvent.change(screen.getByPlaceholderText("输入你认为正确的表达"), {
    target: { value: "call it a day" },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查答案" }));

  fireEvent.change(screen.getByPlaceholderText("输入你认为正确的表达"), {
    target: { value: "take it easy" },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查答案" }));

  await waitFor(() => {
    const enabledGuidedRecallButton = screen.getByRole("button", { name: /半句复现/ });
    assert.equal(enabledGuidedRecallButton.hasAttribute("disabled"), false);
    assert.ok(screen.getAllByText("进行中").length >= 1);
  });
});

test("ScenePracticeView 点击答案按钮会触发切换回调", () => {
  let toggledId = "";

  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={(exerciseId) => {
        toggledId = exerciseId;
      }}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "显示答案" }));
  assert.equal(toggledId, "exercise-1");
});

test("ScenePracticeView 在答案已显示时会渲染答案文本和隐藏答案按钮", () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{ "exercise-1": true }}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getAllByText("call it a day").length >= 1);
  assert.ok(screen.getByRole("button", { name: "隐藏答案" }));
});

test("ScenePracticeView 支持填空题输入并判断正确", async () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getByText("I should ____ now."));
  assert.ok(screen.getAllByText(hasTextContent("当前题目：1/2")).length >= 1);

  fireEvent.change(screen.getByPlaceholderText("输入你认为正确的表达"), {
    target: { value: "call it a day" },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查答案" }));

  await waitFor(() => {
    assert.ok(screen.getAllByText("100%").length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("当前题目：2/2")).length >= 1);
    assert.ok(screen.getByText("You should ____ tonight."));
    openHeaderMenu();
    assert.equal(screen.getByRole("button", { name: sceneViewLabels.practice.complete }).hasAttribute("disabled"), true);
  });
});

test("ScenePracticeView 会按题面挖空内容接受旧练习集里的局部答案", async () => {
  const clozeModule = practiceSet.modules?.[0];
  assert.ok(clozeModule);
  const firstExercise = clozeModule.exercises[0];
  assert.ok(firstExercise);
  const legacyPracticeSet: PracticeSet = {
    ...practiceSet,
    modules: [
      {
        ...clozeModule,
        exercises: [
          {
            ...firstExercise,
            answer: {
              text: "burn yourself out",
              acceptedAnswers: ["burn yourself out"],
            },
            cloze: {
              displayText: "Don't ___ yourself out.",
            },
          },
        ],
      },
    ],
    exercises: [
      {
        ...practiceSet.exercises[0]!,
        answer: {
          text: "burn yourself out",
          acceptedAnswers: ["burn yourself out"],
        },
        cloze: {
          displayText: "Don't ___ yourself out.",
        },
      },
    ],
  };

  render(
    <ScenePracticeView
      practiceSet={legacyPracticeSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  fireEvent.change(screen.getByPlaceholderText("输入你认为正确的表达"), {
    target: { value: "burn" },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查答案" }));

  await waitFor(() => {
    assert.ok(screen.getAllByText("100%").length >= 1);
  });
});

test("ScenePracticeView 会把英文题型提示统一显示为中文", () => {
  render(
    <ScenePracticeView
      practiceSet={{
        ...practiceSet,
        mode: "guided_recall",
        modeLabel: "guided recall",
        description: "continue with guided recall",
        completionRequirement: "finish guided recall",
        modules: [
          {
            ...practiceSet.modules![0]!,
            mode: "guided_recall",
            modeLabel: "guided recall",
            description: "continue with guided recall",
            completionRequirement: "finish guided recall",
            exercises: [
              {
                ...practiceSet.modules![1]!.exercises[0]!,
                metadata: {
                  practiceMode: "guided_recall",
                },
                prompt: "Complete the second half.",
              },
            ],
          },
        ],
      }}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getAllByText("半句复现").length >= 1);
  assert.ok(screen.getByText("Maybe you should ____"));
  assert.equal(screen.queryByText(/^guided recall$/i), null);
  assert.equal(screen.queryByText(/^complete the second half\.$/i), null);
});

test("ScenePracticeView 在来源为 variant 时会展示变体与原场景说明", () => {
  render(
    <ScenePracticeView
      practiceSet={{
        ...practiceSet,
        sourceType: "variant",
        sourceVariantId: "variant-1",
        sourceVariantTitle: "Coffee Chat Variant 1",
      }}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getByText(/Coffee Chat Variant 1/));
  assert.ok(screen.getByText(/Coffee Chat/));
});

test("ScenePracticeView 会在来源场景文案中展示系统生成提示", () => {
  render(
    <ScenePracticeView
      practiceSet={{
        ...practiceSet,
        generationSource: "system",
      }}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getByText(/来源场景 \| 系统生成：Coffee Chat/));
});

test("ScenePracticeView 在父层回调引用变化时不会重复启动同一题型的 practice run", () => {
  const runStarts: string[] = [];
  const { rerender } = render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onPracticeRunStart={(payload) => {
        runStarts.push(`${payload.practiceSetId}:${payload.mode}`);
      }}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  rerender(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onPracticeRunStart={(payload) => {
        runStarts.push(`${payload.practiceSetId}:${payload.mode}:rerender`);
      }}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.deepEqual(runStarts, ["practice-1:cloze"]);
});

test("ScenePracticeView 会显示练习题对应的 chunk 文本而不是 chunk id", () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{ "exercise-1": true }}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getAllByText("call it a day").length >= 1);
  assert.equal(screen.queryByText(/chunk-1/), null);
});

test("ScenePracticeView 在空态下会禁用练习菜单入口", () => {
  let deleteCount = 0;
  let regenerateCount = 0;
  let completeCount = 0;

  render(
    <ScenePracticeView
      practiceSet={null}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => {
        deleteCount += 1;
      }}
      onRegenerate={() => {
        regenerateCount += 1;
      }}
      onComplete={() => {
        completeCount += 1;
      }}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  const menuButton = screen.getByRole("button", { name: "打开练习菜单" });

  assert.equal(menuButton.hasAttribute("disabled"), true);
  assert.ok(screen.getByText(sceneViewLabels.practice.empty));

  fireEvent.click(menuButton);

  assert.equal(deleteCount, 0);
  assert.equal(regenerateCount, 0);
  assert.equal(completeCount, 0);
});

test("ScenePracticeView 在练习已完成时会禁用完成按钮", () => {
  render(
    <ScenePracticeView
      practiceSet={{ ...practiceSet, status: "completed" }}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  openHeaderMenu();
  assert.equal(screen.getByRole("button", { name: sceneViewLabels.practice.complete }).hasAttribute("disabled"), true);
});

test("ScenePracticeView 头部菜单会触发重新生成、删除和完成动作", async () => {
  let deleteCount = 0;
  let regenerateCount = 0;
  let completeCount = 0;

  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => {
        deleteCount += 1;
      }}
      onRegenerate={() => {
        regenerateCount += 1;
      }}
      onComplete={() => {
        completeCount += 1;
      }}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  openHeaderMenu();
  fireEvent.click(screen.getByRole("button", { name: sceneViewLabels.practice.regenerate }));
  assert.equal(regenerateCount, 1);

  fireEvent.click(screen.getByRole("button", { name: "关闭练习菜单" }));
  openHeaderMenu();
  fireEvent.click(screen.getByRole("button", { name: sceneViewLabels.practice.delete }));
  assert.equal(deleteCount, 1);

  await completeAllModules();

  openHeaderMenu();
  fireEvent.click(screen.getByRole("button", { name: sceneViewLabels.practice.complete }));
  assert.equal(completeCount, 1);
});

test("ScenePracticeView 重新生成中时会展示统一 loading 文案并禁用按钮", () => {
  let regenerateCount = 0;

  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      regenerating
      onBack={() => undefined}
      onDelete={() => undefined}
      onRegenerate={() => {
        regenerateCount += 1;
      }}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  openHeaderMenu();
  const loadingButton = screen.getByRole("button", { name: "正在生成中..." });
  assert.equal(loadingButton.hasAttribute("disabled"), true);
  assert.ok(screen.getByText(/正在生成中\./));

  fireEvent.click(loadingButton);
  assert.equal(regenerateCount, 0);
});

test("ScenePracticeView 在未全部答对前会禁用完成按钮", () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getAllByText("50%").length >= 1);
  openHeaderMenu();
  assert.equal(screen.getByRole("button", { name: sceneViewLabels.practice.complete }).hasAttribute("disabled"), true);
});

test("ScenePracticeView 全部答对后才解锁完成按钮", async () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  await completeAllModules();

  await waitFor(() => {
    assert.ok(screen.getAllByText("100%").length >= 1);
    openHeaderMenu();
    assert.equal(screen.getByRole("button", { name: sceneViewLabels.practice.complete }).hasAttribute("disabled"), false);
  });
});

test("ScenePracticeView 会统计整组和当前题的尝试次数", async () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getAllByText(hasTextContent("提交次数：0")).length >= 1);
  assert.ok(screen.getAllByText(hasTextContent("错误次数：0")).length >= 1);
  assert.ok(screen.getAllByText(hasTextContent("当前题已尝试：0 次")).length >= 1);
  assert.ok(screen.getAllByText(hasTextContent("当前题错误：0 次")).length >= 1);

  fireEvent.change(screen.getByPlaceholderText("输入你认为正确的表达"), {
    target: { value: "wrong answer" },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查答案" }));

  await waitFor(() => {
    assert.ok(screen.getByText("还不对，再试一次"));
    assert.ok(screen.getAllByText(hasTextContent("提交次数：1")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("错误次数：1")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("当前题已尝试：1 次")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("当前题错误：1 次")).length >= 1);
  });

  fireEvent.change(screen.getByPlaceholderText("输入你认为正确的表达"), {
    target: { value: "call it a day" },
  });
  fireEvent.click(screen.getByRole("button", { name: "检查答案" }));

  await waitFor(() => {
    assert.ok(screen.getAllByText(hasTextContent("提交次数：2")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("错误次数：1")).length >= 1);
    assert.ok(screen.getByText("You should ____ tonight."));
    assert.ok(screen.getAllByText(hasTextContent("当前题已尝试：0 次")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("当前题错误：0 次")).length >= 1);
  });
});

test("ScenePracticeView 会回填已保存的练习进度", () => {
  render(
    <ScenePracticeView
      practiceSet={{
        ...practiceSet,
        sessionState: {
          activeExerciseIndex: 1,
          activeMode: "cloze",
          answerMap: {
            "exercise-1": "call it a day",
            "exercise-2": "take it easy",
          },
          resultMap: {
            "exercise-1": "correct",
            "exercise-2": null,
          },
          attemptCountMap: {
            "exercise-1": 2,
            "exercise-2": 1,
          },
          incorrectCountMap: {
            "exercise-1": 1,
            "exercise-2": 0,
          },
          updatedAt: "2026-03-23T08:00:00.000Z",
        },
      }}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  assert.ok(screen.getAllByText(hasTextContent("当前题目：2/2")).length >= 1);
  assert.ok(screen.getByText("You should ____ tonight."));
  assert.ok(screen.getByDisplayValue("take it easy"));
  assert.ok(screen.getAllByText("100%").length >= 1);
  assert.ok(screen.getAllByText(hasTextContent("提交次数：3")).length >= 1);
  assert.ok(screen.getAllByText(hasTextContent("错误次数：1")).length >= 1);
  assert.ok(screen.getAllByText(hasTextContent("当前题已尝试：1 次")).length >= 1);
  assert.ok(screen.getAllByText(hasTextContent("当前题错误：0 次")).length >= 1);
});

test("ScenePracticeView 全部完成后会显示练习总结和错题表达", async () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  fillCurrentAnswer("wrong answer");
  fillCurrentAnswer("call it a day");
  fillCurrentAnswer("take it easy");
  fireEvent.click(screen.getByRole("button", { name: /半句复现/ }));
  fillCurrentAnswer("slow down a little tonight.");

  await waitFor(() => {
    assert.ok(screen.getByText("本轮练习总结"));
    assert.ok(screen.getAllByText(hasTextContent("答对题数")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("3/3")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("总提交次数")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("4")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("总错误次数")).length >= 1);
    assert.ok(screen.getAllByText(hasTextContent("1")).length >= 1);
    assert.ok(screen.getByText("本轮出错的表达"));
    assert.ok(screen.getByText("call it a day - 把空缺的表达补完整"));
    assert.ok(screen.getByText("建议先回看这些表达对应的场景句子，再做一轮练习。"));
  });
});

test("ScenePracticeView 无错题完成时会显示无错题总结", async () => {
  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  await completeAllModules();

  await waitFor(() => {
    assert.ok(screen.getByText("本轮练习总结"));
    assert.ok(screen.getByText("本轮没有错题，做得很好。"));
    assert.ok(screen.getByText("这一轮已经比较稳了，可以继续去做变体训练。"));
    assert.ok(screen.getByRole("button", { name: "进入变体训练" }));
  });
});

test("ScenePracticeView 总结区动作按钮会触发对应回调", async () => {
  let reviewCount = 0;
  let variantsCount = 0;
  let repeatCount = 0;

  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => {
        reviewCount += 1;
      }}
      onRepeatPractice={() => {
        repeatCount += 1;
      }}
      onOpenVariants={() => {
        variantsCount += 1;
      }}
      onToggleAnswer={() => undefined}
    />,
  );

  fillCurrentAnswer("wrong answer");
  fillCurrentAnswer("call it a day");
  fillCurrentAnswer("take it easy");
  fireEvent.click(screen.getByRole("button", { name: /半句复现/ }));
  fillCurrentAnswer("slow down a little tonight.");

  await waitFor(() => {
    assert.ok(screen.getByRole("button", { name: "回到场景复习" }));
  });

  fireEvent.click(screen.getByRole("button", { name: "回到场景复习" }));
  assert.equal(reviewCount, 1);

  cleanup();

  render(
    <ScenePracticeView
      practiceSet={practiceSet}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => {
        reviewCount += 1;
      }}
      onRepeatPractice={() => {
        repeatCount += 1;
      }}
      onOpenVariants={() => {
        variantsCount += 1;
      }}
      onToggleAnswer={() => undefined}
    />,
  );

  await completeAllModules();

  await waitFor(() => {
    assert.ok(screen.getByRole("button", { name: "进入变体训练" }));
  });

  fireEvent.click(screen.getByRole("button", { name: "进入变体训练" }));
  assert.equal(variantsCount, 1);

  cleanup();

  render(
    <ScenePracticeView
      practiceSet={{ ...practiceSet, status: "completed" }}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onReviewScene={() => {
        reviewCount += 1;
      }}
      onRepeatPractice={() => {
        repeatCount += 1;
      }}
      onOpenVariants={() => {
        variantsCount += 1;
      }}
      onToggleAnswer={() => undefined}
    />,
  );

  await waitFor(() => {
    assert.ok(screen.getByRole("button", { name: "再练一遍" }));
  });

  fireEvent.click(screen.getByRole("button", { name: "再练一遍" }));
  assert.equal(repeatCount, 1);
});

test("ScenePracticeView 只会在句子首次达到 complete 里程碑时回调一次", async () => {
  const sentenceCompletePayloads: string[] = [];

  render(
    <ScenePracticeView
      practiceSet={{
        ...practiceSet,
        modules: [
          {
            mode: "cloze",
            modeLabel: "填空练习",
            title: "开始练习",
            exercises: [
              {
                id: "exercise-1",
                type: "chunk_cloze",
                inputMode: "typing",
                sceneId: "scene-1",
                sentenceId: "sentence-1",
                chunkId: "chunk-1",
                prompt: "补全句子中的表达",
                answer: {
                  text: "call it a day",
                  acceptedAnswers: ["call it a day"],
                },
                cloze: {
                  displayText: "I should ____ now.",
                },
              },
            ],
          },
          {
            mode: "sentence_recall",
            modeLabel: "整句复现",
            title: "开始练习",
            exercises: [
              {
                id: "recall-1",
                type: "translation_prompt",
                inputMode: "typing",
                sceneId: "scene-1",
                sentenceId: "sentence-1",
                prompt: "看中文提示，完整复现这句",
                hint: "我现在该收工了。",
                answer: {
                  text: "I should call it a day now.",
                  acceptedAnswers: ["I should call it a day now."],
                },
              },
            ],
          },
        ],
      }}
      showAnswerMap={{}}
      appleButtonSmClassName="btn"
      appleDangerButtonSmClassName="danger"
      labels={sceneViewLabels.practice}
      onBack={() => undefined}
      onDelete={() => undefined}
      onComplete={() => undefined}
      onSentenceCompleted={({ sentenceId }) => {
        if (sentenceId) sentenceCompletePayloads.push(sentenceId);
      }}
      onReviewScene={() => undefined}
      onOpenVariants={() => undefined}
      onToggleAnswer={() => undefined}
    />,
  );

  fillCurrentAnswer("call it a day");

  await waitFor(() => {
    const sentenceRecallButton = screen.getByRole("button", { name: /整句复现/ });
    assert.equal(sentenceRecallButton.hasAttribute("disabled"), false);
  });

  fireEvent.click(screen.getByRole("button", { name: /整句复现/ }));
  fillCurrentAnswer("I should call it a day now.");

  await waitFor(() => {
    assert.deepEqual(sentenceCompletePayloads, ["sentence-1"]);
  });
});
