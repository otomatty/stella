/**
 * 受講登録 (Enrollment) のデータアクセス層 (Issue #20 — Neon / Hono API)。
 *
 * 旧 BaaS 直アクセス (RLS 配下) を Hono API 経由に置き換えた。 認可はサーバ側:
 *   - 受講者は自分の enrollment のみ read (`/api/enrollments/mine`)
 *   - instructor/admin は同テナントを read
 *
 * **登録を作る書き込みは持たない** (Phase 3b)。 登録が生まれるのは受講者の自己開始
 * (`lib/skill-map-api.ts` の `startStage`) だけで、 管理画面から割り当てることはできない。
 *
 * 一方で **始まったあとの後始末は staff の仕事として残る** — 期限の設定 / 完了の手直し
 * (`updateEnrollment`) と、 誤って始めた登録の解除 (`deleteEnrollment`)。 どちらも
 * 「受講状況」 画面の行メニューから呼ぶ。
 */

import type {
  EnrollmentRow,
  EnrollmentStatus,
  EnrollmentSummaryRow,
} from "@falcon/shared/cms/types";
import { apiFetch } from "./api-client";
import { todayDateKey } from "./date-keys";

/** 受講者本人の enrollment 一覧 (登録日昇順)。 userId はサーバが caller から解決する。 */
export async function listEnrollmentsForUser(_userId: string): Promise<EnrollmentRow[]> {
  const { rows } = await apiFetch<{ rows: EnrollmentRow[] }>("/api/enrollments/mine");
  return rows ?? [];
}

/** staff 向け: enrollment 一覧 (テナントはサーバが caller から解決する)。 */
async function listEnrollments(filter: {
  stageId?: string;
  userIds?: string[];
}): Promise<EnrollmentRow[]> {
  const params = new URLSearchParams();
  if (filter.stageId) params.set("stageId", filter.stageId);
  if (filter.userIds?.length) params.set("userIds", filter.userIds.join(","));
  const { rows } = await apiFetch<{ rows: EnrollmentRow[] }>(
    `/api/enrollments?${params.toString()}`,
  );
  return rows ?? [];
}

/** staff 向け: あるステージに割り当てられている受講者の enrollment 一覧。 */
export async function listEnrollmentsForStage(stageId: string): Promise<EnrollmentRow[]> {
  return listEnrollments({ stageId });
}

/** サーバ側の `userIds` 上限に合わせたチャンクサイズ。 */
const USER_ID_CHUNK = 50;

/**
 * staff 向け: 指定した受講者たちの enrollment 一覧。
 *
 * 受講登録 UI は「受講生 → 教材」の順で選ぶため、 選択中の受講者ぶんだけ取れば足りる。
 * 上限を超える人数 (CSV 出力など) は分割して問い合わせる。
 */
export async function listEnrollmentsForUsers(userIds: string[]): Promise<EnrollmentRow[]> {
  if (userIds.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += USER_ID_CHUNK) {
    chunks.push(userIds.slice(i, i + USER_ID_CHUNK));
  }
  // 選択人数や CSV 出力の対象が多いとチャンク数も増えるため、 同時実行数を絞る。
  const results = await mapWithConcurrency(chunks, (ids) => listEnrollments({ userIds: ids }));
  return results.flat();
}

/**
 * staff 向け: 受講者ごとの割当件数サマリ (一覧のバッジ用)。
 *
 * 期限超過の判定基準となる 「今日」 は利用者のローカル暦日を送る。 サーバ (UTC) の日付で
 * 判定すると、 JST など UTC 以外では画面側の判定と日付の変わり目でずれるため。
 */
export async function listEnrollmentSummaries(): Promise<EnrollmentSummaryRow[]> {
  const { rows } = await apiFetch<{ rows: EnrollmentSummaryRow[] }>(
    `/api/enrollments/summary?today=${todayDateKey()}`,
  );
  return rows ?? [];
}

/**
 * Phase 3b: 一括割当 / 一括解除のクライアントは削除した。
 *
 * サーバ側の `POST /api/enrollments/bulk` は 410 Gone (`routes/enrollments.ts`)。
 * 受講登録を作るのは受講者の自己開始 (`POST /api/stages/:id/start`) だけになったので、
 * 割当を組み立てる `bulkChunks` / `bulkAssignEnrollments` / `bulkRemoveEnrollments` も
 * ここには残していない。 個別の期限 / 状態の修正と解除は下の 2 つに残る。
 */

/** 同時に投げる読み取りリクエストの上限。 */
const READ_CONCURRENCY = 4;

/**
 * `items` を最大 `READ_CONCURRENCY` 並列で処理する。
 *
 * CSV 出力のように対象人数が多いと、 サーバ側の `userIds` 上限 (50 名) に合わせた
 * 分割リクエストが増える。 まとめて `Promise.all` に渡すとスロットリングを招くため、
 * 空いたワーカーから順に処理する (実行順は問わない)。
 */
async function mapWithConcurrency<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await fn(item);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(READ_CONCURRENCY, items.length) }, () => worker()),
  );
  return results;
}

export interface UpdateEnrollmentPatch {
  due_at?: string | null;
  required?: boolean;
  status?: EnrollmentStatus;
  completed_at?: string | null;
}

/** 既存 enrollment の期限 / 必須 / ステータスを更新する。 */
export async function updateEnrollment(id: string, patch: UpdateEnrollmentPatch): Promise<void> {
  await apiFetch(`/api/enrollments/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: patch,
  });
}

/**
 * 受講登録を解除する (行ごと消す)。
 *
 * 自己開始のモデルでも残す操作。 押し間違いで始めた星や、 退職者の整理のように
 * 「無かったことにする」 必要が運用に残るため。 進捗そのもの (lesson_progress /
 * 提出) は消えないので、 学び直しで始め直せば続きから見える。
 */
export async function deleteEnrollment(id: string): Promise<void> {
  await apiFetch(`/api/enrollments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * 割当プリセットの id → 名前 (受講状況のバッジ用)。
 *
 * プリセットの **適用** は Phase 3b で退役したが、 移行前に作られた登録は
 * `preset_id` で出自を指したまま残る。 名前を引かずに 「(削除済み)」 と出すと、
 * 生きている定義まで削除済みに見える (嘘になる) ので、 staff だけが開くこの画面では
 * 1 リクエストだけ払って実名を出す。 **失敗したらバッジを出さない** — 出自が読めない
 * ことと 「消えた」 ことは違う。
 */
export async function listEnrollmentPresetNames(): Promise<Map<string, string>> {
  const { rows } = await apiFetch<{ rows: { id: string; name: string }[] }>(
    // 退役済み (archived) の定義も名前は引ける。 昔の登録が指す先はたいてい退役済み。
    "/api/enrollment-presets?includeArchived=1",
  );
  return new Map((rows ?? []).map((row) => [row.id, row.name]));
}
