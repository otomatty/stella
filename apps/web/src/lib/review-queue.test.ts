import type { Submission } from "@stella/shared/review/types";
import { describe, expect, it } from "vitest";
import {
  formatWaiting,
  isAiChecking,
  isAiPassed,
  needsHumanReview,
  passByLabel,
  queueGroupOf,
  sortQueue,
  testsPassedRows,
} from "./review-queue";

function submission(over: Partial<Submission> & { id: string }): Submission {
  return {
    studentName: "受講者",
    studentInitials: "受",
    avatarTone: "c1",
    stageTitle: "ステージ",
    assignmentTitle: "課題",
    codeLines: [],
    submittedAt: 0,
    status: "pending",
    priority: "normal",
    attempt: 1,
    aiReady: false,
    aiSuggestions: [],
    rubric: [],
    reviewNotes: "",
    verdict: null,
    ...over,
  };
}

describe("人が見る提出", () => {
  it("判定前で、AI が確認中・新しい提出に置き換えたもの以外を数える", () => {
    expect(needsHumanReview(submission({ id: "a", aiReviewStatus: "escalated" }))).toBe(true);
    expect(needsHumanReview(submission({ id: "b" }))).toBe(true);
    expect(needsHumanReview(submission({ id: "c", aiReviewStatus: "queued" }))).toBe(false);
    expect(needsHumanReview(submission({ id: "d", aiReviewStatus: "superseded" }))).toBe(false);
    expect(needsHumanReview(submission({ id: "e", status: "passed", verdict: "pass" }))).toBe(
      false,
    );
    expect(isAiChecking(submission({ id: "f", aiReviewStatus: "queued" }))).toBe(true);
  });
  it("AI が合格にした提出は、覆したあとは事後確認の対象から外す", () => {
    const passed = submission({ id: "g", taskId: "t", verdict: "pass", reviewSource: "ai" });
    expect(isAiPassed(passed)).toBe(true);
    expect(isAiPassed({ ...passed, verdict: "resubmit", reviewSource: "human" })).toBe(false);
    expect(isAiPassed({ ...passed, taskId: undefined })).toBe(false);
  });
  it("テストで確定した提出は AI の合格に入れない", () => {
    const byTests = submission({
      id: "tests",
      taskId: "t",
      verdict: "pass",
      reviewSource: "tests",
    });
    expect(isAiPassed(byTests)).toBe(false);
    expect(passByLabel(byTests)).toBe("テストで確認");
    expect(passByLabel(submission({ id: "ai", verdict: "pass", reviewSource: "ai" }))).toBe(
      "AI で合格",
    );
    expect(passByLabel(submission({ id: "human", verdict: "pass", reviewSource: "human" }))).toBe(
      null,
    );
  });
});

describe("キューの分け方と並べ方", () => {
  const rows = [
    submission({
      id: "rule",
      taskId: "t",
      submittedAt: 3,
      routeReasons: ["rubric-unmet"],
    }),
    submission({ id: "legacy", submittedAt: 1 }),
    submission({ id: "consult", taskId: "t", submittedAt: 2, routeReasons: ["consult"] }),
  ];
  it("人に回した理由で分類し、旧形式の提出は別にする", () => {
    expect(rows.map(queueGroupOf)).toEqual(["rule", "legacy", "consult"]);
  });
  it("待ち時間・理由で並べる", () => {
    expect(sortQueue(rows, "wait").map((s) => s.id)).toEqual(["legacy", "consult", "rule"]);
    expect(sortQueue(rows, "reason").map((s) => s.id)).toEqual(["consult", "rule", "legacy"]);
  });
  it("待ち時間を時間・日で出す", () => {
    expect(formatWaiting(0, 30 * 60_000)).toBe("1時間未満");
    expect(formatWaiting(0, 5 * 3_600_000)).toBe("5時間");
    expect(formatWaiting(0, 50 * 3_600_000)).toBe("2日");
  });
});

describe("テストで合格した提出", () => {
  const rows = [
    submission({
      id: "old",
      studentId: "a",
      reviewSource: "tests",
      verdict: "pass",
      status: "passed",
      submittedAt: 1,
    }),
    submission({
      id: "ai",
      studentId: "a",
      reviewSource: "ai",
      verdict: "pass",
      status: "passed",
      submittedAt: 9,
    }),
    submission({
      id: "new",
      studentId: "b",
      reviewSource: "tests",
      verdict: "pass",
      status: "passed",
      submittedAt: 3,
    }),
    submission({
      id: "mid",
      studentId: "a",
      reviewSource: "tests",
      verdict: "pass",
      status: "passed",
      submittedAt: 2,
    }),
    submission({ id: "human", studentId: "a", reviewSource: "human", submittedAt: 4 }),
    submission({ id: "none", studentId: "b", submittedAt: 5 }),
  ];
  it("reviewSource が tests の行だけを、新しい順に返す", () => {
    expect(testsPassedRows(rows).map((s) => s.id)).toEqual(["new", "mid", "old"]);
    expect(rows.map((s) => s.id)).toEqual(["old", "ai", "new", "mid", "human", "none"]);
  });
});
