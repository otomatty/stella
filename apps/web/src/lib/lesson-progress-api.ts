/**
 * レッスン進捗の Supabase 永続化 (Issue #21 — P0 DB 連携)。
 *
 * RLS: 受講者は自分の進捗のみ read/write。 講師・管理者は同テナントを read。
 *
 * `lesson-progress.ts` (フレームワーク非依存の localStorage ストア) から
 * 動的 import される。 Supabase 未設定時はそもそも呼ばれない。
 */

import type { LessonProgressEntry } from "@/lib/lesson-progress";
import { getSupabase } from "@/lib/supabase";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function entryToRow(
  userId: string,
  tenantId: string,
  lessonId: string,
  entry: LessonProgressEntry,
): LessonProgressRow & { tenant_id: string } {
  return {
    user_id: userId,
    tenant_id: tenantId,
    lesson_id: lessonId,
    completed: entry.completed,
    last_page: entry.lastPage ?? null,
    viewed_pages: entry.viewedPages ?? [],
    watched_sec: entry.watchedSec ?? null,
    updated_at: entry.updatedAt,
  };
}

const SELECT_COLS =
  "user_id, lesson_id, completed, last_page, viewed_pages, watched_sec, updated_at";

/** 受講者本人の全進捗を取得し lessonId → entry の map にして返す。 */
export async function fetchProgressForUser(
  userId: string,
): Promise<Record<string, LessonProgressEntry>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("lesson_progress")
    .select(SELECT_COLS)
    .eq("user_id", userId);
  if (error) throw error;
  const map: Record<string, LessonProgressEntry> = {};
  for (const row of (data ?? []) as LessonProgressRow[]) {
    map[row.lesson_id] = rowToEntry(row);
  }
  return map;
}

/**
 * 複数エントリを 1 リクエストで upsert する (uuid 形式の lesson_id のみ)。
 *
 * 単純な `.upsert()` は別端末が後から書いた新しい行を古い payload で上書きし得る。
 * `upsert_lesson_progress` RPC は conflict 時に payload の updated_at が既存より
 * 新しい場合のみ更新するため、 書き込み側でも端末間 Last-Write-Wins を担保する。
 */
export async function upsertProgressBatch(
  userId: string,
  tenantId: string,
  entries: Array<{ lessonId: string; entry: LessonProgressEntry }>,
): Promise<void> {
  const rows = entries
    .filter(({ lessonId }) => isSyncableLessonId(lessonId))
    .map(({ lessonId, entry }) => entryToRow(userId, tenantId, lessonId, entry));
  if (rows.length === 0) return;
  const supabase = getSupabase();
  const { error } = await supabase.rpc("upsert_lesson_progress", {
    p_rows: rows,
  });
  if (error) throw error;
}

/**
 * 講師 / 管理者向け: 同テナントの進捗行を取得する (可視化のデータ経路)。
 * RLS により instructor/admin のみ tenant 全件を read 可能。
 */
export async function fetchProgressForTenant(): Promise<
  Array<{ userId: string; lessonId: string; entry: LessonProgressEntry }>
> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("lesson_progress")
    .select(SELECT_COLS);
  if (error) throw error;
  return ((data ?? []) as LessonProgressRow[]).map((row) => ({
    userId: row.user_id,
    lessonId: row.lesson_id,
    entry: rowToEntry(row),
  }));
}
