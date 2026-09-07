/**
 * 発見教材 (Discovery) のデータアクセス層 (Phase 4)。
 *
 * 受講者向け (受験) と staff 向け (レビュー) の両方をここに置く。呼べる相手は
 * サーバが決める (受講者に下書きは返らない) ので、画面側で出し分けを再実装しない。
 *
 * **受験票にも採点結果にも正答・解説は入っていない。** 画面は受け取った得点と合否を
 * そのまま出す (自前で答え合わせをしない)。
 */

import type { DiscoveryQuestion, DiscoveryReviewStatus } from "@stella/shared/discovery/types";

import { apiFetch } from "./api-client";

/** 受講者に配られる 1 問 (正答なし)。 */
export interface DiscoveryPaperQuestion {
  id: string;
  kind: "single" | "multiple";
  prompt: string;
  points: number;
  options: { id: string; label: string }[];
}

export interface DiscoveryPaper {
  id: string;
  stage_id: string;
  title: string;
  description: string;
  source: "ai";
  /** `heuristic` = 既存の確認テストから作った複製 (AI 生成ではない)。 */
  generator: "anthropic" | "heuristic";
  pass_score: number;
  questions: DiscoveryPaperQuestion[];
  history: {
    attempt_count: number;
    passed: boolean;
    last_score: number | null;
    last_max_score: number | null;
    last_attempt_at: string | null;
  };
}

export interface DiscoveryResult {
  id: string;
  title: string;
  score: number;
  max_score: number;
  percent: number;
  pass_score: number;
  passed: boolean;
  /** 記録に失敗したときだけ入る文言 (採点そのものは有効)。 */
  record_error?: string;
}

export interface DiscoveryAnswer {
  question_id: string;
  selected_option_ids: string[];
}

export async function getDiscovery(id: string): Promise<DiscoveryPaper> {
  const { discovery } = await apiFetch<{ discovery: DiscoveryPaper }>(
    `/api/discovery/${encodeURIComponent(id)}`,
  );
  return discovery;
}

export async function submitDiscovery(
  id: string,
  answers: DiscoveryAnswer[],
): Promise<DiscoveryResult> {
  const { result } = await apiFetch<{ result: DiscoveryResult }>(
    `/api/discovery/${encodeURIComponent(id)}`,
    { method: "POST", body: { answers } },
  );
  return result;
}

// ---------------------------------------------------------------
// staff (CMS)
// ---------------------------------------------------------------

/** つまずきの待ち行列の 1 行。**誰がつまずいたかは持たない** (共有ライブラリの設計)。 */
export interface DiscoveryRequestRow {
  id: string;
  stage_id: string;
  stage_title: string | null;
  topic: string;
  origin: "quiz_fail" | "submission_resubmit";
  created_at: string;
  /** この文脈から既に作られた教材の数 (0 = 未生成)。 */
  material_count: number;
}

/** レビュー対象の教材 (staff には正答つきで返る)。 */
export interface DiscoveryMaterialRow {
  id: string;
  stage_id: string;
  stage_title: string | null;
  title: string;
  description: string;
  questions: DiscoveryQuestion[];
  source: "ai";
  generator: "anthropic" | "heuristic";
  review_status: DiscoveryReviewStatus;
  unlock_condition: string;
  request_id: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface DiscoveryOverview {
  requests: DiscoveryRequestRow[];
  materials: DiscoveryMaterialRow[];
}

export async function getDiscoveryOverview(): Promise<DiscoveryOverview> {
  const data = await apiFetch<DiscoveryOverview>("/api/cms/discovery");
  return { requests: data.requests ?? [], materials: data.materials ?? [] };
}

/** 下書きを生成する (この時点で初めて AI を呼ぶ / 鍵が無ければ複製で作る)。 */
export async function generateDiscoveryDraft(requestId: string): Promise<DiscoveryMaterialRow> {
  const { material } = await apiFetch<{ material: DiscoveryMaterialRow }>(
    `/api/cms/discovery/requests/${encodeURIComponent(requestId)}/generate`,
    { method: "POST", body: {} },
  );
  return material;
}

export interface DiscoveryMaterialPatch {
  title?: string;
  description?: string;
  questions?: DiscoveryQuestion[];
  review_status?: DiscoveryReviewStatus;
}

export interface DiscoveryMaterialPatchResult {
  material: DiscoveryMaterialRow;
  /**
   * 本文 (題名 / 説明 / 設問) を変えたことで承認が外れたか。
   *
   * サーバは承認済み教材の中身が変わると `draft` へ落とす (再承認が要る)。画面は
   * これを見て「内容を変更したため再承認が必要です」と伝える — 黙って公開から
   * 外れると、講師は直したつもりの教材が受講者に届かなくなったことに気づけない。
   */
  approvalRevoked: boolean;
}

export async function patchDiscoveryMaterial(
  id: string,
  patch: DiscoveryMaterialPatch,
): Promise<DiscoveryMaterialPatchResult> {
  const data = await apiFetch<{ material: DiscoveryMaterialRow; approval_revoked?: boolean }>(
    `/api/cms/discovery/materials/${encodeURIComponent(id)}`,
    { method: "PATCH", body: patch },
  );
  return { material: data.material, approvalRevoked: data.approval_revoked === true };
}
