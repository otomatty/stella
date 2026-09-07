/**
 * 学習アクティビティ (日別学習ログ) のデータアクセス層 (Issue #73)。
 *
 * 集計はサーバ側 (`/api/study-activity/mine`) で行い、 受講者は自分のログのみ参照できる。
 */

import type { StudyActivitySummary } from "@stella/shared/study/activity";

import { apiFetch } from "./api-client";

/** 受講者本人の直近 `days` 日の学習ログとストリークを取得する。 */
export async function getMyStudyActivity(
  days: number,
  signal?: AbortSignal,
): Promise<StudyActivitySummary | null> {
  const { activity } = await apiFetch<{ activity: StudyActivitySummary | null }>(
    `/api/study-activity/mine?days=${encodeURIComponent(String(days))}`,
    signal ? { signal } : {},
  );
  return activity ?? null;
}
