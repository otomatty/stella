import { describe, expect, it } from "vitest";
import { ROUTE_REASONS } from "./ai-review.js";
import {
  type AiPassedRow,
  compareAiPassed,
  compareQueueItems,
  exceedsAlert,
  type QueueSortable,
  ratio,
  REVIEW_METRIC_ALERTS,
  REVIEW_QUEUE_GROUPS,
  reviewQueueGroup,
  templateApplies,
} from "./review-desk.js";

describe("人に回した提出のキューの分け方", () => {
  it("理由を 1 つの分類に入れ、重なれば先の分類 (相談 → 照合 → 判定不能 → 規則 → 確信度) を使う", () => {
    const group = (...routeReasons: (typeof ROUTE_REASONS)[number][]) =>
      reviewQueueGroup({ taskId: "c/u/t", routeReasons });
    expect(group("consult", "machine-check")).toBe("consult");
    expect(group("machine-check", "low-confidence")).toBe("mismatch");
    expect(group("ai-unavailable")).toBe("ai-failed");
    expect(group("no-rubric")).toBe("ai-failed");
    expect(group("rubric-unmet", "low-confidence")).toBe("rule");
    expect(group("unallowed-support")).toBe("rule");
    expect(group("low-confidence", "solution-leak")).toBe("confidence");
    expect(group("rubric-undetermined")).toBe("confidence");
    // 理由の記録が無いのに人に回っている提出は、AI の判定が無い側に置く。
    expect(group()).toBe("ai-failed");
  });
  it("すべての理由がどれかの分類に入り、旧形式の提出は別に置く", () => {
    for (const reason of ROUTE_REASONS)
      expect(REVIEW_QUEUE_GROUPS).toContain(
        reviewQueueGroup({ taskId: "c/u/t", routeReasons: [reason] }),
      );
    expect(reviewQueueGroup({ taskId: null, routeReasons: ["consult"] })).toBe("legacy");
  });
});

describe("キューの並べ方", () => {
  const item = (over: Partial<QueueSortable> & { id: string }) => ({
    submittedAt: 0,
    group: "confidence" as const,
    assigneeName: null,
    ...over,
  });
  const a = item({ id: "a", submittedAt: 300, group: "consult", assigneeName: "佐藤" });
  const b = item({ id: "b", submittedAt: 100, group: "rule", assigneeName: null });
  const c = item({ id: "c", submittedAt: 200, group: "consult", assigneeName: "伊藤" });
  const order = (sort: Parameters<typeof compareQueueItems>[0]) =>
    [a, b, c].sort(compareQueueItems(sort)).map((x) => x.id);
  it("待ち時間は長い (提出が古い) 順", () => expect(order("wait")).toEqual(["b", "c", "a"]));
  it("理由は分類の順、同じ分類の中は待ち時間の長い順", () =>
    expect(order("reason")).toEqual(["c", "a", "b"]));
  it("担当者は名前順で、担当なしは最後", () => expect(order("assignee")).toEqual(["c", "a", "b"]));
});

describe("AI が合格にした提出の一覧の並び", () => {
  const row = (id: string, confidence: "high" | "medium", aiPassedAt: string) =>
    ({ submissionId: id, confidence, aiPassedAt }) as AiPassedRow;
  it("確信度が中を先に、その中は新しい順", () => {
    const rows = [
      row("high-new", "high", "2026-10-05T00:00:00Z"),
      row("medium-old", "medium", "2026-10-01T00:00:00Z"),
      row("medium-new", "medium", "2026-10-04T00:00:00Z"),
    ];
    expect(rows.sort(compareAiPassed).map((r) => r.submissionId)).toEqual([
      "medium-new",
      "medium-old",
      "high-new",
    ]);
  });
});

describe("見直しの数字の境目", () => {
  it("境目を超えたときだけ印を付け、分母が 0 なら付けない", () => {
    expect(exceedsAlert(ratio(1, 10), REVIEW_METRIC_ALERTS.practiceMediumOverturned)).toBe(false);
    expect(exceedsAlert(ratio(2, 10), REVIEW_METRIC_ALERTS.practiceMediumOverturned)).toBe(true);
    expect(exceedsAlert(ratio(8, 10), REVIEW_METRIC_ALERTS.escalatedPassedAsIs)).toBe(false);
    expect(exceedsAlert(ratio(4, 10), REVIEW_METRIC_ALERTS.taskEscalated)).toBe(true);
    expect(exceedsAlert(ratio(0, 0), REVIEW_METRIC_ALERTS.taskEscalated)).toBe(false);
  });
});

describe("定型コメントの当てはめ", () => {
  const task = { stageId: "stage", pattern: "html-page" };
  it("講座とパターンが合うか、指定が無いものだけを出す", () => {
    expect(templateApplies({ stageId: null, pattern: null }, task)).toBe(true);
    expect(templateApplies({ stageId: "stage", pattern: null }, task)).toBe(true);
    expect(templateApplies({ stageId: "stage", pattern: "html-page" }, task)).toBe(true);
    expect(templateApplies({ stageId: "stage", pattern: "other" }, task)).toBe(false);
    expect(templateApplies({ stageId: "other", pattern: null }, task)).toBe(false);
  });
});
