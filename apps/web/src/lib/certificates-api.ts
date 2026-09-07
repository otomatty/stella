/**
 * 修了判定 / 成績台帳 / 修了証のデータアクセス層 (Issue #26 — Neon / Hono API)。
 *
 * 旧 security definer RPC を Hono API 経由に置き換えた。 判定・発行はサーバ側で行い、
 * クライアントはスコアや判定を改竄できない。 公開検証 (verify) は匿名で実行する。
 */

import type {
  CertificateRow,
  CertificateVerification,
  StageClearedNotice,
  StageCompletion,
  StageGradebook,
  IssuedCertificate,
} from "@stella/shared/cms/types";
import { apiFetch } from "@/lib/api-client";
import { emitStageCleared, toStageClearedEvents } from "@/lib/stage-clear-events";

/**
 * 受講者本人の修了証一覧 (発行日降順)。
 * サーバ側で「修了条件は達成済みなのに未発行」のステージを自動発行してから返すため、
 * この取得自体がバックフィルを兼ねる。バックフィルで新しくクリアになったステージは
 * クリアイベントへ流す — 黙って埋めると、並走して取得した受講ステージ一覧やダッシュ
 * ボードだけが古いままになる (シェルがイベントで取り直す)。
 */
export async function listCertificatesForUser(_userId: string): Promise<CertificateRow[]> {
  const { rows, cleared_stages } = await apiFetch<{
    rows: CertificateRow[];
    cleared_stages?: StageClearedNotice[];
  }>("/api/certificates/mine");
  emitStageCleared(toStageClearedEvents(cleared_stages));
  return rows ?? [];
}

/** 受講者本人の、 あるステージの達成状況を取得する。 */
export async function fetchMyStageCompletion(stageId: string): Promise<StageCompletion | null> {
  const { completion } = await apiFetch<{ completion: StageCompletion | null }>(
    `/api/certificates/completion/${encodeURIComponent(stageId)}`,
  );
  return completion ?? null;
}

/** staff 向け: ステージの成績台帳 (受講者 × 達成状況) を取得する。 */
export async function fetchStageGradebook(stageId: string): Promise<StageGradebook | null> {
  const { gradebook } = await apiFetch<{ gradebook: StageGradebook | null }>(
    `/api/certificates/gradebook/${encodeURIComponent(stageId)}`,
  );
  return gradebook ?? null;
}

/**
 * 修了証を発行する (基準達成が前提・**staff 専用**)。
 * 受講者の手動発行は廃止 — 条件達成でサーバが自動発行する。ここに残るのは
 * Gradebook からの承認発行 (講師承認ステージ含む) だけ。
 * 既発行ならべき等に既存の修了証を返す (already_existed=true)。
 */
export async function issueCertificate(
  stageId: string,
  userId: string,
): Promise<IssuedCertificate> {
  const { certificate } = await apiFetch<{ certificate: IssuedCertificate }>(
    "/api/certificates/issue",
    { method: "POST", body: { stageId, userId } },
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
