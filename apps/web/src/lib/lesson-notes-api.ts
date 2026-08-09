/**
 * レッスンノートのサーバ保存 (Issue #78 — `/api/lesson-notes`)。
 *
 * 認可はサーバ側 (アプリ層) で本人のみに限定される。 バックエンド未設定時は
 * 呼び出し側 (`useLessonNote`) が localStorage だけで動くため、 ここは呼ばれない。
 */

import { apiFetch } from '@/lib/api-client';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * DB の lesson_id は CMS の uuid を指す。 fixtures フォールバック時の
 * 非 uuid id をサーバに書かないよう、 同期対象を uuid 形式に限定する。
 */
export function isSyncableLessonId(lessonId: string): boolean {
  return UUID_RE.test(lessonId);
}

export interface LessonNoteRow {
  lesson_id: string;
  body: string;
  /** ISO8601 */
  updated_at: string;
}

/** 本人の当該レッスンのノート。 未保存なら null。 */
export async function fetchLessonNote(
  lessonId: string,
): Promise<LessonNoteRow | null> {
  const { rows } = await apiFetch<{ rows: LessonNoteRow[] }>(
    `/api/lesson-notes?lessonId=${encodeURIComponent(lessonId)}`,
  );
  return rows?.[0] ?? null;
}

/**
 * ノートを upsert し、 サーバ側で確定した行を返す。
 *
 * サーバは conflict 時に payload の updated_at が既存より新しい場合のみ更新する
 * (端末間 Last-Write-Wins) ため、 返る行が送った本文と異なることがある。
 */
export async function saveLessonNote(
  lessonId: string,
  body: string,
  updatedAt: string,
): Promise<LessonNoteRow | null> {
  const res = await apiFetch<{ rows: LessonNoteRow[] }>('/api/lesson-notes', {
    method: 'POST',
    body: { lesson_id: lessonId, body, updated_at: updatedAt },
  });
  return res.rows?.find((r) => r.lesson_id === lessonId) ?? null;
}
