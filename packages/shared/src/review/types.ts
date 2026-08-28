/**
 * 講師添削ワークフロー (P3 / Issue #8) の共有型。
 * ランタイム依存なし — web / api の両方から import 可能。
 */

export type ReviewPriority = "high" | "normal" | "low";

/** UI アバター色 (fixtures の AvatarTone と同値) */
export type ReviewAvatarTone = "c1" | "c2" | "c3" | "c4" | "c5" | "c6";

export type SubmissionStatus = "pending" | "passed" | "resubmit" | "failed";

export type ReviewVerdict = "pass" | "resubmit" | "fail";

export type SuggestionSeverity = "high" | "med" | "low";

/** AI 下書きに渡す課題言語。 `Assignment["language"]` を添削向けに丸めたもの。 */
export type ReviewDraftLanguage = "js" | "ts" | "sql" | "fe-pseudo";

/** 採点で落ちた lint 1 件 (提出に添付する最小形)。 */
export interface GradingSummaryLint {
  line: number;
  message: string;
  ruleId?: string;
}

/** 採点で落ちたテスト 1 件。 */
export interface GradingSummaryTest {
  name: string;
  error?: string;
}

/**
 * 学習者が講師へ引き継いだ時点の採点失敗サマリ (Issue #9)。
 *
 * VS Code 拡張の採点結果 (`ExecutionResult`) を、 ランタイム非依存の最小形に落としたもの。
 * D1 の `submissions.grading_summary` にそのまま JSON で載る。
 */
export interface GradingSummary {
  cleared: boolean;
  checks: { lint: boolean; ast: boolean; tests: boolean };
  language: ReviewDraftLanguage;
  /** 失敗した lint (error のみ / 上限あり)。 */
  lint: GradingSummaryLint[];
  /** AST チェックの不足・禁止・パースエラーを 1 行ずつ日本語化したもの。 */
  ast: string[];
  /** 失敗したテスト (上限あり)。 */
  failedTests: GradingSummaryTest[];
  passedTestCount: number;
  totalTestCount: number;
  /** ランナー自体のエラー (COMPILE_ERROR など)。 */
  errorMessage?: string;
}

export interface ReviewSuggestion {
  id: string;
  line: number;
  severity: SuggestionSeverity;
  category: string;
  body: string;
  /** null = 未判断, true = 採用, false = 却下 */
  adopted: boolean | null;
}

export interface RubricCriterion {
  id: string;
  name: string;
  desc: string;
  max: number;
  score: number;
}

export interface Submission {
  id: string;
  tenantId: string;
  studentName: string;
  studentInitials: string;
  avatarTone: ReviewAvatarTone;
  stageTitle: string;
  sectionTitle?: string;
  assignmentTitle: string;
  lessonId?: string;
  assignmentId?: string;
  /** 提出コード (表示用: 行配列) */
  codeLines: string[];
  submittedAt: number;
  status: SubmissionStatus;
  priority: ReviewPriority;
  attempt: number;
  /** AI 下書きが生成済みか */
  aiReady: boolean;
  aiSuggestions: ReviewSuggestion[];
  rubric: RubricCriterion[];
  reviewNotes: string;
  verdict: ReviewVerdict | null;
  /** VS Code から引き継がれた提出のみ持つ採点失敗サマリ。 Web 提出は null。 */
  gradingSummary?: GradingSummary | null;
}

export interface ReviewDraftRequest {
  assignmentTitle: string;
  stageTitle?: string;
  code: string;
  language?: ReviewDraftLanguage;
  /** 採点失敗サマリを整形したテキスト (あれば AI 下書きの材料にする)。 */
  gradingSummary?: string;
}

export interface ReviewDraftResponse {
  suggestions: ReviewSuggestion[];
  rubric: RubricCriterion[];
  notes: string;
}
