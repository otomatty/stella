/**
 * 採点失敗サマリ (Issue #9 — 学習者 intake)。
 *
 * VS Code 拡張の採点結果を、 D1 にそのまま載る最小形へ落とす純関数群。
 * ランタイム依存なし — 拡張 / api / web のどこからでも import できる。
 */

import type { ASTResult, EvaluationResult, Language, LintViolation, TestResult } from "../types.js";
import type {
  GradingSummary,
  GradingSummaryLint,
  GradingSummaryTest,
  ReviewDraftLanguage,
} from "./types.js";
import { MAX_REVIEW_SUMMARY_LENGTH } from "./validate-review-draft-request.js";

/** 提出に載せる lint / テストの上限。 講師が読む量と D1 の行サイズを抑える。 */
export const MAX_SUMMARY_LINT = 20;
export const MAX_SUMMARY_TESTS = 20;
/** 1 件あたりのメッセージ上限 (超過分は切り詰める)。 */
export const MAX_SUMMARY_MESSAGE = 400;

/** 採点結果のうちサマリ化に必要な部分だけを構造的に受ける。 */
export interface GradingSummaryInput {
  evaluation: EvaluationResult;
  testResults: TestResult[];
  lintAtRun: LintViolation[];
  astAtRun: ASTResult;
  errorMessage?: string;
}

const LANGUAGES: readonly ReviewDraftLanguage[] = ["js", "ts", "sql", "fe-pseudo"];

export function toReviewDraftLanguage(language: Language | undefined): ReviewDraftLanguage {
  switch (language) {
    case "typescript":
      return "ts";
    case "sql":
      return "sql";
    case "fe-pseudo":
      return "fe-pseudo";
    default:
      return "js";
  }
}

function truncate(text: string, max = MAX_SUMMARY_MESSAGE): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function toLint(violations: readonly LintViolation[]): GradingSummaryLint[] {
  return violations
    .filter((v) => v.severity === 2)
    .slice(0, MAX_SUMMARY_LINT)
    .map((v) => ({
      line: v.line,
      message: truncate(v.message || v.rawMessage || "lint エラー"),
      ...(v.ruleId ? { ruleId: v.ruleId } : {}),
    }));
}

function toAstMessages(ast: ASTResult): string[] {
  const out: string[] = [];
  if (ast.parseError) {
    out.push(`構文解析に失敗: ${truncate(ast.parseError)}`);
  }
  for (const req of ast.required) {
    if (!req.found) {
      out.push(`必須の書き方が見つからない: ${req.label}`);
    }
  }
  for (const forbidden of ast.forbidden) {
    out.push(`禁止された書き方: ${forbidden.label} (${forbidden.line} 行目)`);
  }
  return out;
}

function toFailedTests(tests: readonly TestResult[]): GradingSummaryTest[] {
  return tests
    .filter((t) => !t.passed)
    .slice(0, MAX_SUMMARY_TESTS)
    .map((t) => ({
      name: truncate(t.name, 120),
      ...(t.error ? { error: truncate(t.error) } : {}),
    }));
}

/** 採点結果 + 課題言語から、 提出に添付するサマリを組み立てる。 */
export function buildGradingSummary(
  result: GradingSummaryInput,
  language: Language | undefined,
): GradingSummary {
  const errorMessage = result.errorMessage?.trim();
  return {
    cleared: result.evaluation.cleared,
    checks: {
      lint: result.evaluation.checks.lintPassed,
      ast: result.evaluation.checks.astPassed,
      tests: result.evaluation.checks.testsPassed,
    },
    language: toReviewDraftLanguage(language),
    lint: toLint(result.lintAtRun ?? []),
    ast: toAstMessages(result.astAtRun ?? { required: [], forbidden: [] }),
    failedTests: toFailedTests(result.testResults ?? []),
    passedTestCount: (result.testResults ?? []).filter((t) => t.passed).length,
    totalTestCount: (result.testResults ?? []).length,
    ...(errorMessage ? { errorMessage: truncate(errorMessage) } : {}),
  };
}

function checkLabel(passed: boolean): string {
  return passed ? "通過" : "失敗";
}

/** 打ち切りの注記。 これも含めて上限内に収める。 */
const SUMMARY_TRUNCATED = "…(以下省略)";

/**
 * 上限内に収まる行だけを連結する。 行の途中では切らない。
 *
 * 上限を超えると `/api/review-draft` が 400 を返し、 AI 下書きが
 * ヒューリスティックに落ちてしまう (せっかくのサマリが使われない)。
 */
function joinWithin(lines: readonly string[], maxLength: number): string {
  const budget = maxLength - SUMMARY_TRUNCATED.length - 1;
  const out: string[] = [];
  let length = 0;
  for (const line of lines) {
    const added = out.length === 0 ? line.length : line.length + 1;
    if (length + added > budget) {
      out.push(SUMMARY_TRUNCATED);
      break;
    }
    out.push(line);
    length += added;
  }
  return out.join("\n");
}

/**
 * サマリを講師 / AI 下書きプロンプト向けのプレーンテキストに整形する。
 * 空文字は返さない (サマリがある限り最低でもチェック 3 行は出る)。
 *
 * 講師 UI は `GradingSummary` を直接描くので、 打ち切られるのは AI へ渡す文面だけ。
 */
export function formatGradingSummaryText(
  summary: GradingSummary,
  maxLength = MAX_REVIEW_SUMMARY_LENGTH,
): string {
  const lines: string[] = [
    `自動採点: ${summary.cleared ? "クリア" : "未クリア"}`,
    `- Lint: ${checkLabel(summary.checks.lint)}`,
    `- AST: ${checkLabel(summary.checks.ast)}`,
    `- テスト: ${checkLabel(summary.checks.tests)} (${summary.passedTestCount}/${summary.totalTestCount} 通過)`,
  ];
  if (summary.errorMessage) {
    lines.push(`- 実行エラー: ${summary.errorMessage}`);
  }
  if (summary.lint.length > 0) {
    lines.push("Lint エラー:");
    for (const v of summary.lint) {
      lines.push(`- ${v.line} 行目: ${v.message}${v.ruleId ? ` (${v.ruleId})` : ""}`);
    }
  }
  if (summary.ast.length > 0) {
    lines.push("AST チェック:");
    for (const message of summary.ast) {
      lines.push(`- ${message}`);
    }
  }
  if (summary.failedTests.length > 0) {
    lines.push("失敗したテスト:");
    for (const t of summary.failedTests) {
      lines.push(`- ${t.name}${t.error ? `: ${t.error}` : ""}`);
    }
  }
  return joinWithin(lines, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** 受信側の上限。 送信側 (`buildGradingSummary`) の上限より緩めに取り、 異常値だけ弾く。 */
const MAX_ACCEPTED_ENTRIES = 200;
const MAX_ACCEPTED_TEXT = 4_000;

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_ACCEPTED_TEXT;
}

function isOptionalText(value: unknown): boolean {
  return value === undefined || isText(value);
}

/** 0 以上の有限な整数 (件数)。 */
function isCount(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isBoundedArray(value: unknown, item: (v: unknown) => boolean): boolean {
  return Array.isArray(value) && value.length <= MAX_ACCEPTED_ENTRIES && value.every(item);
}

function isLintEntry(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.line === "number" &&
    Number.isFinite(value.line) &&
    isText(value.message) &&
    isOptionalText(value.ruleId)
  );
}

function isTestEntry(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isText(value.name) && isOptionalText(value.error);
}

function isChecks(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.lint === "boolean" &&
    typeof value.ast === "boolean" &&
    typeof value.tests === "boolean"
  );
}

/**
 * D1 / API から戻る `unknown` を GradingSummary として受け入れてよいか判定する。
 *
 * `gradingSummary` は受講者が送れる値なので、 配列かどうかだけでなく **要素の形まで**
 * 見る。 `lint: [null]` のような payload を通すと、 講師の ReviewEditor が
 * `violation.line` を読む時点で例外になり、 その提出を開けなくなる。
 */
export function isGradingSummary(value: unknown): value is GradingSummary {
  if (!isRecord(value)) return false;
  if (typeof value.cleared !== "boolean") return false;
  if (!isChecks(value.checks)) return false;
  if (!LANGUAGES.some((language) => language === value.language)) return false;
  if (!isBoundedArray(value.lint, isLintEntry)) return false;
  if (!isBoundedArray(value.ast, isText)) return false;
  if (!isBoundedArray(value.failedTests, isTestEntry)) return false;
  if (!isCount(value.passedTestCount) || !isCount(value.totalTestCount)) return false;
  return isOptionalText(value.errorMessage);
}

/** 形が合わないものを黙って落として GradingSummary | null にする。 */
export function parseGradingSummary(value: unknown): GradingSummary | null {
  return isGradingSummary(value) ? value : null;
}
