/**
 * 講師添削ワークフロー (P3 / Issue #8) の共有型。
 * ランタイム依存なし — web / api の両方から import 可能。
 */

export type ReviewPriority = "high" | "normal" | "low";

export type SubmissionStatus = "pending" | "passed" | "resubmit" | "failed";

export type ReviewVerdict = "pass" | "resubmit" | "fail";

export type SuggestionSeverity = "high" | "med" | "low";

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
  /** UI アバター色 (c1–c6) */
  avatarTone: string;
  courseTitle: string;
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
}

export interface ReviewDraftRequest {
  assignmentTitle: string;
  courseTitle?: string;
  code: string;
  language?: "js" | "sql";
}

export interface ReviewDraftResponse {
  suggestions: ReviewSuggestion[];
  rubric: RubricCriterion[];
  notes: string;
}
