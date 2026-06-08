/**
 * 受講登録 (Enrollment) のデータアクセス層 (Issue #20)。
 *
 * RLS:
 *   - 受講者は自分の enrollment のみ read。
 *   - instructor/admin は同テナントを read/write (割当・解除・期限/必須の変更)。
 *
 * 割当は auth.users を触らないため、 user-management のような service-role API は不要で、
 * RLS 配下の Supabase クライアントから直接 write する。
 */

import type { EnrollmentRow, EnrollmentStatus } from "@falcon/shared/cms/types";
import { getSupabase } from "./supabase";

const SELECT_COLS =
  "id, tenant_id, user_id, course_id, assigned_by, due_at, required, status, enrolled_at, completed_at";

/** 受講者本人の enrollment 一覧 (登録日昇順)。 */
export async function listEnrollmentsForUser(
  userId: string,
): Promise<EnrollmentRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("enrollments")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as EnrollmentRow[] | null) ?? [];
}

/** staff 向け: あるコースに割り当てられている受講者の enrollment 一覧。 */
export async function listEnrollmentsForCourse(
  courseId: string,
): Promise<EnrollmentRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("enrollments")
    .select(SELECT_COLS)
    .eq("course_id", courseId)
    .order("enrolled_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as EnrollmentRow[] | null) ?? [];
}

export interface AssignEnrollmentInput {
  tenantId: string;
  userId: string;
  courseId: string;
  assignedBy?: string | null;
  dueAt?: string | null;
  required?: boolean;
}

/**
 * 受講者にコースを割り当てる (既存があれば期限/必須/割当者を更新)。
 * unique(user_id, course_id) 制約に対し upsert することで二重登録を防ぐ。
 */
export async function assignEnrollment(
  input: AssignEnrollmentInput,
): Promise<EnrollmentRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("enrollments")
    .upsert(
      {
        tenant_id: input.tenantId,
        user_id: input.userId,
        course_id: input.courseId,
        assigned_by: input.assignedBy ?? null,
        due_at: input.dueAt ?? null,
        required: input.required ?? true,
      },
      { onConflict: "user_id,course_id" },
    )
    .select(SELECT_COLS)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empty result");
  return data as EnrollmentRow;
}

export interface UpdateEnrollmentPatch {
  due_at?: string | null;
  required?: boolean;
  status?: EnrollmentStatus;
  completed_at?: string | null;
}

/** 既存 enrollment の期限 / 必須 / ステータスを更新する。 */
export async function updateEnrollment(
  id: string,
  patch: UpdateEnrollmentPatch,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("enrollments")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** 割当を解除する。 */
export async function removeEnrollment(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("enrollments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
