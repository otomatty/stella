/**
 * レッスン進捗の永続化 (Issue #21 — Neon / Hono API 連携)。
 *
 * 旧 BaaS 直アクセス (lesson_progress テーブル + upsert_lesson_progress RPC) を
 * Hono API (`/api/lesson-progress`) 経由に置き換えた。 認可はサーバ側 (アプリ層) で行う:
 *   - 受講者は自分の進捗のみ read/write
 *   - 講師 / 管理者は同テナントを read (`/api/lesson-progress/tenant`)
 *
 * `lesson-progress.ts` (フレームワーク非依存の localStorage ストア) から動的 import される。
 * バックエンド未設定時はそもそも呼ばれない。
 */

import type { StageClearedNotice } from "@stella/shared/cms/types";
import { MAX_PROGRESS_SYNC_ROWS } from "@stella/shared/study/progress-sync";

import type { LessonProgressEntry } from "@/lib/lesson-progress";
import { apiFetch } from "@/lib/api-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * DB の lesson_id は CMS の uuid を指す。 fixtures フォールバック時の
 * 非 uuid id をサーバに書かないよう、 同期対象を uuid 形式に限定する。
 */
export function isSyncableLessonId(lessonId: string): boolean {
  return UUID_RE.test(lessonId);
}

interface LessonProgressRow {
  user_id: string;
  lesson_id: string;
  completed: boolean;
  last_page: number | null;
  viewed_pages: number[] | null;
  watched_sec: number | null;
  updated_at: string;
}

function rowToEntry(row: LessonProgressRow): LessonProgressEntry {
  return {
    completed: row.completed,
    ...(row.last_page != null ? { lastPage: row.last_page } : {}),
    ...(Array.isArray(row.viewed_pages) ? { viewedPages: row.viewed_pages } : {}),
    ...(row.watched_sec != null ? { watchedSec: row.watched_sec } : {}),
    updatedAt: row.updated_at,
  };
}

/** 受講者本人の全進捗を取得し lessonId → entry の map にして返す。 */
export async function fetchProgressForUser(
  _userId: string,
): Promise<Record<string, LessonProgressEntry>> {
  const { rows } = await apiFetch<{ rows: LessonProgressRow[] }>("/api/lesson-progress");
  const map: Record<string, LessonProgressEntry> = {};
  for (const row of rows ?? []) {
    map[row.lesson_id] = rowToEntry(row);
  }
  return map;
}

/**
 * 複数エントリを upsert する (uuid 形式の lesson_id のみ)。
 *
 * サーバ側 upsert が conflict 時に payload の updated_at が既存より新しい場合のみ
 * 更新するため、 端末間 Last-Write-Wins を担保する。 tenant_id はサーバが caller の
 * テナントを使うため送らない。
 *
 * **サーバの受付上限 (`MAX_PROGRESS_SYNC_ROWS`) の単位に刻んで送る。** オフラインで
 * 溜めた分が上限を超えると、 1 リクエストにまとめる限り 400 を受けて同じ塊を再送し
 * 続け、 永遠に届かない。 行は LWW でべき等なので、 分割の途中で失敗して全体を
 * 再送しても壊れない。
 *
 * 完了行の同期でステージの修了条件が揃うと、 サーバが修了証を自動発行して
 * `cleared_stages` に載せてくる。 呼び出し側 (進捗ストアの flush) はこれを
 * クリアダイアログのイベントとして流す。
 */
export async function upsertProgressBatch(
  _userId: string,
  _tenantId: string,
  entries: Array<{ lessonId: string; entry: LessonProgressEntry }>,
): Promise<StageClearedNotice[]> {
  const rows = entries
    .filter(({ lessonId }) => isSyncableLessonId(lessonId))
    .map(({ lessonId, entry }) => ({
      lesson_id: lessonId,
      completed: entry.completed,
      last_page: entry.lastPage ?? null,
      viewed_pages: entry.viewedPages ?? [],
      watched_sec: entry.watchedSec ?? null,
      updated_at: entry.updatedAt,
    }));
  const cleared: StageClearedNotice[] = [];
  for (let i = 0; i < rows.length; i += MAX_PROGRESS_SYNC_ROWS) {
    const res = await apiFetch<{ cleared_stages?: StageClearedNotice[] }>("/api/lesson-progress", {
      method: "POST",
      body: { rows: rows.slice(i, i + MAX_PROGRESS_SYNC_ROWS) },
    });
    cleared.push(...(res.cleared_stages ?? []));
  }
  return cleared;
}

/**
 * 講師 / 管理者向け: 同テナントの進捗行を取得する (可視化のデータ経路)。
 * 認可はサーバ側で instructor/admin に限定される。
 */
export async function fetchProgressForTenant(): Promise<
  Array<{ userId: string; lessonId: string; entry: LessonProgressEntry }>
> {
  const { rows } = await apiFetch<{ rows: LessonProgressRow[] }>("/api/lesson-progress/tenant");
  return (rows ?? []).map((row) => ({
    userId: row.user_id,
    lessonId: row.lesson_id,
    entry: rowToEntry(row),
  }));
}
