/**
 * 割当プリセットのデータアクセス層。
 *
 * 認可はサーバ側 (定義は admin 以上 / 参照・適用は staff)。 ここでは薄く HTTP を叩くだけで、
 * 期限計算や適用計画のような判断は `@falcon/shared/enrollment/preset` に置く。
 */

import type {
  EnrollmentPresetWithItems,
  PresetApplyResult,
  PresetConflictPolicy,
} from "@falcon/shared/enrollment/preset";
import { apiFetch } from "./api-client";

/** プリセット作成 / 更新の入力 (項目は常に全置換)。 */
export interface PresetPayload {
  name: string;
  description: string | null;
  items: { course_id: string; required: boolean; due_offset_days: number | null }[];
}

interface PresetMutationResponse {
  row: EnrollmentPresetWithItems;
  /** 未公開のまま含まれている教材。 保存は通るが呼び出し側で警告する。 */
  unpublished_course_ids: string[];
}

/** staff: 同テナントのプリセット一覧 (項目込み / 退役済みは除く)。 */
export async function listEnrollmentPresets(): Promise<EnrollmentPresetWithItems[]> {
  const { rows } = await apiFetch<{ rows: EnrollmentPresetWithItems[] }>("/api/enrollment-presets");
  return rows ?? [];
}

/** admin: プリセットを作成する。 */
export async function createEnrollmentPreset(
  payload: PresetPayload,
): Promise<PresetMutationResponse> {
  return apiFetch<PresetMutationResponse>("/api/enrollment-presets", {
    method: "POST",
    body: payload,
  });
}

/** admin: プリセットを更新する。 */
export async function updateEnrollmentPreset(
  id: string,
  payload: PresetPayload,
): Promise<PresetMutationResponse> {
  return apiFetch<PresetMutationResponse>(`/api/enrollment-presets/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

/** admin: プリセットを退役させる (論理削除)。 */
export async function deleteEnrollmentPreset(id: string): Promise<void> {
  await apiFetch<{ ok: true }>(`/api/enrollment-presets/${id}`, { method: "DELETE" });
}

export interface ApplyPresetInput {
  presetId: string;
  userIds: string[];
  /** 期限の基準日 (`YYYY-MM-DD`)。 利用者のローカル暦日を送る。 */
  baseDate: string;
  conflict: PresetConflictPolicy;
  /** true なら DB を触らず件数だけ返す (確認ダイアログのプレビュー)。 */
  dryRun?: boolean;
  /**
   * 画面が見ていたプリセットの版 (`updated_at`)。 サーバはこれが変わっていたら 409 を返す。
   *
   * 大人数への適用は分割送信になるため、 途中で他の管理者が編集すると前半と後半で
   * 内容が変わってしまう。 見積もり後に編集された場合も、 確認していない割当が通る。
   */
  expectedUpdatedAt: string;
}

/**
 * staff: プリセットを受講生へ適用する。
 *
 * プレビュー (`dryRun: true`) と本適用でサーバ側の同じ計画ロジックを通るため、
 * 「プレビューの件数と結果が違う」 が起きない。
 */
export async function applyEnrollmentPreset(input: ApplyPresetInput): Promise<PresetApplyResult> {
  const { presetId, ...body } = input;
  return apiFetch<PresetApplyResult>(`/api/enrollment-presets/${presetId}/apply`, {
    method: "POST",
    body,
  });
}

/** サーバ側の適用上限 (`/api/enrollment-presets/:id/apply`)。 これを超える指定は分割して送る。 */
const APPLY_MAX_USERS = 50;
const APPLY_MAX_PAIRS = 500;

export interface ChunkedApplyResult {
  dry_run: boolean;
  assigned: number;
  overwritten: number;
  skipped: number;
  /** 未公開のまま含まれている教材 (チャンク間で同じ値なので重複は除く)。 */
  unpublished_course_ids: string[];
  /** 失敗したリクエストのエラー (途中で失敗しても残りは続行する)。 */
  errors: string[];
}

/**
 * プリセット適用。 サーバの上限に収まるチャンクへ分けて順に送り、 件数を合算する。
 *
 * 受講登録画面は「表示中をすべて選択」で人数に上限がなく、 CSV 一括招待も 100 名を超えうる。
 * サーバは 1 リクエストあたり 受講生 50 名 / 組 500 までなので、 分割しないと大きなテナントでは
 * 400 になって適用そのものができない。 1 リクエストの組数は 受講生 × 教材 で決まるため、
 * 教材数に応じて受講生を刻む (`bulkAssignEnrollments` と同じ考え方)。
 *
 * `dryRun` を渡すと見積もりも同じ分割で行う。 プレビューと本適用でチャンクの切り方が
 * 揃うので、 表示した件数と実際の結果がずれない。
 * 途中で失敗しても残りは続け、 適用できた件数と失敗内容を返す。
 */
export async function applyEnrollmentPresetInChunks(input: {
  presetId: string;
  userIds: string[];
  baseDate: string;
  conflict: PresetConflictPolicy;
  /** プリセットに含まれる教材数。 1 リクエストの組数上限を守るために使う。 */
  itemCount: number;
  dryRun?: boolean;
  /** 全チャンクを同じ版に留めるためのプリセット `updated_at`。 */
  expectedUpdatedAt: string;
}): Promise<ChunkedApplyResult> {
  const usersPerChunk = Math.max(
    1,
    Math.min(APPLY_MAX_USERS, Math.floor(APPLY_MAX_PAIRS / Math.max(1, input.itemCount))),
  );
  const dryRun = input.dryRun === true;
  const result: ChunkedApplyResult = {
    dry_run: dryRun,
    assigned: 0,
    overwritten: 0,
    skipped: 0,
    unpublished_course_ids: [],
    errors: [],
  };
  const unpublished = new Set<string>();
  for (let i = 0; i < input.userIds.length; i += usersPerChunk) {
    const userIds = input.userIds.slice(i, i + usersPerChunk);
    try {
      const res = await applyEnrollmentPreset({
        presetId: input.presetId,
        userIds,
        baseDate: input.baseDate,
        conflict: input.conflict,
        expectedUpdatedAt: input.expectedUpdatedAt,
        ...(dryRun ? { dryRun: true } : {}),
      });
      result.assigned += res.assigned;
      result.overwritten += res.overwritten;
      result.skipped += res.skipped;
      for (const id of res.unpublished_course_ids) unpublished.add(id);
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : "unknown");
    }
  }
  result.unpublished_course_ids = [...unpublished];
  return result;
}
