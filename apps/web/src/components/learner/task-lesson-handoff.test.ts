import type { ProblemStepState } from "@stella/shared/tasks/problem-steps";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useIsHandheld } from "@/hooks/useIsHandheld";
import { ProblemLessonHandoff } from "./TaskLessonHandoff";

vi.mock("@/hooks/useIsHandheld", () => ({ useIsHandheld: vi.fn(() => false) }));

const render = (state: ProblemStepState) =>
  renderToStaticMarkup(
    createElement(ProblemLessonHandoff, {
      taskId: "task",
      problem: {
        id: "q1",
        title: "税込価格を返す",
        label: "問1",
        stepLessonId: "problem",
        afterLessonId: "video",
        afterTitle: "関数の返り値",
        state,
        refs: [],
      },
    }),
  );

describe("問題のレッスンの本文下", () => {
  it("解ける問題に VS Code ボタンを出す", () => {
    const markup = render("open");
    expect(markup).toContain("VS Code で開く");
    expect(markup).not.toContain("提出済み");
  });

  it("提出済みの問題も VS Code で見直せる", () => {
    const markup = render("submitted");
    expect(markup).toContain("提出済み");
    expect(markup).toContain("VS Code で開く");
  });

  it.each([
    ["locked-video", "「関数の返り値」の動画を見ると解けます"],
    ["locked-previous", "前の問題を提出すると解けます"],
  ] as const)("ロック中は理由を出す (%s)", (state, reason) => {
    const markup = render(state);
    expect(markup).toContain(reason);
    expect(markup).not.toContain("<button");
  });

  it("スマートフォン・タブレットにはページを送るボタンを出す", () => {
    vi.mocked(useIsHandheld).mockReturnValueOnce(true);
    vi.stubGlobal("navigator", {});
    try {
      const markup = render("open");
      expect(markup).toContain("リンクをコピー");
      expect(markup).not.toContain('data-testid="open-in-vscode"');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
