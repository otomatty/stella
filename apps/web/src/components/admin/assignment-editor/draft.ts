/**
 * AssignmentEditor の Draft 状態と共有ヘルパ。
 *
 * Dialog 本体 (AssignmentEditor.tsx) と各タブのサブフォームが同じ Draft shape を
 * 参照するため、 型・定数・変換ヘルパをここに集約する。
 */

import type {
  AssignmentFile,
  ASTRequirement,
  ChapterId,
  ESLintRuleConfig,
  Language,
  LintPreset,
  Stage,
  TestKind,
  TestCase,
  EvaluationResult,
  TestResult,
} from "@falcon/shared/types";
import type { AssignmentRow } from "@falcon/shared/cms/types";

export interface Draft {
  id: string;
  title: string;
  stage: Stage;
  chapterId: ChapterId;
  language: Language;
  testKind: TestKind;
  description: string;
  starterFiles: AssignmentFile[];
  entryFile: string;
  entryPoints: string;
  demoCall: string;
  sqlSeed: string;
  tests: TestCase[];
  lintPreset: LintPreset | "";
  astRequiredJson: string;
  astForbiddenJson: string;
  eslintRulesJson: string;
  /** 編集 UI 上のアクティブなスターターファイルパス */
  activeFile: string;
}

export interface FormProps {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
}

export interface PreviewResult {
  evaluation: EvaluationResult;
  results: TestResult[];
  error?: string;
}

export const STAGES: Stage[] = ["S0", "S1", "S2", "S3", "S4", "S5"];
export const LANGUAGES: Language[] = ["javascript", "typescript", "sql", "fe-pseudo"];
export const TEST_KINDS: TestKind[] = ["stdout", "function", "sql"];
export const LINT_PRESETS: LintPreset[] = ["S1", "S2", "S3", "S4", "S5"];

export function newDraft(): Draft {
  // タイムスタンプ + 乱数で衝突しにくいデフォルト ID にする (新規時はユーザーが編集可)。
  const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const starter: AssignmentFile = { path: "main.js", content: "" };
  return {
    id,
    title: "新しい課題",
    stage: "S1",
    chapterId: "Ch00",
    language: "javascript",
    testKind: "stdout",
    description: "",
    starterFiles: [starter],
    entryFile: "main.js",
    entryPoints: "",
    demoCall: "",
    sqlSeed: "",
    tests: [{ name: "main", expectedStdout: "" }],
    lintPreset: "",
    astRequiredJson: "[]",
    astForbiddenJson: "[]",
    eslintRulesJson: "{}",
    activeFile: "main.js",
  };
}

export function fromRow(row: AssignmentRow): Draft {
  const ast = (row.static_analysis?.ast ?? {}) as ASTRequirement;
  const rules = (row.static_analysis?.eslint?.rules ?? {}) as Record<string, ESLintRuleConfig>;
  return {
    id: row.id,
    title: row.title,
    stage: row.stage,
    chapterId: row.chapter_id,
    language: row.language,
    testKind: row.test_kind,
    description: row.description,
    starterFiles: row.starter_files,
    entryFile: row.entry_file ?? row.starter_files[0]?.path ?? "main.js",
    entryPoints: (row.entry_points ?? []).join(", "),
    demoCall: row.demo_call ?? "",
    sqlSeed: row.sql_seed ?? "",
    tests: row.tests,
    lintPreset: row.lint_preset ?? "",
    astRequiredJson: JSON.stringify(ast.required ?? [], null, 2),
    astForbiddenJson: JSON.stringify(ast.forbidden ?? [], null, 2),
    eslintRulesJson: JSON.stringify(rules, null, 2),
    activeFile: row.starter_files[0]?.path ?? "main.js",
  };
}

export function parseJsonOr<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * parseJsonOr の strict 版。 空欄は呼び出し側が指定した `emptyDefault` を返し、
 * 不正な JSON は例外を投げる (UI 側でユーザに見せる)。
 */
export function parseJsonStrict<T>(raw: string, label: string, emptyDefault: T): T {
  const trimmed = raw.trim();
  if (!trimmed) return emptyDefault;
  try {
    return JSON.parse(trimmed) as T;
  } catch (err) {
    throw new Error(
      `${label} の JSON が不正です: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
