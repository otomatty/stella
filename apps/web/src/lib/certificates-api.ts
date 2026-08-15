/**
 * 修了判定 / 成績台帳 / 修了証のデータアクセス層 (Issue #26 — Neon / Hono API)。
 *
 * 旧 security definer RPC を Hono API 経由に置き換えた。 判定・発行はサーバ側で行い、
 * クライアントはスコアや判定を改竄できない。 公開検証 (verify) は匿名で実行する。
 */

import type {
  CertificateRow,
  CertificateVerification,
  CourseCompletion,
  CourseGradebook,
  IssuedCertificate,
} from "@falcon/shared/cms/types";
import { apiFetch } from "@/lib/api-client";

/** 受講者本人の修了証一覧 (発行日降順)。 */
export async function listCertificatesForUser(_userId: string): Promise<CertificateRow[]> {
  const { rows } = await apiFetch<{ rows: CertificateRow[] }>("/api/certificates/mine");
  return rows ?? [];
}

/** 受講者本人の、 あるコースの達成状況を取得する。 */
export async function fetchMyCourseCompletion(courseId: string): Promise<CourseCompletion | null> {
  const { completion } = await apiFetch<{ completion: CourseCompletion | null }>(
    `/api/certificates/completion/${encodeURIComponent(courseId)}`,
  );
  return completion ?? null;
}

/** staff 向け: コースの成績台帳 (受講者 × 達成状況) を取得する。 */
export async function fetchCourseGradebook(courseId: string): Promise<CourseGradebook | null> {
  const { gradebook } = await apiFetch<{ gradebook: CourseGradebook | null }>(
    `/api/certificates/gradebook/${encodeURIComponent(courseId)}`,
  );
  return gradebook ?? null;
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
  const { certificate } = await apiFetch<{ certificate: IssuedCertificate }>(
    "/api/certificates/issue",
    { method: "POST", body: { courseId, userId } },
  );
  if (!certificate) throw new Error("発行結果が空でした");
  return certificate;
}

/** cert_code から真正性を検証する (匿名実行可能)。 */
export async function verifyCertificate(certCode: string): Promise<CertificateVerification | null> {
  const { verification } = await apiFetch<{
    verification: CertificateVerification | null;
  }>(`/api/certificates/verify/${encodeURIComponent(certCode)}`, {
    anonymous: true,
  });
  return verification ?? null;
}

/** 公開検証ページの共有 URL を組み立てる。 */
export function buildVerificationUrl(certCode: string): string {
  if (typeof window === "undefined") return `?cert=${encodeURIComponent(certCode)}`;
  return `${window.location.origin}/?cert=${encodeURIComponent(certCode)}`;
}
