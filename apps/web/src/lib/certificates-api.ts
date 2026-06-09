/**
 * 修了判定 / 成績台帳 / 修了証のデータアクセス層 (Issue #26)。
 *
 * 修了判定 (compute) と発行 (issue) はすべて security definer RPC に集約されており、
 * クライアントは結果を受け取るだけ (スコアや判定を改竄できない)。
 *
 * - 達成状況   : get_my_course_completion (本人) / get_course_gradebook (staff)
 * - 発行       : issue_certificate (本人 or 講師承認)
 * - 一覧       : certificates テーブルを RLS 配下で read
 * - 公開検証   : verify_certificate (匿名実行可能 — getSupabase はキー必須だが
 *               publishable key は anon ロールなので未ログインでも実行できる)
 */

import type {
  CertificateRow,
  CertificateVerification,
  CourseCompletion,
  CourseGradebook,
  IssuedCertificate,
} from "@falcon/shared/cms/types";
import { getSupabase } from "@/lib/supabase";

const CERT_COLS =
  "id, tenant_id, user_id, course_id, cert_code, issued_by, issued_at, criteria_snapshot, recipient_name, course_title, tenant_name, revoked";

/** 受講者本人の修了証一覧 (発行日降順)。 */
export async function listCertificatesForUser(
  userId: string,
): Promise<CertificateRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("certificates")
    .select(CERT_COLS)
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as CertificateRow[] | null) ?? [];
}

/** 受講者本人の、 あるコースの達成状況を取得する。 */
export async function fetchMyCourseCompletion(
  courseId: string,
): Promise<CourseCompletion | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_my_course_completion", {
    p_course_id: courseId,
  });
  if (error) throw new Error(error.message);
  return (data as CourseCompletion | null) ?? null;
}

/** staff 向け: コースの成績台帳 (受講者 × 達成状況) を取得する。 */
export async function fetchCourseGradebook(
  courseId: string,
): Promise<CourseGradebook | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_course_gradebook", {
    p_course_id: courseId,
  });
  if (error) throw new Error(error.message);
  return (data as CourseGradebook | null) ?? null;
}

/**
 * 修了証を発行する (基準達成が前提)。
 * 受講者本人は自分の userId、 staff は対象受講者の userId を指定して承認発行できる。
 * 既発行ならべき等に既存の修了証を返す (already_existed=true)。
 */
export async function issueCertificate(
  courseId: string,
  userId: string,
): Promise<IssuedCertificate> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("issue_certificate", {
    p_user_id: userId,
    p_course_id: courseId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("発行結果が空でした");
  return data as IssuedCertificate;
}

/** cert_code から真正性を検証する (匿名実行可能)。 */
export async function verifyCertificate(
  certCode: string,
): Promise<CertificateVerification | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("verify_certificate", {
    p_cert_code: certCode,
  });
  if (error) throw new Error(error.message);
  return (data as CertificateVerification | null) ?? null;
}

/** 公開検証ページの共有 URL を組み立てる。 */
export function buildVerificationUrl(certCode: string): string {
  if (typeof window === "undefined") return `?cert=${encodeURIComponent(certCode)}`;
  return `${window.location.origin}/?cert=${encodeURIComponent(certCode)}`;
}
