/**
 * 受講登録 (Enrollment) のデータアクセス層 (Issue #20 — Neon / Hono API)。
 *
 * 旧 BaaS 直アクセス (RLS 配下) を Hono API 経由に置き換えた。 認可はサーバ側:
 *   - 受講者は自分の enrollment のみ read (`/api/enrollments/mine`)
 *   - instructor/admin は同テナントを read/write
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
  courseId?: string;
  userIds?: string[];
}): Promise<EnrollmentRow[]> {
  const params = new URLSearchParams();
  if (filter.courseId) params.set("courseId", filter.courseId);
  if (filter.userIds?.length) params.set("userIds", filter.userIds.join(","));
  const { rows } = await apiFetch<{ rows: EnrollmentRow[] }>(
    `/api/enrollments?${params.toString()}`,
  );
  return rows ?? [];
}

/** staff 向け: あるコースに割り当てられている受講者の enrollment 一覧。 */
export async function listEnrollmentsForCourse(courseId: string): Promise<EnrollmentRow[]> {
  return listEnrollments({ courseId });
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

/** サーバ側の一括 API の上限 (`/api/enrollments/bulk`)。 これを超える指定は分割して送る。 */
const BULK_MAX_USERS = 50;
const BULK_MAX_COURSES = 50;
const BULK_MAX_PAIRS = 500;

export interface BulkEnrollmentInput {
  userIds: string[];
  courseIds: string[];
  dueAt?: string | null;
  required?: boolean;
}

/** 受講者 × コースを、 サーバ上限に収まるリクエスト単位に分割する。 */
function bulkChunks(
  userIds: string[],
  courseIds: string[],
): Array<{ userIds: string[]; courseIds: string[] }> {
  const chunks: Array<{ userIds: string[]; courseIds: string[] }> = [];
  for (let ci = 0; ci < courseIds.length; ci += BULK_MAX_COURSES) {
    const courses = courseIds.slice(ci, ci + BULK_MAX_COURSES);
    // 1 リクエストの組数が上限を超えないよう、 コース数に応じて受講者を刻む。
    const usersPerChunk = Math.max(
      1,
      Math.min(BULK_MAX_USERS, Math.floor(BULK_MAX_PAIRS / courses.length)),
    );
    for (let ui = 0; ui < userIds.length; ui += usersPerChunk) {
      chunks.push({ userIds: userIds.slice(ui, ui + usersPerChunk), courseIds: courses });
    }
  }
  return chunks;
}

/** 同時に投げる一括リクエストの上限。 */
const BULK_CONCURRENCY = 4;

/**
 * `items` を最大 `BULK_CONCURRENCY` 並列で処理する。
 *
 * 一括割当は対象の組み合わせによってリクエスト数が増えるため、 まとめて `Promise.all` に
 * 渡すとスロットリングや部分適用を招く。 実行順は問わないので、 空いたワーカーから順に処理する。
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
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
    Array.from({ length: Math.min(BULK_CONCURRENCY, items.length) }, () => worker()),
  );
  return results;
}

export interface BulkEnrollmentResult {
  /** 実際に適用できた組数。 */
  applied: number;
  /** 失敗したリクエストのエラー (途中で失敗しても残りは続行する)。 */
  errors: string[];
}

/**
 * 受講者 × コースをまとめて割り当てる。
 *
 * 組み合わせごとに個別 POST を並べると数百〜千のリクエストが同時に飛ぶため、
 * サーバの一括 API へ上限内のチャンクを順に送る。 途中で失敗しても残りは続け、
 * 適用できた件数と失敗内容を返して呼び出し側で表示・再取得できるようにする。
 */
export async function bulkAssignEnrollments(
  input: BulkEnrollmentInput,
): Promise<BulkEnrollmentResult> {
  const chunks = bulkChunks(input.userIds, input.courseIds);
  let applied = 0;
  const errors: string[] = [];
  for (const chunk of chunks) {
    try {
      const { assigned } = await apiFetch<{ assigned: number }>("/api/enrollments/bulk", {
        method: "POST",
        body: {
          action: "assign",
          userIds: chunk.userIds,
          courseIds: chunk.courseIds,
          ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
          ...(input.required !== undefined ? { required: input.required } : {}),
        },
      });
      applied += assigned ?? 0;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "unknown");
    }
  }
  return { applied, errors };
}

/** 受講者 × コースの割当をまとめて解除する。 分割・部分失敗の扱いは割当と同じ。 */
export async function bulkRemoveEnrollments(input: {
  userIds: string[];
  courseIds: string[];
}): Promise<BulkEnrollmentResult> {
  const chunks = bulkChunks(input.userIds, input.courseIds);
  let applied = 0;
  const errors: string[] = [];
  for (const chunk of chunks) {
    try {
      const { removed } = await apiFetch<{ removed: number }>("/api/enrollments/bulk", {
        method: "POST",
        body: { action: "unassign", userIds: chunk.userIds, courseIds: chunk.courseIds },
      });
      applied += removed ?? 0;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "unknown");
    }
  }
  return { applied, errors };
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
