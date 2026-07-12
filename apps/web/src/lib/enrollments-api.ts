/**
 * 受講登録 (Enrollment) のデータアクセス層 (Issue #20 — Neon / Hono API)。
 *
 * 旧 BaaS 直アクセス (RLS 配下) を Hono API 経由に置き換えた。 認可はサーバ側:
 *   - 受講者は自分の enrollment のみ read (`/api/enrollments/mine`)
 *   - instructor/admin は同テナントを read/write
 */

import type { EnrollmentRow, EnrollmentStatus } from "@falcon/shared/cms/types";
import { apiFetch } from "./api-client";

/** 受講者本人の enrollment 一覧 (登録日昇順)。 userId はサーバが caller から解決する。 */
export async function listEnrollmentsForUser(
  _userId: string,
): Promise<EnrollmentRow[]> {
  const { rows } = await apiFetch<{ rows: EnrollmentRow[] }>(
    "/api/enrollments/mine",
  );
  return rows ?? [];
}

/** staff 向け: あるコースに割り当てられている受講者の enrollment 一覧。 */
export async function listEnrollmentsForCourse(
  courseId: string,
): Promise<EnrollmentRow[]> {
  const { rows } = await apiFetch<{ rows: EnrollmentRow[] }>(
    `/api/enrollments?courseId=${encodeURIComponent(courseId)}`,
  );
  return rows ?? [];
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
 * tenant_id / assigned_by はサーバが caller から決めるため送らない。
 */
export async function assignEnrollment(
  input: AssignEnrollmentInput,
): Promise<EnrollmentRow> {
  const { row } = await apiFetch<{ row: EnrollmentRow }>("/api/enrollments", {
    method: "POST",
    body: {
      userId: input.userId,
      courseId: input.courseId,
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
    },
  });
  if (!row) throw new Error("Empty result");
  return row;
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
  await apiFetch(`/api/enrollments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

/** 割当を解除する。 */
export async function removeEnrollment(id: string): Promise<void> {
  await apiFetch(`/api/enrollments/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
