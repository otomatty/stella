/**
 * 道具の JSON 出力 (Vitest・ESLint・Playwright) を、実行結果の形に読み替える。
 * 形は各道具の実際の出力から取ったフィクスチャ (`__fixtures__/`) で確かめている。
 */

import type { LintFinding, StepStatus, TestCaseResult } from "@stella/shared/tasks/run-result";
import { stripAnsi } from "./process.js";

/** 失敗メッセージの先頭だけ。スタックトレースや絶対パスを受講者に見せない。 */
export function cleanMessage(message: string, root: string, maxLines = 8): string {
  const lines = stripAnsi(message)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s+at\s/.test(line));
  const text = lines.slice(0, maxLines).join("\n").trimEnd();
  return relativize(text, root);
}

/** 文中の課題フォルダーの絶対パスを相対パスにする。 */
export function relativize(text: string, root: string): string {
  const slashed = root.replace(/\\/g, "/");
  const fileUrl = slashed.startsWith("/") ? `file://${slashed}` : `file:///${slashed}`;
  // 日本語や空白を含むパスは、file URL では %E6%97%A5 のように符号化されて出る。
  const variants = new Set(
    [fileUrl, encodedUrl(fileUrl), root, slashed].flatMap(withBothDriveCases),
  );
  let out = text;
  for (const variant of variants) {
    if (!variant) continue;
    out = out.split(`${variant}/`).join("").split(`${variant}\\`).join("");
  }
  return out;
}

/** Windows のファイル名には対にならないサロゲートが入りうる。符号化できなければ使わない。 */
function encodedUrl(url: string): string {
  try {
    return encodeURI(url);
  } catch {
    return url;
  }
}

const DRIVE = /^(file:\/\/\/)?([A-Za-z]):/;

/**
 * Windows のドライブ文字は、VS Code からは `c:`、道具の出力では `C:` のように大小が
 * 混ざって届く。どちらの書き方でも課題フォルダーと分かるよう、両方を返す。
 */
function withBothDriveCases(text: string): string[] {
  const match = DRIVE.exec(text);
  if (!match) return [text];
  const rest = text.slice(match[0].length);
  const prefix = match[1] ?? "";
  const drive = match[2] ?? "";
  return [`${prefix}${drive.toLowerCase()}:${rest}`, `${prefix}${drive.toUpperCase()}:${rest}`];
}

function upperDrive(text: string): string {
  return text.replace(DRIVE, (_, prefix: string | undefined, drive: string) => {
    return `${prefix ?? ""}${drive.toUpperCase()}:`;
  });
}

export function relativePath(file: string, root: string): string {
  const normalizedRoot = upperDrive(root.replace(/\\/g, "/").replace(/\/+$/, ""));
  const normalized = upperDrive(file.replace(/\\/g, "/"));
  return normalized.startsWith(`${normalizedRoot}/`)
    ? normalized.slice(normalizedRoot.length + 1)
    : file.replace(/\\/g, "/");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface ParsedTests {
  status: StepStatus;
  summary: string;
  tests: TestCaseResult[];
}

/** Vitest の `--reporter=json` (Jest 互換の形)。読めなければ null。 */
export function parseVitestReport(raw: unknown, root: string): ParsedTests | null {
  if (!isObject(raw) || !Array.isArray(raw.testResults)) return null;
  const tests: TestCaseResult[] = [];
  for (const suite of raw.testResults) {
    if (!isObject(suite)) continue;
    const file = typeof suite.name === "string" ? relativePath(suite.name, root) : undefined;
    const assertions = Array.isArray(suite.assertionResults) ? suite.assertionResults : [];
    for (const assertion of assertions) {
      if (!isObject(assertion)) continue;
      const titles = [
        ...(Array.isArray(assertion.ancestorTitles) ? assertion.ancestorTitles : []),
        assertion.title,
      ].filter((t): t is string => typeof t === "string" && t.length > 0);
      const status =
        assertion.status === "passed"
          ? "passed"
          : assertion.status === "failed"
            ? "failed"
            : "skipped";
      const failures = Array.isArray(assertion.failureMessages) ? assertion.failureMessages : [];
      const first = failures.find((m): m is string => typeof m === "string");
      tests.push({
        name: titles.join(" › "),
        ...(file ? { file } : {}),
        status,
        ...(status === "failed" && first ? { message: cleanMessage(first, root) } : {}),
      });
    }
    // テストファイル自体が読めなかった (構文の誤り・import の誤り)。
    if (assertions.length === 0 && suite.status === "failed") {
      tests.push({
        name: `${file ?? "テストファイル"} を読み込めませんでした`,
        ...(file ? { file } : {}),
        status: "failed",
        message:
          typeof suite.message === "string" && suite.message
            ? cleanMessage(suite.message, root)
            : "テストファイルの読み込みに失敗しました",
      });
    }
  }
  return summarizeTests(tests, raw.success === false);
}

function summarizeTests(tests: TestCaseResult[], reportedFailure: boolean): ParsedTests {
  const passed = tests.filter((t) => t.status === "passed").length;
  const failed = tests.filter((t) => t.status === "failed").length;
  const counted = tests.filter((t) => t.status !== "skipped").length;
  if (tests.length === 0) {
    return { status: "error", summary: "テストが見つかりませんでした", tests };
  }
  if (failed > 0) {
    return { status: "failed", summary: `${counted} 件中 ${passed} 件が通りました`, tests };
  }
  // すべて省略 (test.skip など) なら、何も確かめていないので通さない。
  if (counted === 0) {
    return {
      status: "failed",
      summary:
        "実行されたテストがありません (すべて省略されています)。テストの skip を外してください",
      tests,
    };
  }
  if (reportedFailure) {
    return {
      status: "failed",
      summary: "テストは通りましたが、実行中にエラーが出ました。ログを確認してください",
      tests,
    };
  }
  return { status: "passed", summary: `${counted} 件すべて通りました`, tests };
}

/** Playwright の JSON レポーター。読めなければ null。 */
export function parsePlaywrightReport(raw: unknown, root: string): ParsedTests | null {
  if (!isObject(raw) || !Array.isArray(raw.suites)) return null;
  const tests: TestCaseResult[] = [];
  const walk = (suite: Record<string, unknown>, titles: string[], depth: number) => {
    // 一番外の suite はファイル名なので題名に含めない。
    const own = depth > 0 && typeof suite.title === "string" ? [...titles, suite.title] : titles;
    for (const spec of Array.isArray(suite.specs) ? suite.specs : []) {
      if (!isObject(spec)) continue;
      const file = typeof spec.file === "string" ? spec.file : undefined;
      for (const test of Array.isArray(spec.tests) ? spec.tests : []) {
        if (!isObject(test)) continue;
        const results = Array.isArray(test.results) ? test.results.filter(isObject) : [];
        const last = results[results.length - 1];
        const status =
          test.status === "skipped"
            ? "skipped"
            : test.status === "unexpected"
              ? "failed"
              : "passed";
        const error = last && isObject(last.error) ? last.error : undefined;
        tests.push({
          name: [...own, typeof spec.title === "string" ? spec.title : ""]
            .filter(Boolean)
            .join(" › "),
          ...(file ? { file } : {}),
          status,
          ...(status === "failed" && typeof error?.message === "string"
            ? { message: cleanMessage(error.message, root) }
            : {}),
        });
      }
    }
    for (const child of Array.isArray(suite.suites) ? suite.suites : []) {
      if (isObject(child)) walk(child, own, depth + 1);
    }
  };
  for (const suite of raw.suites) {
    if (isObject(suite)) walk(suite, [], 0);
  }
  const errors = Array.isArray(raw.errors) ? raw.errors.filter(isObject) : [];
  if (tests.length === 0 && errors.length > 0) {
    const message = errors
      .map((e) => (typeof e.message === "string" ? cleanMessage(e.message, root, 4) : ""))
      .filter(Boolean)
      .join("\n");
    return {
      status: "error",
      summary: "テストを始められませんでした",
      tests: [{ name: "Playwright の設定・起動", status: "failed", message }],
    };
  }
  return summarizeTests(tests, errors.length > 0);
}

/** ESLint の `--format json`。読めなければ null。 */
export function parseEslintReport(
  raw: unknown,
  root: string,
): { status: StepStatus; summary: string; lint: LintFinding[] } | null {
  if (!Array.isArray(raw)) return null;
  const lint: LintFinding[] = [];
  for (const result of raw) {
    if (!isObject(result) || typeof result.filePath !== "string") continue;
    const file = relativePath(result.filePath, root);
    for (const message of Array.isArray(result.messages) ? result.messages : []) {
      if (!isObject(message)) continue;
      lint.push({
        file,
        line: typeof message.line === "number" ? message.line : 0,
        column: typeof message.column === "number" ? message.column : 0,
        ruleId: typeof message.ruleId === "string" ? message.ruleId : null,
        message: typeof message.message === "string" ? message.message : "",
        severity: message.severity === 2 ? "error" : "warning",
      });
    }
  }
  const errors = lint.filter((f) => f.severity === "error").length;
  const warnings = lint.length - errors;
  return {
    status: errors > 0 ? "failed" : "passed",
    summary:
      errors === 0 && warnings === 0
        ? "違反はありません"
        : `エラー ${errors} 件・警告 ${warnings} 件`,
    lint,
  };
}

/** Prettier の `--list-different` の出力 (整形が必要なファイルが 1 行ずつ)。 */
export function parsePrettierList(stdout: string): string[] {
  return stripAnsi(stdout)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/^\.\//, ""))
    .filter((line) => line.length > 0 && !line.startsWith("["));
}
