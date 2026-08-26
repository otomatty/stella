/**
 * CMS データアクセス層 (Neon / Hono API)。
 *
 * 旧 BaaS 直アクセス (RLS + reorder RPC + Storage アップロード) を Hono API
 * (`/api/cms/*`, `/api/materials/*`) 経由に置き換えた。 認可はサーバ側 (staff / 同テナント)。
 * 戻り値は DB 行 (snake_case) のままで、 マッパー (@falcon/shared/cms/types) は呼び出し側で適用する。
 */

import type {
  AssignmentRow,
  CourseMaterialRow,
  CourseRow,
  CourseStatus,
  CourseWithChildren,
  LessonMaterialRow,
  LessonMaterialVersionRow,
  LessonRow,
  LessonType,
  QuestionKind,
  QuizOptionRow,
  QuizQuestionRow,
  QuizRow,
  QuizWithQuestions,
  SectionRow,
} from "@falcon/shared/cms/types";
import { apiFetch } from "./api-client";

// ---------------------------------------------------------------
// Courses
// ---------------------------------------------------------------

export async function listCourses(_tenantId: string): Promise<CourseRow[]> {
  const { rows } = await apiFetch<{ rows: CourseRow[] }>("/api/cms/courses");
  return rows ?? [];
}

export async function getCourseWithChildren(courseId: string): Promise<CourseWithChildren | null> {
  const { course } = await apiFetch<{ course: CourseWithChildren | null }>(
    `/api/cms/courses/${encodeURIComponent(courseId)}`,
  );
  return course ?? null;
}

export interface UpsertCourseInput {
  id?: string;
  tenant_id: string;
  slug: string;
  title: string;
  category?: string | null;
  color?: "indigo" | "green" | "amber" | "slate" | null;
  /** サムネイル画像の R2 パス。 正本は教材リポジトリの seed。 */
  thumbnail_path?: string | null;
  duration_hours?: number | null;
  description?: string | null;
  instructor_name?: string | null;
  status?: CourseStatus;
  require_all_lessons?: boolean;
  require_quiz_pass?: boolean;
  require_assignment_pass?: boolean;
  auto_issue_certificate?: boolean;
}

export async function upsertCourse(input: UpsertCourseInput): Promise<CourseRow> {
  const { row } = await apiFetch<{ row: CourseRow }>("/api/cms/courses", {
    method: "POST",
    body: input,
  });
  return row;
}

export async function setCourseStatus(id: string, status: CourseStatus): Promise<void> {
  await apiFetch(`/api/cms/courses/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export async function deleteCourse(id: string): Promise<void> {
  await apiFetch(`/api/cms/courses/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ---------------------------------------------------------------
// Sections
// ---------------------------------------------------------------

export interface UpsertSectionInput {
  id?: string;
  course_id: string;
  title: string;
  order?: number;
}

export async function upsertSection(input: UpsertSectionInput): Promise<SectionRow> {
  const { row } = await apiFetch<{ row: SectionRow }>("/api/cms/sections", {
    method: "POST",
    body: input,
  });
  return row;
}

export async function deleteSection(id: string): Promise<void> {
  await apiFetch(`/api/cms/sections/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function reorderSections(courseId: string, orderedIds: string[]): Promise<void> {
  await apiFetch("/api/cms/sections/reorder", {
    method: "POST",
    body: { courseId, orderedIds },
  });
}

// ---------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------

export interface UpsertLessonInput {
  id?: string;
  section_id: string;
  title: string;
  type: LessonType;
  order?: number;
  duration_label?: string | null;
  video_path?: string | null;
  pdf_path?: string | null;
  markdown?: string | null;
  assignment_id?: string | null;
  total_pages?: number | null;
  total_sec?: number | null;
}

export async function upsertLesson(input: UpsertLessonInput): Promise<LessonRow> {
  const { row } = await apiFetch<{ row: LessonRow }>("/api/cms/lessons", {
    method: "POST",
    body: input,
  });
  return row;
}

export async function deleteLesson(id: string): Promise<void> {
  await apiFetch(`/api/cms/lessons/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function reorderLessons(sectionId: string, orderedIds: string[]): Promise<void> {
  await apiFetch("/api/cms/lessons/reorder", {
    method: "POST",
    body: { sectionId, orderedIds },
  });
}

// ---------------------------------------------------------------
// Quiz (CMS 編集用 — staff のみ)
// ---------------------------------------------------------------

export async function getQuizByLesson(lessonId: string): Promise<QuizWithQuestions | null> {
  const { quiz } = await apiFetch<{ quiz: QuizWithQuestions | null }>(
    `/api/cms/quiz/by-lesson/${encodeURIComponent(lessonId)}`,
  );
  return quiz ?? null;
}

export async function ensureQuiz(lessonId: string): Promise<QuizRow> {
  const { row } = await apiFetch<{ row: QuizRow }>("/api/cms/quiz/ensure", {
    method: "POST",
    body: { lessonId },
  });
  return row;
}

export interface UpsertQuizInput {
  id: string;
  pass_score?: number;
  time_limit_sec?: number | null;
  max_attempts?: number | null;
}

export async function updateQuiz(input: UpsertQuizInput): Promise<QuizRow> {
  const { id, ...patch } = input;
  const { row } = await apiFetch<{ row: QuizRow }>(`/api/cms/quiz/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
  return row;
}

export interface UpsertQuizQuestionInput {
  id?: string;
  quiz_id: string;
  kind: QuestionKind;
  prompt: string;
  explanation?: string | null;
  points?: number;
  order?: number;
}

export async function upsertQuizQuestion(input: UpsertQuizQuestionInput): Promise<QuizQuestionRow> {
  const { row } = await apiFetch<{ row: QuizQuestionRow }>("/api/cms/quiz-questions", {
    method: "POST",
    body: input,
  });
  return row;
}

export async function deleteQuizQuestion(id: string): Promise<void> {
  await apiFetch(`/api/cms/quiz-questions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export interface UpsertQuizOptionInput {
  id?: string;
  question_id: string;
  label: string;
  is_correct?: boolean;
  order?: number;
}

export async function upsertQuizOption(input: UpsertQuizOptionInput): Promise<QuizOptionRow> {
  const { row } = await apiFetch<{ row: QuizOptionRow }>("/api/cms/quiz-options", {
    method: "POST",
    body: input,
  });
  return row;
}

export async function deleteQuizOption(id: string): Promise<void> {
  await apiFetch(`/api/cms/quiz-options/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------

export async function listAssignments(_tenantId: string): Promise<AssignmentRow[]> {
  const { rows } = await apiFetch<{ rows: AssignmentRow[] }>("/api/cms/assignments");
  return rows ?? [];
}

export async function getAssignmentRow(id: string): Promise<AssignmentRow | null> {
  const { row } = await apiFetch<{ row: AssignmentRow | null }>(
    `/api/cms/assignments/${encodeURIComponent(id)}`,
  );
  return row ?? null;
}

export type UpsertAssignmentInput = Omit<
  AssignmentRow,
  "created_at" | "updated_at" | "created_by"
> & { created_by?: string | null };

export async function upsertAssignment(input: UpsertAssignmentInput): Promise<AssignmentRow> {
  const { row } = await apiFetch<{ row: AssignmentRow }>("/api/cms/assignments", {
    method: "POST",
    body: input,
  });
  return row;
}

export async function deleteAssignment(id: string): Promise<void> {
  await apiFetch(`/api/cms/assignments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------
// Storage upload (Neon File Storage 経由)
// ---------------------------------------------------------------

export interface UploadMaterialResult {
  path: string;
}

export async function uploadMaterial(file: File, path: string): Promise<UploadMaterialResult> {
  const { getAccessToken } = await import("./auth-client");
  const serverUrl = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");
  const token = getAccessToken();
  const form = new FormData();
  form.append("path", path);
  form.append("file", file);
  const res = await fetch(`${serverUrl}/api/materials/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `アップロードに失敗しました (${res.status})`;
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* noop */
    }
    throw new Error(message);
  }
  return (await res.json()) as UploadMaterialResult;
}

// ---------------------------------------------------------------
// レッスン配布資料 (Issue #72)
// ---------------------------------------------------------------

/** レッスンに紐づく配布資料一覧。 受講者は同テナントの published コースのみ返る。 */
export async function listLessonMaterials(lessonId: string): Promise<LessonMaterialRow[]> {
  const { rows } = await apiFetch<{ rows: LessonMaterialRow[] }>(
    `/api/materials?lessonId=${encodeURIComponent(lessonId)}`,
  );
  return rows ?? [];
}

/**
 * コース全体の配布資料一覧 (Issue #77 — コース詳細「教材をダウンロード」)。
 * セクション → レッスン → 登録順に並んだ状態で返る。
 */
export async function listCourseMaterials(courseId: string): Promise<CourseMaterialRow[]> {
  const { rows } = await apiFetch<{ rows: CourseMaterialRow[] }>(
    `/api/materials?courseId=${encodeURIComponent(courseId)}`,
  );
  return rows ?? [];
}

/**
 * 配布資料をアップロードしてレッスンに紐付ける (staff のみ)。
 * 保存先パスはサーバ側で組み立てられる。
 */
export async function uploadLessonMaterial(
  file: File,
  lessonId: string,
): Promise<LessonMaterialRow> {
  const { getAccessToken } = await import("./auth-client");
  const serverUrl = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");
  const token = getAccessToken();
  const form = new FormData();
  form.append("lessonId", lessonId);
  form.append("file", file);
  const res = await fetch(`${serverUrl}/api/materials/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `アップロードに失敗しました (${res.status})`;
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* noop */
    }
    throw new Error(message);
  }
  const { row } = (await res.json()) as { row: LessonMaterialRow };
  return row;
}

/** 配布資料を削除する (staff のみ)。 R2 オブジェクトも削除される。 */
export async function deleteLessonMaterial(id: string): Promise<void> {
  await apiFetch(`/api/materials/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * 自動生成資料の版履歴 (staff のみ)。新しい版が先頭。
 */
export async function listLessonMaterialVersions(
  materialId: string,
): Promise<LessonMaterialVersionRow[]> {
  const { rows } = await apiFetch<{ rows: LessonMaterialVersionRow[] }>(
    `/api/materials/${encodeURIComponent(materialId)}/versions`,
  );
  return rows ?? [];
}

/** プロキシ経由 (要 Authorization) のダウンロード。 fetch → Blob → a[download] で保存させる。 */
async function downloadViaProxy(apiPath: string, fileName: string): Promise<void> {
  const { getAccessToken } = await import("./auth-client");
  const serverUrl = (import.meta.env.VITE_SERVER_URL ?? "").replace(/\/+$/, "");
  const token = getAccessToken();
  const res = await fetch(`${serverUrl}${apiPath}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `ダウンロードに失敗しました (${res.status})`;
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* noop */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 配布資料をダウンロードする。 */
export async function downloadLessonMaterial(
  material: Pick<LessonMaterialRow, "id" | "file_name">,
): Promise<void> {
  await downloadViaProxy(
    `/api/materials/${encodeURIComponent(material.id)}/download`,
    material.file_name,
  );
}

/** 自動生成資料の指定版をダウンロードする (staff のみ)。ファイル名に版番号を付ける。 */
export async function downloadLessonMaterialVersion(
  material: Pick<LessonMaterialRow, "id" | "file_name">,
  version: number,
): Promise<void> {
  const versionedName = material.file_name.replace(/(\.[^.]+)?$/, ` (v${version})$1`);
  await downloadViaProxy(
    `/api/materials/${encodeURIComponent(material.id)}/versions/${version}/download`,
    versionedName,
  );
}

/** UI から呼ぶ前にパスをサニタイズする (邦字を許容しつつ衝突を避ける)。 */
export function buildMaterialPath(args: {
  tenantId: string;
  courseId: string;
  fileName: string;
}): string {
  const safe = args.fileName.replace(/[^\p{L}\p{N}.-]+/gu, "_");
  const uniq =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `tenant/${args.tenantId}/courses/${args.courseId}/${uniq}-${safe}`;
}
