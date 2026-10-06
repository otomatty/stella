import { describe, expect, it } from "vitest";
import { TASK_KINDS } from "../tasks/manifest.js";
import {
  AI_REVIEW_OUTPUT_SCHEMA,
  type AiReviewOutput,
  type Confidence,
  CONFIDENCE_LEVELS,
  decideRouting,
  effectiveConfidence,
  forcedHumanReasons,
  formatLearnerReply,
  normalizeRubricResults,
  parseAiReviewOutput,
  type ReviewRubricItem,
  type RubricResult,
  RUBRIC_RESULTS,
} from "./ai-review.js";

const rubric: ReviewRubricItem[] = [
  { id: "CR-NAME-01", criterion: "名前が意味を表す", required: true, rule: true },
  { id: "heading", criterion: "見出しが内容を表す", required: true, rule: false },
  { id: "extra", criterion: "任意の項目", required: false, rule: false },
];
const lines = new Map([
  ["index.html", 10],
  ["#explanation", 2],
]);
const evidence = [{ file: "index.html", startLine: 1, endLine: 3 }];

function output(
  results: Record<string, RubricResult>,
  confidence: Confidence,
  extra: Partial<AiReviewOutput> = {},
): AiReviewOutput {
  return {
    rubric: Object.entries(results).map(([id, result]) => ({ id, result, evidence, note: "" })),
    confidence,
    findings: [],
    learnerReply: { message: "よく書けています", goodPoints: ["見出し"], nextSteps: [] },
    ...extra,
  };
}

function route(
  kind: string,
  out: AiReviewOutput | null,
  more: Partial<Parameters<typeof decideRouting>[0]> = {},
) {
  return decideRouting({
    kind,
    rubric,
    escalateWhen: [],
    forced: [],
    output: out,
    lines,
    leakEscalates: false,
    ...more,
  });
}

describe("人に回すかどうかのしきい値 (07 §6.3)", () => {
  const practice = ["basic", "connection", "independent", "debug"];
  const evidenceKinds = ["integration", "assessment-a", "assessment-b"];
  it("種別をすべて練習か証拠のどちらかに分ける", () => {
    expect([...practice, ...evidenceKinds].sort()).toEqual([...TASK_KINDS].sort());
  });
  // 必須 2 項目の結果の全組み合わせ × 確信度 × 種別で、表どおりに決まることを確かめる。
  for (const kind of TASK_KINDS) {
    for (const confidence of CONFIDENCE_LEVELS) {
      for (const a of RUBRIC_RESULTS) {
        for (const b of RUBRIC_RESULTS) {
          const allMet = a === "met" && b === "met";
          const enough = practice.includes(kind) ? confidence !== "low" : confidence === "high";
          const expected = allMet && enough ? "confirmed" : "escalated";
          it(`${kind} / 確信度 ${confidence} / 必須 ${a}・${b} → ${expected}`, () => {
            const decision = route(
              kind,
              output({ "CR-NAME-01": a, heading: b, extra: "unmet" }, confidence),
            );
            expect(decision.outcome).toBe(expected);
            if (a === "unmet" || b === "unmet") expect(decision.reasons).toContain("rubric-unmet");
            if (a === "undetermined" || b === "undetermined")
              expect(decision.reasons).toContain("rubric-undetermined");
            if (!enough) expect(decision.reasons).toContain("low-confidence");
          });
        }
      }
    }
  }
  it("任意の項目の「満たさない」だけでは人に回さない", () => {
    const decision = route(
      "basic",
      output({ "CR-NAME-01": "met", heading: "met", extra: "unmet" }, "medium"),
    );
    expect(decision).toMatchObject({ outcome: "confirmed", reasons: [], confidence: "medium" });
  });
  it("AI が返さなかった必須項目は「判断できない」として人に回す", () => {
    const decision = route("basic", output({ heading: "met" }, "high"));
    expect(decision.outcome).toBe("escalated");
    expect(decision.results.find((r) => r.id === "CR-NAME-01")?.result).toBe("undetermined");
  });
  it("必須項目が無い課題は AI で確定しない", () => {
    const decision = decideRouting({
      kind: "basic",
      rubric: [{ id: "x", criterion: "任意", required: false, rule: false }],
      escalateWhen: [],
      forced: [],
      output: output({ x: "met" }, "high"),
      lines,
      leakEscalates: false,
    });
    expect(decision.reasons).toEqual(["no-rubric"]);
  });
});

describe("所見の箇所の確かめ", () => {
  const findings = [
    { file: "index.html", startLine: 2, endLine: 4, severity: "minor" as const, comment: "実在" },
    {
      file: "missing.html",
      startLine: 1,
      endLine: 1,
      severity: "info" as const,
      comment: "架空のファイル",
    },
    {
      file: "index.html",
      startLine: 9,
      endLine: 11,
      severity: "info" as const,
      comment: "範囲外の行",
    },
    { file: "index.html", startLine: 0, endLine: 1, severity: "info" as const, comment: "0 行目" },
    { file: "#explanation", startLine: 1, endLine: 2, severity: "info" as const, comment: "説明" },
  ];
  const out = () => output({ "CR-NAME-01": "met", heading: "met" }, "high", { findings });
  it("提出に無いファイル・範囲外の行を指す所見を見分け、練習はそのまま確定する", () => {
    const decision = route("basic", out());
    expect(decision.findingsValid).toEqual([true, false, false, false, true]);
    expect(decision).toMatchObject({ outcome: "confirmed", reasons: [] });
  });
  it("統合・確認A・Bは、箇所の誤った所見があれば人に回す", () => {
    for (const kind of ["integration", "assessment-a", "assessment-b"])
      expect(route(kind, out()).reasons).toEqual(["misplaced-finding"]);
    const valid = output({ "CR-NAME-01": "met", heading: "met" }, "high", {
      findings: [findings[0], findings[4]].filter((f) => f !== undefined),
    });
    expect(route("assessment-a", valid)).toMatchObject({
      outcome: "confirmed",
      findingsValid: [true, true],
    });
  });
});

describe("根拠の確かめ", () => {
  it("実在しないファイル・範囲外の行は根拠から外し、必須項目に根拠が無ければ確信度を低にする", () => {
    const out = output({ "CR-NAME-01": "met", heading: "met" }, "high");
    out.rubric[0].evidence = [
      { file: "missing.html", startLine: 1, endLine: 1 },
      { file: "index.html", startLine: 5, endLine: 11 },
      { file: "index.html", startLine: 3, endLine: 2 },
    ];
    const results = normalizeRubricResults(rubric, out, lines);
    expect(results[0].evidence).toEqual([]);
    expect(effectiveConfidence("high", results)).toBe("low");
    const decision = route("integration", out);
    expect(decision).toMatchObject({ outcome: "escalated", confidence: "low" });
    expect(decision.reasons).toEqual(["low-confidence"]);
  });
  it("説明などの記録も根拠に使える", () => {
    const out = output({ "CR-NAME-01": "met", heading: "met" }, "high");
    out.rubric[1].evidence = [{ file: "#explanation", startLine: 1, endLine: 2 }];
    expect(route("assessment-a", out).outcome).toBe("confirmed");
  });
});

describe("AI の判定によらず人に回す", () => {
  const ok = output({ "CR-NAME-01": "met", heading: "met" }, "high");
  it("AI が判定できなかった", () => {
    expect(route("basic", null)).toMatchObject({
      outcome: "escalated",
      reasons: ["ai-unavailable"],
      proposedVerdict: null,
    });
  });
  it("提出の時点で分かる条件 (照合・支援・相談)", () => {
    const matched = { matched: true, reasons: [] };
    expect(
      forcedHumanReasons({ kind: "basic", mode: "submit", machineCheck: matched, support: [] }),
    ).toEqual([]);
    expect(
      forcedHumanReasons({
        kind: "basic",
        mode: "submit",
        machineCheck: { matched: false, reasons: ["配布したテスト・設定のハッシュが一致しません"] },
        support: [],
      }),
    ).toEqual(["machine-check"]);
    expect(
      forcedHumanReasons({
        kind: "basic",
        mode: "consult",
        machineCheck: { matched: false, reasons: ["受講者が講師への相談を求めています"] },
        support: [],
      }),
    ).toEqual(["consult"]);
    const hint = [{ kind: "hint" as const, at: "2026-10-05T00:00:00Z" }];
    // 練習では支援を使ってよい (支援付きとして記録するだけ)。
    expect(
      forcedHumanReasons({ kind: "basic", mode: "submit", machineCheck: matched, support: hint }),
    ).toEqual([]);
    for (const kind of ["assessment-a", "assessment-b"])
      expect(
        forcedHumanReasons({ kind, mode: "submit", machineCheck: matched, support: hint }),
      ).toEqual(["unallowed-support"]);
    expect(
      forcedHumanReasons({ kind: "basic", mode: "submit", machineCheck: null, support: null }),
    ).toEqual(["machine-check"]);
  });
  it("AI がすべて満たすと答えても、提出の時点の条件があれば人に回す", () => {
    expect(route("basic", ok, { forced: ["consult"] })).toMatchObject({
      outcome: "escalated",
      reasons: ["consult"],
      proposedVerdict: "pass",
    });
  });
  it("確認A・Bで返信が解答例と重なった", () => {
    expect(route("assessment-b", ok, { leakEscalates: true }).reasons).toEqual(["solution-leak"]);
  });
  it("課題ごとの追加条件", () => {
    const withMajor = output({ "CR-NAME-01": "met", heading: "met", extra: "unmet" }, "high", {
      findings: [
        { file: "index.html", startLine: 1, endLine: 1, severity: "major", comment: "重い" },
      ],
    });
    expect(route("basic", withMajor).outcome).toBe("confirmed");
    expect(route("basic", withMajor, { escalateWhen: ["major-finding"] }).reasons).toEqual([
      "task-condition",
    ]);
    expect(route("basic", withMajor, { escalateWhen: ["optional-unmet"] }).reasons).toEqual([
      "task-condition",
    ]);
  });
});

describe("AI の応答の検証", () => {
  const valid = JSON.stringify(output({ heading: "met" }, "medium"));
  it("スキーマどおりの応答を読む", () => {
    expect(parseAiReviewOutput(valid)?.confidence).toBe("medium");
  });
  it("形の誤りは null (AI が判定できなかった)", () => {
    expect(parseAiReviewOutput("not json")).toBeNull();
    expect(parseAiReviewOutput("{}")).toBeNull();
    const broken = JSON.parse(valid);
    broken.confidence = "0.9";
    expect(parseAiReviewOutput(JSON.stringify(broken))).toBeNull();
    const badEvidence = JSON.parse(valid);
    badEvidence.rubric[0].evidence = [{ file: "a", startLine: "1", endLine: 1 }];
    expect(parseAiReviewOutput(JSON.stringify(badEvidence))).toBeNull();
    const badSeverity = JSON.parse(valid);
    badSeverity.findings = [
      { file: "a", startLine: 1, endLine: 1, severity: "fatal", comment: "" },
    ];
    expect(parseAiReviewOutput(JSON.stringify(badSeverity))).toBeNull();
  });
  it("同じ項目を 2 回返した応答は、結果が食い違っても一致していても形の誤りにする", () => {
    const evidence = [{ file: "index.html", startLine: 1, endLine: 1 }];
    for (const second of ["unmet", "met"] as const) {
      const out = output({ heading: "met" }, "high");
      out.rubric.push({ id: "heading", result: second, evidence, note: "" });
      expect(parseAiReviewOutput(JSON.stringify(out))).toBeNull();
    }
  });
  it("判定に重複した項目が渡っても、先頭の結果では確定しない", () => {
    const out = output({ "CR-NAME-01": "met", heading: "met" }, "high");
    out.rubric.push({
      id: "heading",
      result: "unmet",
      evidence: out.rubric[0]?.evidence ?? [],
      note: "",
    });
    const decision = route("basic", out);
    expect(decision.results.find((r) => r.id === "heading")?.result).toBe("undetermined");
    expect(decision).toMatchObject({
      outcome: "escalated",
      reasons: ["rubric-undetermined", "low-confidence"],
    });
  });
  it("スキーマはすべてのオブジェクトで追加のキーを禁じる (構造化出力の条件)", () => {
    const objects: unknown[] = [];
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const record = node as Record<string, unknown>;
      if (record.type === "object") objects.push(record);
      for (const value of Object.values(record)) walk(value);
    };
    walk(AI_REVIEW_OUTPUT_SCHEMA);
    expect(objects.length).toBeGreaterThan(3);
    for (const o of objects) expect(o).toMatchObject({ additionalProperties: false });
  });
});

it("受講者への返信を総評の文に整える", () => {
  expect(
    formatLearnerReply({
      message: "合格です。",
      goodPoints: ["見出しが明確"],
      nextSteps: ["段落も足す"],
    }),
  ).toBe("合格です。\n\n良かった点\n- 見出しが明確\n\n次に試すこと\n- 段落も足す");
});
