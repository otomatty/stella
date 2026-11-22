import type { AiReviewRecord, NormalizedRubricResult } from "@stella/shared/review/ai-review";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AiReviewPanel } from "@/components/instructor/AiReviewPanel";
import { describe, expect, it, vi } from "vitest";
import { evidenceLineLabel, evidenceTarget, rubricEvidenceByLine } from "./review-evidence";

const files = new Map([
  ["src/a.ts", 12],
  ["src/b.ts", 5],
]);
const range = { file: "src/a.ts", startLine: 7, endLine: 11 };
const item: NormalizedRubricResult = {
  id: "required",
  criterion: "Check required",
  result: "unmet",
  required: true,
  rule: false,
  note: "",
  evidence: [range, { file: "src/b.ts", startLine: 1, endLine: 1 }],
};

describe("review evidence", () => {
  it("returns the exact file and inclusive range for a line button", () => {
    expect(evidenceTarget(range, files)).toEqual(range);
    expect(evidenceLineLabel(range)).toBe("7–11 行");
    const single = { file: "src/b.ts", startLine: 5, endLine: 5 };
    expect(evidenceTarget(single, files)).toEqual(single);
    expect(evidenceLineLabel(single)).toBe("5 行");
  });

  it("leaves missing files, pseudo-files and invalid ranges as text", () => {
    expect(evidenceTarget({ ...range, file: "other.ts" }, files)).toBeNull();
    expect(evidenceTarget({ ...range, file: "#explanation" }, files)).toBeNull();
    expect(evidenceTarget({ ...range, startLine: 0 }, files)).toBeNull();
    expect(evidenceTarget({ ...range, endLine: 6 }, files)).toBeNull();
    expect(evidenceTarget({ ...range, endLine: 13 }, files)).toBeNull();
  });

  it("marks only non-met evidence in the selected file, combining overlapping labels", () => {
    const lines = rubricEvidenceByLine(
      [
        item,
        { ...item, id: "optional", required: false, result: "undetermined", evidence: [range] },
        { ...item, id: "met", result: "met", evidence: [{ ...range, startLine: 6 }] },
      ],
      range.file,
      files,
    );
    expect([...lines.keys()]).toEqual([7, 8, 9, 10, 11]);
    expect([...(lines.get(7) ?? [])]).toEqual(["必須 · required", "任意 · optional"]);
    expect(lines.get(8)?.size).toBe(0);
  });
});

it("renders buttons only for evidence in submitted code", () => {
  const review: AiReviewRecord = {
    id: "review",
    outcome: "escalated",
    routeReasons: [],
    confidence: null,
    reportedConfidence: null,
    proposedVerdict: null,
    rubricResults: [
      {
        ...item,
        evidence: [range, { ...range, file: "other.ts" }, { ...range, file: "#explanation" }],
      },
    ],
    findings: [],
    draftReply: null,
    learnerReply: null,
    leakCheck: null,
    appliedRules: [],
    ruleSetHash: null,
    failure: null,
    model: null,
    promptVersion: "1",
    thresholdVersion: "1",
    disposition: null,
    createdAt: "",
  };
  const html = renderToStaticMarkup(
    createElement(AiReviewPanel, {
      status: undefined,
      review,
      fileLineCounts: files,
      onJumpToEvidence: vi.fn(),
      onUseReply: vi.fn(),
    }),
  );
  expect(html.match(/<button\b/g)).toHaveLength(1);
  expect(html).toContain('aria-label="src/a.ts 7–11 行"');
  expect(html).toContain("min-h-8");
  expect(html).toContain("other.ts:7-11");
  expect(html).toContain("#explanation:7-11");
});
