import { describe, expect, it } from "vitest";

import {
  buildGradingSummary,
  formatGradingSummaryText,
  parseGradingSummary,
  toReviewDraftLanguage,
  type GradingSummaryInput,
} from "./grading-summary.js";
import { MAX_REVIEW_SUMMARY_LENGTH } from "./validate-review-draft-request.js";

const failing: GradingSummaryInput = {
  evaluation: {
    cleared: false,
    checks: { lintPassed: false, astPassed: false, testsPassed: false },
  },
  testResults: [
    { name: "1 + 1 = 2", passed: true },
    { name: "空配列は 0", passed: false, error: "expected 0, got NaN" },
  ],
  lintAtRun: [
    { ruleId: "eqeqeq", severity: 2, message: "=== を使ってください", line: 3, column: 5 },
    { ruleId: "no-console", severity: 1, message: "console は警告", line: 9, column: 1 },
  ],
  astAtRun: {
    required: [
      {
        pattern: { kind: "node", nodeType: "ForOfStatement" },
        label: "for...of を使う",
        found: false,
      },
      { pattern: { kind: "const-declaration" }, label: "const を使う", found: true },
    ],
    forbidden: [
      { pattern: { kind: "node", nodeType: "ForStatement" }, label: "for 文は使わない", line: 4 },
    ],
  },
  errorMessage: "  ",
};

describe("toReviewDraftLanguage", () => {
  it("Assignment の言語を添削向けに丸める", () => {
    expect(toReviewDraftLanguage("typescript")).toBe("ts");
    expect(toReviewDraftLanguage("sql")).toBe("sql");
    expect(toReviewDraftLanguage("fe-pseudo")).toBe("fe-pseudo");
    expect(toReviewDraftLanguage("javascript")).toBe("js");
    expect(toReviewDraftLanguage(undefined)).toBe("js");
  });
});

describe("buildGradingSummary", () => {
  it("error の lint / 失敗テスト / AST の不足と禁止だけを拾う", () => {
    const summary = buildGradingSummary(failing, "typescript");
    expect(summary.cleared).toBe(false);
    expect(summary.checks).toEqual({ lint: false, ast: false, tests: false });
    expect(summary.language).toBe("ts");
    expect(summary.lint).toEqual([{ line: 3, message: "=== を使ってください", ruleId: "eqeqeq" }]);
    expect(summary.ast).toEqual([
      "必須の書き方が見つからない: for...of を使う",
      "禁止された書き方: for 文は使わない (4 行目)",
    ]);
    expect(summary.failedTests).toEqual([{ name: "空配列は 0", error: "expected 0, got NaN" }]);
    expect(summary.passedTestCount).toBe(1);
    expect(summary.totalTestCount).toBe(2);
  });

  it("空白だけの errorMessage は載せない", () => {
    expect(buildGradingSummary(failing, "javascript").errorMessage).toBeUndefined();
  });

  it("parseError は AST の 1 行目に出す", () => {
    const summary = buildGradingSummary(
      { ...failing, astAtRun: { required: [], forbidden: [], parseError: "Unexpected token" } },
      "javascript",
    );
    expect(summary.ast[0]).toBe("構文解析に失敗: Unexpected token");
  });
});

describe("formatGradingSummaryText", () => {
  it("チェック 3 行を必ず含み、失敗の詳細を並べる", () => {
    const text = formatGradingSummaryText(buildGradingSummary(failing, "javascript"));
    expect(text).toContain("自動採点: 未クリア");
    expect(text).toContain("- Lint: 失敗");
    expect(text).toContain("- テスト: 失敗 (1/2 通過)");
    expect(text).toContain("- 3 行目: === を使ってください (eqeqeq)");
    expect(text).toContain("- 空配列は 0: expected 0, got NaN");
  });

  // 上限を超えると `/api/review-draft` が 400 を返し、AI 下書きがヒューリスティックに落ちる。
  it("上限いっぱいのサマリでも AI 下書きの上限内に収まる", () => {
    const long = "あ".repeat(400);
    const worst = buildGradingSummary(
      {
        evaluation: {
          cleared: false,
          checks: { lintPassed: false, astPassed: false, testsPassed: false },
        },
        testResults: Array.from({ length: 40 }, (_, i) => ({
          name: `テスト ${i}`.padEnd(120, "x"),
          passed: false,
          error: long,
        })),
        lintAtRun: Array.from({ length: 40 }, (_, i) => ({
          ruleId: "rule",
          severity: 2 as const,
          message: long,
          line: i + 1,
          column: 1,
        })),
        astAtRun: { required: [], forbidden: [] },
      },
      "javascript",
    );
    const text = formatGradingSummaryText(worst);
    expect(text.length).toBeLessThanOrEqual(MAX_REVIEW_SUMMARY_LENGTH);
    expect(text).toContain("以下省略");
    // 打ち切っても先頭のチェック行は必ず残る。
    expect(text).toContain("自動採点: 未クリア");
  });

  it("行の途中では切らない", () => {
    const text = formatGradingSummaryText(buildGradingSummary(failing, "javascript"), 60);
    expect(text.length).toBeLessThanOrEqual(60);
    for (const line of text.split("\n")) {
      expect(line === "…(以下省略)" || line.startsWith("自動採点") || line.startsWith("-")).toBe(
        true,
      );
    }
  });
});

describe("parseGradingSummary", () => {
  it("組み立てたサマリはそのまま通る", () => {
    const summary = buildGradingSummary(failing, "javascript");
    expect(parseGradingSummary(JSON.parse(JSON.stringify(summary)))).toEqual(summary);
  });

  it("形が合わないものは null", () => {
    expect(parseGradingSummary(null)).toBeNull();
    expect(parseGradingSummary({})).toBeNull();
    expect(parseGradingSummary({ cleared: true, checks: { lint: true } })).toBeNull();
    expect(parseGradingSummary("[]")).toBeNull();
  });

  // 受講者が送れる値なので、 配列の中身まで見る。 素通しすると講師の ReviewEditor が
  // `violation.line` / `test.name` を読む時点で落ちて、 その提出を開けなくなる。
  it("配列の要素が壊れていたら null", () => {
    const valid = buildGradingSummary(failing, "javascript");
    expect(parseGradingSummary({ ...valid, lint: [null] })).toBeNull();
    expect(parseGradingSummary({ ...valid, lint: [{ message: "行番号が無い" }] })).toBeNull();
    expect(parseGradingSummary({ ...valid, lint: [{ line: 1, message: 3 }] })).toBeNull();
    expect(parseGradingSummary({ ...valid, failedTests: [null] })).toBeNull();
    expect(parseGradingSummary({ ...valid, failedTests: [{ error: "名前が無い" }] })).toBeNull();
    expect(parseGradingSummary({ ...valid, ast: [{ label: "文字列でない" }] })).toBeNull();
  });

  it("スカラーが壊れていたら null", () => {
    const valid = buildGradingSummary(failing, "javascript");
    expect(parseGradingSummary({ ...valid, language: "python" })).toBeNull();
    expect(parseGradingSummary({ ...valid, checks: { lint: true, ast: true } })).toBeNull();
    expect(parseGradingSummary({ ...valid, passedTestCount: -1 })).toBeNull();
    expect(parseGradingSummary({ ...valid, totalTestCount: Number.NaN })).toBeNull();
    expect(parseGradingSummary({ ...valid, errorMessage: 42 })).toBeNull();
  });

  it("異常に大きい payload は null", () => {
    const valid = buildGradingSummary(failing, "javascript");
    const many = Array.from({ length: 500 }, (_, i) => ({ name: `t${i}` }));
    expect(parseGradingSummary({ ...valid, failedTests: many })).toBeNull();
    expect(parseGradingSummary({ ...valid, ast: ["x".repeat(10_000)] })).toBeNull();
  });
});
