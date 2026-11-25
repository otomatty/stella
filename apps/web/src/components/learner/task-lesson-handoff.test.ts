import type { ProblemStepState, TaskProblemStepSummary } from "@stella/shared/tasks/problem-steps";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { useIsHandheld } from "@/hooks/useIsHandheld";
import { ProblemLessonHandoff } from "./TaskLessonHandoff";

vi.mock("@/hooks/useIsHandheld", () => ({ useIsHandheld: vi.fn(() => false) }));

const problemStep = (state: ProblemStepState): TaskProblemStepSummary => ({
  id: "q1",
  title: "税込価格を返す",
  label: "問1",
  stepLessonId: "problem",
  afterLessonId: "video",
  afterTitle: "関数の返り値",
  state,
  refs: [],
});

const renderProblem = (
  problem: TaskProblemStepSummary,
  problems?: readonly TaskProblemStepSummary[],
) =>
  renderToStaticMarkup(
    createElement(ProblemLessonHandoff, {
      taskId: "task",
      problem,
      problems,
    }),
  );

const render = (state: ProblemStepState, problems?: readonly TaskProblemStepSummary[]) =>
  renderProblem(problemStep(state), problems);

const anotherProblem = (state: ProblemStepState): TaskProblemStepSummary => ({
  ...problemStep(state),
  id: "q2",
  title: "割り勘",
  label: "問2",
  stepLessonId: "another-problem",
});

describe("問題のレッスンの本文下", () => {
  it("解ける問題に VS Code ボタンを出す", () => {
    const markup = render("open");
    expect(markup).toContain("VS Code で解いて提出します");
    expect(markup).toContain("VS Code で開く");
    expect(markup).not.toContain("提出済み");
  });

  it("提出済みの問題も VS Code で見直せる", () => {
    const markup = render("submitted");
    expect(markup).toContain("提出しました");
    expect(markup).toContain("VS Code で見直す");
    expect(markup).not.toContain("提出済み");
  });

  it("引き継いだ問題は解き直しを案内し、課題の進み具合にも数える", () => {
    const inherited = { ...problemStep("submitted"), manual: true };
    const markup = renderProblem(inherited, [inherited, anotherProblem("open")]);
    expect(markup).toContain("以前の学習から引き継ぎました");
    expect(markup).toContain("管理者が済みにした問題です。VS Code で開いて解き直せます");
    expect(markup).toContain("VS Code で開く");
    expect(markup).toContain("あと 1 問で課題を提出し終えます");
    expect(markup).not.toContain("手元のテストが通った");
    expect(markup).not.toContain("提出しました");
    expect(markup).not.toContain("VS Code で見直す");
  });

  it.each([
    ["locked-video", "「関数の返り値」の動画を見ると解けます"],
    ["locked-previous", "前の問題を提出すると解けます"],
  ] as const)("ロック中は理由を出す (%s)", (state, reason) => {
    const markup = render(state, [problemStep(state), anotherProblem("locked-previous")]);
    expect(markup).toContain(reason);
    expect(markup).not.toContain("<button");
    expect(markup).not.toContain("この課題の問題");
    expect(markup).not.toContain("問提出済み");
  });

  it("解ける問題には教材の順で位置と提出済みの数を出す", () => {
    const markup = render("open", [anotherProblem("submitted"), problemStep("open")]);
    expect(markup).toContain("この課題の問題 2 / 2");
    expect(markup).toContain("1 問提出済み");
  });

  it.each([
    ["open", "あと 1 問で課題を提出し終えます"],
    ["submitted", "全問を提出しました"],
  ] as const)("提出した問題には残りの進み具合を出す (%s)", (state, progress) => {
    const markup = render("submitted", [problemStep("submitted"), anotherProblem(state)]);
    expect(markup).toContain("この課題の問題 1 / 2");
    expect(markup).toContain(progress);
    expect(markup).not.toContain("提出済み");
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
