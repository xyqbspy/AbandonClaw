import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ExampleSentenceCards } from "@/components/shared/example-sentence-cards";

afterEach(() => {
  cleanup();
});

test("ExampleSentenceCards 会渲染例句并触发朗读", () => {
  const spoken: string[] = [];

  render(
    <ExampleSentenceCards
      examples={[
        {
          en: "Don't burn yourself out.",
          zh: "别把自己耗尽。",
        },
      ]}
      expression="burn yourself out"
      speakLabel="朗读"
      onSpeak={(text) => spoken.push(text)}
      renderSentenceWithExpressionHighlight={(sentence) => sentence}
    />,
  );

  assert.ok(screen.getByText("Don't burn yourself out."));
  assert.ok(screen.getByText("别把自己耗尽。"));

  fireEvent.click(screen.getByRole("button", { name: "朗读" }));

  assert.deepEqual(spoken, ["Don't burn yourself out."]);
});
