import { describe, expect, it, vi } from "vitest";
import {
  completionBatches,
  completionCounts,
  manualReasonSummary,
  completionSourceLabel,
  eligibleTargets,
  taskSelectionTargets,
  selectedItems,
  selectionState,
  sendCompletionBatches,
  targetKey,
  toggleTargets,
  validCompletionReason,
  type CompletionTask,
} from "./manual-completion";
const problem = (id: string, source: "tests" | "manual" | null = null) => ({
  id,
  title: `架空の問題${id}`,
  status: source ? ("passed" as const) : ("not-submitted" as const),
  source,
  manualReason: null,
  manualByName: null,
  manualAt: null,
});
const task = (
  id: string,
  problems: CompletionTask["problems"] = [
    problem("a"),
    problem("b"),
    problem("c", "tests"),
    problem("d", "manual"),
  ],
): CompletionTask => ({
  id,
  title: `架空の課題${id}`,
  status: "local-passed",
  reviewSource: null,
  manualReason: null,
  obsoleteManualProblems: 0,
  problems,
});
describe("単元・課題・問題の選択", () => {
  it("単元内の全課題を選び、課題と問題を外すと中間になる。済みは選べない", () => {
    const tasks = [task("one"), task("two")];
    const unit = eligibleTargets(tasks, "complete");
    expect(unit).toHaveLength(4);
    expect(unit.some((t) => ["c", "d"].includes(t.problemId ?? ""))).toBe(false);
    let selected = toggleTargets(unit, new Set());
    expect(selectionState(unit, selected)).toEqual({
      checked: true,
      mixed: false,
      disabled: false,
    });
    const first = eligibleTargets([tasks[0]], "complete");
    selected = toggleTargets([first[0]], selected);
    expect(selectionState(first, selected).mixed).toBe(true);
    expect(selectionState(unit, selected).mixed).toBe(true);
    selected = toggleTargets(first, selected);
    expect(selectionState(unit, selected).checked).toBe(true);
    expect(toggleTargets(unit, selected).size).toBe(0);
  });
  it("取り消しはmanualだけ。古い選択を送信に混ぜない", () => {
    const tasks = [task("one")];
    expect(eligibleTargets(tasks, "revoke")).toEqual([{ taskId: "one", problemId: "d" }]);
    const selected = new Set([
      "stale",
      ...["a", "c", "d"].map((problemId) => targetKey({ taskId: "one", problemId })),
    ]);
    expect(selectedItems(tasks, "complete", selected)).toEqual([
      { taskId: "one", problemIds: ["a"] },
    ]);
    expect(selectedItems(tasks, "revoke", selected)).toEqual([
      { taskId: "one", problemIds: ["d"] },
    ]);
  });
  it("問題のない課題は課題単位。空の選択対象は無効", () => {
    const plain = task("plain", []);
    expect(selectedItems([plain], "complete", new Set([targetKey({ taskId: plain.id })]))).toEqual([
      { taskId: "plain" },
    ]);
    expect(
      eligibleTargets([{ ...plain, status: "passed", reviewSource: "tests" }], "complete"),
    ).toEqual([]);
    expect(
      eligibleTargets([{ ...plain, status: "passed", reviewSource: "manual" }], "revoke"),
    ).toEqual([{ taskId: "plain" }]);
    expect(selectionState([], new Set())).toEqual({ checked: false, mixed: false, disabled: true });
  });
});
describe("分割送信", () => {
  const items = Array.from({ length: 7 }, (_, i) => ({ taskId: `task${i}` }));
  it("課題3つずつを順に送る", async () => {
    expect(completionBatches(items).map((b) => b.length)).toEqual([3, 3, 1]);
    const order: string[] = [];
    const progress = vi.fn();
    const result = await sendCompletionBatches(
      items,
      async (batch) => {
        order.push(batch[0].taskId);
        return { changed: batch.length };
      },
      progress,
    );
    expect(order).toEqual(["task0", "task3", "task6"]);
    expect(result).toMatchObject({ completed: 3, total: 3, changed: 7, error: null });
    expect(progress.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });
  it("失敗した回で止め、成功済みの回数と理由を返す", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ changed: 3 })
      .mockRejectedValueOnce(new Error("架空の通信エラー"));
    expect(await sendCompletionBatches(items, send, vi.fn())).toMatchObject({
      completed: 1,
      total: 3,
      changed: 3,
      error: "架空の通信エラー",
    });
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("409の部分成功も数え、blockedを残して止まる", async () => {
    const blocked = [{ taskId: "task3", problemId: "q", reason: "本人の提出で合格済み" }];
    const send = vi
      .fn()
      .mockResolvedValueOnce({ changed: 3 })
      .mockResolvedValueOnce({ changed: 2, blocked });
    expect(await sendCompletionBatches(items, send, vi.fn())).toMatchObject({
      completed: 1,
      changed: 5,
      blocked,
    });
    expect(send).toHaveBeenCalledTimes(2);
  });
});
it("理由と出所の言葉", () => {
  expect(validCompletionReason(" \n ")).toBe(false);
  expect(validCompletionReason("a".repeat(1001))).toBe(false);
  expect(validCompletionReason("a".repeat(1000))).toBe(true);
  expect(completionSourceLabel("manual")).toBe("手で済み");
});

describe("閉じた単元・課題の済みの集計", () => {
  it("課題の問題を集計し、複数課題のある単元でも合算する", () => {
    expect(completionCounts([task("one")])).toEqual({
      total: 4,
      passed: 2,
      manual: 1,
      complete: false,
    });
    expect(
      completionCounts([task("one"), task("two", [problem("a", "manual"), problem("b", "tests")])]),
    ).toEqual({ total: 6, passed: 4, manual: 2, complete: false });
  });
  it("問題のない課題は1つと数え、テスト・AI・人・手で済みを合格に数える", () => {
    const plain = task("plain", []);
    const passed = (["tests", "ai", "human", "manual"] as const).map((reviewSource) => ({
      ...plain,
      id: reviewSource,
      reviewSource,
    }));
    expect(completionCounts(passed)).toEqual({ total: 4, passed: 4, manual: 1, complete: true });
    expect(
      completionCounts([...passed, plain, task("problems", [problem("q", "manual")])]),
    ).toEqual({ total: 6, passed: 5, manual: 2, complete: false });
    for (const status of ["passed", "ai-passed"]) {
      expect(completionCounts([{ ...plain, status }])).toEqual({
        total: 1,
        passed: 1,
        manual: 0,
        complete: true,
      });
    }
  });
  it("空の単元をすべて済みにせず、未完了の問題を手で済みに数えない", () => {
    expect(completionCounts([])).toEqual({ total: 0, passed: 0, manual: 0, complete: false });
    expect(
      completionCounts([task("one", [{ ...problem("a", "manual"), status: "not-submitted" }])]),
    ).toEqual({ total: 1, passed: 0, manual: 0, complete: false });
  });
});
describe("課題にまとめる理由", () => {
  it("手で済みの理由が同じなら1回分にまとめ、テスト済みと未完了は混ぜない", () => {
    const row = task("same", [
      { ...problem("a", "manual"), manualReason: "架空の環境から移行" },
      { ...problem("b", "manual"), manualReason: "架空の環境から移行" },
      problem("c", "tests"),
      problem("d"),
    ]);
    expect(
      manualReasonSummary({ ...row, reviewSource: "manual", manualReason: "最後の提出の理由" }),
    ).toEqual({ mixed: false, reason: "架空の環境から移行" });
  });
  it("異なる理由があると混在として扱い、課題の理由に置き換えない", () => {
    expect(
      manualReasonSummary(
        task("mixed", [
          { ...problem("a", "manual"), manualReason: "架空の環境から移行" },
          { ...problem("b", "manual"), manualReason: "別の機会に確認済み" },
        ]),
      ),
    ).toEqual({ mixed: true, reason: null });
  });
  it("手で済みがない課題と問題のない課題も扱う", () => {
    expect(manualReasonSummary(task("none", [problem("a", "tests")]))).toEqual({
      mixed: false,
      reason: null,
    });
    expect(
      manualReasonSummary({
        ...task("plain", []),
        reviewSource: "manual",
        manualReason: "架空の環境から移行",
      }),
    ).toEqual({ mixed: false, reason: "架空の環境から移行" });
    expect(manualReasonSummary(task("plain", []))).toEqual({ mixed: false, reason: null });
  });
  it("理由の記録がない問題も、理由の違いとして扱う", () => {
    expect(
      manualReasonSummary(
        task("missing", [
          problem("a", "manual"),
          { ...problem("b", "manual"), manualReason: "確認済み" },
        ]),
      ),
    ).toEqual({ mixed: true, reason: null });
  });
});

describe("課題単位の取り消し", () => {
  it("課題の全部を選ぶとproblemIdsを省き、一部なら問題を指定する", () => {
    const row = {
      ...task("one", [problem("a", "manual"), problem("b", "manual")]),
      reviewSource: "manual" as const,
    };
    const all = toggleTargets(taskSelectionTargets([row], "revoke"), new Set());
    expect(selectedItems([row], "revoke", all)).toEqual([{ taskId: "one" }]);
    const partial = new Set([targetKey({ taskId: "one", problemId: "a" })]);
    expect(selectedItems([row], "revoke", partial)).toEqual([{ taskId: "one", problemIds: ["a"] }]);
    expect(selectedItems([row], "complete", partial)).toEqual([]);
  });
  it("現行の全問が未提出でも、manual合格の課題は選べる", () => {
    const row = {
      ...task("changed", [problem("q11"), problem("q12")]),
      reviewSource: "manual" as const,
    };
    const targets = eligibleTargets([row], "revoke");
    expect(targets).toEqual([{ taskId: "changed" }]);
    expect(selectedItems([row], "revoke", toggleTargets(targets, new Set()))).toEqual([
      { taskId: "changed" },
    ]);
  });
  it("現行版に問題が無くてもmanual合格を選べる", () => {
    const row = { ...task("plain", []), reviewSource: "manual" as const };
    expect(eligibleTargets([row], "revoke")).toEqual([{ taskId: "plain" }]);
    expect(selectedItems([row], "revoke", new Set([targetKey({ taskId: row.id })]))).toEqual([
      { taskId: row.id },
    ]);
  });
});

it("課題のチェックはテスト済みや未提出が混じっていても課題単位。一部を外すと問題単位に戻る", () => {
  const row = task("mixed", [
    problem("a", "manual"),
    problem("b", "manual"),
    problem("c", "tests"),
    problem("d"),
  ]);
  const all = toggleTargets(taskSelectionTargets([row], "revoke"), new Set());
  expect(selectedItems([row], "revoke", all)).toEqual([{ taskId: row.id }]);
  const partial = toggleTargets([{ taskId: row.id, problemId: "a" }], all);
  expect(selectedItems([row], "revoke", partial)).toEqual([{ taskId: row.id, problemIds: ["b"] }]);
});
it("本人の合格でも、旧問題のmanualが残れば課題単位を選べる", () => {
  const row = {
    ...task("old", [problem("q11", "tests")]),
    reviewSource: "tests" as const,
    obsoleteManualProblems: 2,
  };
  const targets = eligibleTargets([row], "revoke");
  expect(targets).toEqual([{ taskId: row.id }]);
  expect(selectedItems([row], "revoke", toggleTargets(targets, new Set()))).toEqual([
    { taskId: row.id },
  ]);
});
