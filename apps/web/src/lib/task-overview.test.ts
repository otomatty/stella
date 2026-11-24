import type { TaskProblemItem, TaskSummary } from "@stella/shared/tasks/catalog";
import type { TaskRefSummary } from "@stella/shared/tasks/problem-steps";
import { describe, expect, it } from "vitest";
import {
  type ProblemTask,
  problemCellState,
  problemStatementBody,
  splitProblems,
  submittedProblemCount,
  taskNextAction,
  taskOverviewStatusLabel,
  taskRefText,
} from "./task-overview";

const problem = (
  id: string,
  state: TaskProblemItem["state"],
  fields: Partial<TaskProblemItem> = {},
): TaskProblemItem => ({
  id,
  title: "税込価格を返す",
  label: `問${id}`,
  source: `src/${id}.ts`,
  state,
  refs: [],
  ...fields,
});

const task = (id: string, status: TaskSummary["status"] = "not-started"): TaskSummary => ({
  id,
  lessonId: `lesson-${id}`,
  sectionId: "section",
  kind: "basic",
  title: id,
  pattern: "pattern",
  skills: { uses: [], assesses: [] },
  estimatedMinutes: 30,
  status,
});

const overview = (...problems: TaskProblemItem[]): ProblemTask => ({
  ...task("current"),
  problem_items: problems,
});

describe("問題文", () => {
  const title = "問1 税込価格を返す";
  const example = "例: addTax(1000) → 1100";

  it("題に続く補足だけを本文の前に出す", () => {
    const intro = "（税率10%。税額の1円未満は切り捨て）";
    expect(problemStatementBody(`# ${title}${intro}\n\n${example}`, title)).toEqual({
      intro,
      body: example,
    });
  });

  it("題と同じ見出しを省き、本文の改行とインデントを保つ", () => {
    const body = "    addTax(1000)\r\n    addTax(2000)";
    expect(problemStatementBody(`# ${title}\r\n\r\n${body}`, title)).toEqual({
      intro: "",
      body,
    });
    expect(problemStatementBody(`# ${title}`, title)).toEqual({ intro: "", body: "" });
  });

  it("題と異なる見出しは全文を本文の前に出す", () => {
    expect(problemStatementBody(`# 税率は10%\n\n${example}`, title)).toEqual({
      intro: "税率は10%",
      body: example,
    });
  });

  it("先頭にレベル1の見出しがなければ本文をそのまま返す", () => {
    const body = `## 例\n\n${example}`;
    expect(problemStatementBody(body, title)).toEqual({ intro: "", body });
  });
});

describe("問題一覧の課題の状態", () => {
  it("未着手でも提出済みの問題があれば取り組み中と表示する", () => {
    expect(taskOverviewStatusLabel(overview(problem("1", "open")))).toBe("未着手");
    expect(taskOverviewStatusLabel(overview(problem("1", "open"), problem("2", "submitted")))).toBe(
      "取り組み中",
    );
  });

  it.each([
    ["passed", "合格"],
    ["ai-passed", "AI で合格"],
    ["local-passed", "未提出"],
    ["submitted", "AI が確認中"],
    ["instructor-pending", "管理者の確認待ち"],
    ["resubmit", "再提出"],
  ] as const)("%s のラベルは提出件数で変えない", (status, label) => {
    expect(taskOverviewStatusLabel({ ...overview(problem("1", "open")), status })).toBe(label);
    expect(taskOverviewStatusLabel({ ...overview(problem("1", "submitted")), status })).toBe(label);
  });
});

describe("いまやること", () => {
  it("動画待ちや前問待ちが先に並んでいても、最初に解ける問題を出す", () => {
    const open = problem("3", "open");
    const current = overview(
      problem("1", "locked-video"),
      problem("2", "locked-previous"),
      open,
      problem("4", "open"),
    );
    expect(taskNextAction(current, [current])).toEqual({ kind: "problem", problem: open });
  });

  it("最初の未提出問題が動画待ちなら、その動画を案内する", () => {
    const locked = problem("2", "locked-video", {
      afterLessonId: "video",
      afterTitle: "掛け算の書き方",
    });
    const current = overview(problem("1", "submitted"), locked, problem("3", "locked-previous"));
    expect(taskNextAction(current, [current])).toEqual({
      kind: "video",
      problem: locked,
      lessonId: "video",
      title: "掛け算の書き方",
    });
  });

  it("先頭の未提出問題が前問待ちなら、後ろの動画待ちを案内しない", () => {
    const current = overview(
      problem("1", "locked-previous"),
      problem("2", "locked-video", { afterLessonId: "video", afterTitle: "掛け算" }),
    );
    expect(taskNextAction(current, [current])).toEqual({ kind: "previous" });
  });

  it("全問提出後は、順番が後ろで合格していない最初の課題を出す", () => {
    const current = overview(problem("1", "submitted"));
    const following = [
      task("earlier"),
      current,
      task("passed", "passed"),
      task("ai-passed", "ai-passed"),
      task("resubmit", "resubmit"),
      task("later"),
    ];
    expect(taskNextAction(current, following)).toEqual({
      kind: "completed",
      nextLessonId: "lesson-resubmit",
    });
    expect(taskNextAction(current, following.slice(0, 4))).toEqual({
      kind: "completed",
      nextLessonId: null,
    });
  });

  it("問題や解放先の動画が未準備なら、存在しない遷移先を案内しない", () => {
    expect(taskNextAction(overview(), [])).toEqual({ kind: "unavailable" });
    expect(taskNextAction(overview(problem("1", "locked-video")), [])).toEqual({
      kind: "unavailable",
    });
  });
});

describe("問題の進み具合", () => {
  it("「応用」のラベルでマスを分け、それぞれの並び順を保つ", () => {
    const first = problem("1", "submitted");
    const applied = problem("2", "open", { label: "応用" });
    const last = problem("3", "locked-video");
    expect(splitProblems([first, applied, last])).toEqual({
      drills: [first, last],
      applied: [applied],
    });
    expect(splitProblems([first, last])).toEqual({ drills: [first, last], applied: [] });
    expect(submittedProblemCount([first, applied, last])).toBe(1);
  });

  it.each([
    ["submitted", "1", "submitted"],
    ["open", "1", "current"],
    ["open", "2", "remaining"],
    ["locked-video", "1", "locked"],
    ["locked-previous", undefined, "locked"],
  ] as const)("問題の状態 %s と現在位置 %s をマスに反映する", (state, currentId, expected) => {
    expect(problemCellState(problem("1", state), currentId)).toBe(expected);
  });
});

describe("手がかり", () => {
  const video: TaskRefSummary = {
    lessonId: "video",
    stageId: "stage",
    title: "掛け算",
    lessonType: "slides",
    completed: true,
    accessible: true,
    auto: true,
  };

  it("直前の動画の種別と視聴済みを示す", () => {
    expect(taskRefText(video)).toEqual({
      video: true,
      metadata: "動画 ・ この問題の直前の動画",
      completion: "視聴済み",
      accessNote: undefined,
    });
  });

  it("別ステージの未受講のまとめに受講案内を示す", () => {
    expect(
      taskRefText({
        ...video,
        lessonType: "text",
        stageTitle: "TypeScript の基礎",
        completed: false,
        accessible: false,
        auto: undefined,
      }),
    ).toEqual({
      video: false,
      metadata: "まとめ ・ TypeScript の基礎",
      completion: undefined,
      accessNote: "「TypeScript の基礎」を受講すると見られます",
    });
    expect(taskRefText({ ...video, lessonType: "text", auto: undefined }).completion).toBe("読了");
  });
});
