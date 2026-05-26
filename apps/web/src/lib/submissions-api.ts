/**
 * 提出物の Supabase 永続化 (Issue #8 — P3 DB 連携)。
 *
 * RLS: 受講者は自分の提出のみ insert/select。 講師・管理者はテナント内を select/update。
 */

import type {
  ReviewSuggestion,
  RubricCriterion,
  ReviewVerdict,
  Submission,
  SubmissionStatus,
  ReviewPriority,
  ReviewAvatarTone,
} from "@falcon/shared/review/types";
import { getSupabase } from "./supabase";
import { getSession } from "./auth";

const AVATAR_TONES: ReviewAvatarTone[] = [
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** DB に永続化する insert フィールドのみ */
export type InsertSubmissionInput = Pick<
  Submission,
  | "courseTitle"
  | "sectionTitle"
  | "assignmentTitle"
  | "lessonId"
  | "assignmentId"
  | "codeLines"
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
>;

interface SubmissionRow {
  id: string;
  tenant_id: string;
  student_id: string | null;
  lesson_id: string | null;
  assignment_id: string | null;
  course_title: string;
  section_title: string | null;
  assignment_title: string;
  code: string;
  status: SubmissionStatus;
  priority: ReviewPriority;
  attempt: number;
  ai_ready: boolean;
  ai_suggestions: ReviewSuggestion[];
  rubric: RubricCriterion[];
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
  return AVATAR_TONES[h]!;
}

function rowToSubmission(row: SubmissionRow): Submission {
  const profile = row.profiles;
  const name = profile?.display_name ?? "受講者";
  const initials =
    profile?.initials ?? (name.slice(0, 2).toUpperCase() || "??");
  return {
    id: row.id,
    tenantId: row.tenant_id,
    studentName: name,
    studentInitials: initials,
    avatarTone: toneFromStudentId(row.student_id),
    courseTitle: row.course_title,
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
  };
}

function submissionToInsert(
  tenantId: string,
  studentId: string,
  input: InsertSubmissionInput,
) {
  return {
    tenant_id: tenantId,
    student_id: studentId,
    lesson_id:
      input.lessonId && UUID_RE.test(input.lessonId) ? input.lessonId : null,
    assignment_id: input.assignmentId ?? null,
    course_title: input.courseTitle,
    section_title: input.sectionTitle ?? null,
    assignment_title: input.assignmentTitle,
    code: input.codeLines.join("\n"),
    status: "pending" as const,
    priority: input.priority,
    attempt: input.attempt,
    ai_ready: false,
    ai_suggestions: [],
    rubric: [],
    review_notes: "",
    verdict: null,
  };
}

function patchToUpdate(patch: SubmissionPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.attempt !== undefined) row.attempt = patch.attempt;
  if (patch.aiReady !== undefined) row.ai_ready = patch.aiReady;
  if (patch.aiSuggestions !== undefined) {
    row.ai_suggestions = patch.aiSuggestions;
  }
  if (patch.rubric !== undefined) row.rubric = patch.rubric;
  if (patch.reviewNotes !== undefined) row.review_notes = patch.reviewNotes;
  if (patch.verdict !== undefined) row.verdict = patch.verdict;
  if (patch.codeLines !== undefined) row.code = patch.codeLines.join("\n");
  if (patch.status && patch.status !== "pending") {
    row.reviewed_at = new Date().toISOString();
  }
  return row;
}

const SELECT = "*, profiles!student_id(display_name, initials)";

export async function fetchSubmissionsForTenant(
  tenantId: string,
): Promise<Submission[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .select(SELECT)
    .eq("tenant_id", tenantId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as SubmissionRow[] | null) ?? []).map(rowToSubmission);
}

export async function insertSubmission(
  tenantId: string,
  input: InsertSubmissionInput,
): Promise<Submission> {
  const session = await getSession();
  if (!session) {
    throw new Error("ログインが必要です");
  }
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("submissions")
    .insert(submissionToInsert(tenantId, session.user.id, input))
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return rowToSubmission(data as SubmissionRow);
}

export async function patchSubmission(
  id: string,
  patch: SubmissionPatch,
): Promise<Submission> {
  const supabase = getSupabase();
  const row = patchToUpdate(patch);
  if (Object.keys(row).length === 0) {
    const { data, error } = await supabase
      .from("submissions")
      .select(SELECT)
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return rowToSubmission(data as SubmissionRow);
  }
  const { data, error } = await supabase
    .from("submissions")
    .update(row)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return rowToSubmission(data as SubmissionRow);
}
