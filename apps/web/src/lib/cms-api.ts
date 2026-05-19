/**
 * CMS データアクセス層。 Supabase クライアントの薄いラッパ。
 *
 * - 戻り値は DB 行 (snake_case) のままで、 マッパー (@falcon/shared/cms/types) は呼び出し側で適用する
 * - 例外は Supabase エラーを `Error` でラップして throw する。 UI 側で toast 表示する想定
 * - すべてのテーブルが RLS 配下のため、 認証されていない呼び出しは empty result または PostgrestError を返す
 */

import type {
  AssignmentRow,
  CourseRow,
  CourseStatus,
  CourseWithChildren,
  LessonRow,
  LessonType,
  SectionRow,
} from "@falcon/shared/cms/types";
import { getSupabase } from "./supabase";

const MATERIALS_BUCKET = "materials-public";

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Empty result");
  return data;
}

// ---------------------------------------------------------------
// Courses
// ---------------------------------------------------------------

export async function listCourses(tenantId: string): Promise<CourseRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  return unwrap(data as CourseRow[] | null, error);
}

export async function getCourseWithChildren(
  courseId: string,
): Promise<CourseWithChildren | null> {
  const supabase = getSupabase();
  // Supabase の embedded resource 機能で 1 クエリにまとめる。
  const { data, error } = await supabase
    .from("courses")
    .select("*, sections(*, lessons(*))")
    .eq("id", courseId)
    .order("order", { foreignTable: "sections", ascending: true })
    .order("order", { foreignTable: "sections.lessons", ascending: true })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  type Nested = CourseRow & { sections: Array<SectionRow & { lessons: LessonRow[] }> };
  const nested = data as Nested;
  return {
    course: stripChildren(nested),
    sections: (nested.sections ?? []).map((s) => ({
      section: stripLessons(s),
      lessons: s.lessons ?? [],
    })),
  };
}

function stripChildren(row: CourseRow & { sections?: unknown }): CourseRow {
  const { sections: _sections, ...rest } = row as CourseRow & { sections?: unknown };
  void _sections;
  return rest as CourseRow;
}

function stripLessons(row: SectionRow & { lessons?: unknown }): SectionRow {
  const { lessons: _lessons, ...rest } = row as SectionRow & { lessons?: unknown };
  void _lessons;
  return rest as SectionRow;
}

export interface UpsertCourseInput {
  id?: string;
  tenant_id: string;
  slug: string;
  title: string;
  category?: string | null;
  color?: "indigo" | "green" | "amber" | "slate" | null;
  duration_hours?: number | null;
  description?: string | null;
  status?: CourseStatus;
}

export async function upsertCourse(input: UpsertCourseInput): Promise<CourseRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("courses")
    .upsert(input)
    .select("*")
    .single();
  return unwrap(data as CourseRow | null, error);
}

export async function setCourseStatus(
  id: string,
  status: CourseStatus,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("courses")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteCourse(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw new Error(error.message);
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

export async function upsertSection(
  input: UpsertSectionInput,
): Promise<SectionRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("sections")
    .upsert(input)
    .select("*")
    .single();
  return unwrap(data as SectionRow | null, error);
}

export async function deleteSection(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderSections(
  courseId: string,
  orderedIds: string[],
): Promise<void> {
  const supabase = getSupabase();
  // 親 course_id でもフィルタして、 他コースの section を巻き込まないようにする。
  await Promise.all(
    orderedIds.map(async (id, i) => {
      const { error } = await supabase
        .from("sections")
        .update({ order: i })
        .eq("id", id)
        .eq("course_id", courseId);
      if (error) throw new Error(error.message);
    }),
  );
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

export async function upsertLesson(
  input: UpsertLessonInput,
): Promise<LessonRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("lessons")
    .upsert(input)
    .select("*")
    .single();
  return unwrap(data as LessonRow | null, error);
}

export async function deleteLesson(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("lessons").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reorderLessons(
  sectionId: string,
  orderedIds: string[],
): Promise<void> {
  const supabase = getSupabase();
  await Promise.all(
    orderedIds.map(async (id, i) => {
      const { error } = await supabase
        .from("lessons")
        .update({ order: i })
        .eq("id", id)
        .eq("section_id", sectionId);
      if (error) throw new Error(error.message);
    }),
  );
}

// ---------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------

export async function listAssignments(
  tenantId: string,
): Promise<AssignmentRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  return unwrap(data as AssignmentRow[] | null, error);
}

export async function getAssignmentRow(
  id: string,
): Promise<AssignmentRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AssignmentRow | null) ?? null;
}

export type UpsertAssignmentInput = Omit<
  AssignmentRow,
  "created_at" | "updated_at" | "created_by"
> & { created_by?: string | null };

export async function upsertAssignment(
  input: UpsertAssignmentInput,
): Promise<AssignmentRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("assignments")
    .upsert(input)
    .select("*")
    .single();
  return unwrap(data as AssignmentRow | null, error);
}

export async function deleteAssignment(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------
// Storage upload
// ---------------------------------------------------------------

export interface UploadMaterialResult {
  path: string;
}

export async function uploadMaterial(
  file: File,
  path: string,
): Promise<UploadMaterialResult> {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(MATERIALS_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return { path };
}

/** UI から呼ぶ前にパスをサニタイズする (邦字・空白を許容しつつ衝突を避ける)。 */
export function buildMaterialPath(args: {
  tenantId: string;
  courseId: string;
  fileName: string;
}): string {
  // Unicode 文字 (邦字含む) と空白 / `.` / `-` を残す。 その他は `_` に置換。
  const safe = args.fileName.replace(/[^\p{L}\p{N}.\- ]+/gu, "_");
  const uniq =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `tenant/${args.tenantId}/courses/${args.courseId}/${uniq}-${safe}`;
}
