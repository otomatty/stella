/**
 * 提出物の API 永続化 (Issue #8 — P3 DB 連携)。
 *
 * RLS: 受講者: insert + mine/本人 select。staff: テナント一覧/更新。
 */

import { parseGradingSummary } from "@stella/shared/review/grading-summary";
import type {
  GradingSummary,
  ReviewSuggestion,
  RubricCriterion,
  ReviewVerdict,
  Submission,
  SubmissionStatus,
  ReviewPriority,
  ReviewAvatarTone,
} from "@stella/shared/review/types";
import { apiFetch } from "./api-client";

const AVATAR_TONES: ReviewAvatarTone[] = ["c1", "c2", "c3", "c4", "c5", "c6"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** DB に永続化する insert フィールドのみ */
export type InsertSubmissionInput = Pick<
  Submission,
  "stageTitle" | "sectionTitle" | "assignmentTitle" | "lessonId" | "assignmentId" | "codeLines"
> & {
  priority: ReviewPriority;
  attempt: number;
};

/** DB に永続化する patch フィールドのみ */
export type SubmissionPatch = Pick<
  Partial<Submission>,
  | "status"
  | "priority"
  | "attempt"
  | "aiReady"
  | "aiSuggestions"
  | "rubric"
  | "reviewNotes"
  | "verdict"
  | "codeLines"
> & {
  /**
   * 講師が読み込んだ時点の `submittedAt` (ms)。 その後に学習者が引き継ぎ直していれば
   * サーバが 409 を返す — 見えていないコードに添削を確定させないため (Issue #9)。
   */
  expectedSubmittedAt?: number;
};

interface SubmissionRow {
  id: string;
  tenant_id: string;
  student_id: string | null;
  lesson_id: string | null;
  assignment_id: string | null;
  stage_title: string;
  section_title: string | null;
  assignment_title: string;
  code: string;
  status: SubmissionStatus;
  priority: ReviewPriority;
  attempt: number;
  ai_ready: boolean;
  ai_suggestions: ReviewSuggestion[];
  rubric: RubricCriterion[];
  grading_summary?: GradingSummary | null;
  review_notes: string;
  verdict: ReviewVerdict | null;
  submitted_at: string;
  profiles?: { display_name: string; initials: string | null } | null;
}

function toneFromStudentId(studentId: string | null): ReviewAvatarTone {
  if (!studentId) return "c1";
  let h = 0;
  for (let i = 0; i < studentId.length; i++) {
    h = (h + studentId.charCodeAt(i)) % AVATAR_TONES.length;
  }
  return AVATAR_TONES[h] ?? "c1";
}

function rowToSubmission(row: SubmissionRow): Submission {
  const profile = row.profiles;
  const name = profile?.display_name ?? "受講者";
  const initials = profile?.initials ?? (name.slice(0, 2).toUpperCase() || "??");
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentName: name,
    studentInitials: initials,
    avatarTone: toneFromStudentId(row.student_id),
    stageTitle: row.stage_title,
    sectionTitle: row.section_title ?? undefined,
    assignmentTitle: row.assignment_title,
    lessonId: row.lesson_id ?? undefined,
    assignmentId: row.assignment_id ?? undefined,
    codeLines: row.code ? row.code.split("\n") : [],
    submittedAt: new Date(row.submitted_at).getTime(),
    status: row.status,
    priority: row.priority,
    attempt: row.attempt,
    aiReady: row.ai_ready,
    aiSuggestions: row.ai_suggestions ?? [],
    rubric: row.rubric ?? [],
    reviewNotes: row.review_notes ?? "",
    verdict: row.verdict,
    gradingSummary: parseGradingSummary(row.grading_summary),
  };
}

/** 受講者: 自分の提出一覧。 */
export async function fetchMySubmissions(): Promise<Submission[]> {
  const { rows } = await apiFetch<{ rows: SubmissionRow[] }>("/api/submissions/mine");
  return (rows ?? []).map(rowToSubmission);
}

/** 本人または staff: 提出 1 件。 */
export async function fetchSubmissionById(id: string): Promise<Submission> {
  const { row } = await apiFetch<{ row: SubmissionRow }>(
    `/api/submissions/${encodeURIComponent(id)}`,
  );
  return rowToSubmission(row);
}

/** staff: テナント内の提出物一覧 (新着順)。 認可はサーバ側 (instructor/admin)。 */
export async function fetchSubmissionsForTenant(_tenantId: string): Promise<Submission[]> {
  const { rows } = await apiFetch<{ rows: SubmissionRow[] }>("/api/submissions");
  return (rows ?? []).map(rowToSubmission);
}

/** 受講者: 自分の提出を作成する。 student / tenant はサーバが caller から確定する。 */
export async function insertSubmission(
  _tenantId: string,
  input: InsertSubmissionInput,
): Promise<Submission> {
  const { row } = await apiFetch<{ row: SubmissionRow }>("/api/submissions", {
    method: "POST",
    body: {
      lessonId: input.lessonId && UUID_RE.test(input.lessonId) ? input.lessonId : null,
      assignmentId: input.assignmentId ?? null,
      stageTitle: input.stageTitle,
      sectionTitle: input.sectionTitle ?? null,
      assignmentTitle: input.assignmentTitle,
      code: input.codeLines.join("\n"),
      priority: input.priority,
      attempt: input.attempt,
    },
  });
  return rowToSubmission(row);
}

/** staff: 提出物を更新する (添削)。 reviewed_at の打刻と通知はサーバ側で行う。 */
export async function patchSubmission(id: string, patch: SubmissionPatch): Promise<Submission> {
  const { row } = await apiFetch<{ row: SubmissionRow }>(
    `/api/submissions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: {
        ...(patch.expectedSubmittedAt !== undefined
          ? { expectedSubmittedAt: new Date(patch.expectedSubmittedAt).toISOString() }
          : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
        ...(patch.attempt !== undefined ? { attempt: patch.attempt } : {}),
        ...(patch.aiReady !== undefined ? { aiReady: patch.aiReady } : {}),
        ...(patch.aiSuggestions !== undefined ? { aiSuggestions: patch.aiSuggestions } : {}),
        ...(patch.rubric !== undefined ? { rubric: patch.rubric } : {}),
        ...(patch.reviewNotes !== undefined ? { reviewNotes: patch.reviewNotes } : {}),
        ...(patch.verdict !== undefined ? { verdict: patch.verdict } : {}),
        ...(patch.codeLines !== undefined ? { code: patch.codeLines.join("\n") } : {}),
      },
    },
  );
  return rowToSubmission(row);
}
