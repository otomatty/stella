import { describe, expect, it } from "vitest";
import {
  type EvalSourceRow,
  formatAgreementTable,
  summarizeAgreement,
  toExample,
} from "./ai-review-eval.js";

function row(over: Partial<EvalSourceRow>): EvalSourceRow {
  return {
    ai_review_id: crypto.randomUUID(),
    submission_id: crypto.randomUUID(),
    task_id: "c/u/t",
    task_kind: "basic",
    task_content_hash: "a".repeat(64),
    outcome: "confirmed",
    route_reasons: "[]",
    confidence: "high",
    proposed_verdict: "pass",
    failure: null,
    model: "model-a",
    prompt_version: "p1",
    threshold_version: "t1",
    human_verdict: "pass",
    ...over,
  };
}

describe("人の判定との一致率", () => {
  it("モデル・指示・しきい値の版ごとにまとめ、見直しの目安を出す", () => {
    const examples = [
      row({}),
      row({ confidence: "medium", human_verdict: "resubmit" }),
      row({
        outcome: "escalated",
        route_reasons: '["rubric-unmet"]',
        proposed_verdict: "resubmit",
        human_verdict: "resubmit",
      }),
      row({
        outcome: "escalated",
        proposed_verdict: null,
        failure: "timeout",
        route_reasons: "x",
        human_verdict: "resubmit",
      }),
      row({
        model: "model-b",
        outcome: "escalated",
        proposed_verdict: "pass",
        human_verdict: "pass",
      }),
    ].map(toExample);
    expect(examples[3]?.routeReasons).toEqual([]);
    const [b, a] = summarizeAgreement(examples);
    expect(a).toMatchObject({
      model: "model-a",
      examples: 4,
      judged: 3,
      agreement: 2 / 3,
      confirmedOverturned: 1 / 2,
      practiceMediumOverturned: 1,
      escalatedHumanPassed: 0,
      failures: 1,
    });
    expect(b).toMatchObject({ model: "model-b", agreement: 1, escalatedHumanPassed: 1 });
    const table = formatAgreementTable([a, b].filter((x) => x !== undefined));
    expect(table).toContain("| model-a | p1 | t1 | 4 | 3 | 66.7% | 50.0% | 100.0% | 0.0% | 1 |");
  });
  it("統合・確認の「中」は練習の目安に数えない", () => {
    const [summary] = summarizeAgreement(
      [row({ task_kind: "assessment-a", confidence: "medium", human_verdict: "fail" })].map(
        toExample,
      ),
    );
    expect(summary?.practiceMediumOverturned).toBeNull();
    expect(summary?.confirmedOverturned).toBe(1);
  });
});
