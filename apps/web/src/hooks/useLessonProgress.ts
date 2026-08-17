/**
 * `lesson-progress` ストアを React コンポーネントから扱うフック。
 *
 * - `useLessonProgressMap()`: 全エントリの map を購読 (サイドバー status 算出用)
 * - `useLessonProgress(lessonId)`: 単一レッスンのエントリ + 更新メソッド (ビューア用)
 *
 * 両方とも内部で `useSyncExternalStore` を使い、 ストア更新時に自動再レンダする。
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  loadMap,
  subscribe,
  isProgressReady,
  getEntry,
  recordPage as storeRecordPage,
  recordWatchTime as storeRecordWatchTime,
  markComplete as storeMarkComplete,
  markVisited as storeMarkVisited,
  type LessonProgressEntry,
  type LessonProgressMap,
} from "@/lib/lesson-progress";

export function useLessonProgressMap(): LessonProgressMap {
  return useSyncExternalStore(subscribe, loadMap, loadMap);
}

/**
 * サーバ進捗の取り込みが決着したか。
 *
 * ビューアは復元位置 (`lastPage` / `watchedSec`) をこれが true になってから読む。
 * 待たずに読むと、 ログイン直後は空のローカル進捗を「続き」と誤認して 1 ページ目から
 * 開き、 さらにその 1 ページ目をサーバへ push してしまう。
 */
export function useProgressReady(): boolean {
  return useSyncExternalStore(subscribe, isProgressReady, isProgressReady);
}

export interface UseLessonProgressResult {
  entry: LessonProgressEntry | undefined;
  recordPage: (page: number, totalPages: number) => void;
  recordWatchTime: (sec: number, totalSec: number) => void;
  markComplete: () => void;
  markVisited: () => void;
}

export function useLessonProgress(lessonId: string): UseLessonProgressResult {
  const map = useLessonProgressMap();
  const entry = map[lessonId];

  const recordPage = useCallback(
    (page: number, totalPages: number) => {
      storeRecordPage(lessonId, page, totalPages);
    },
    [lessonId],
  );
  const recordWatchTime = useCallback(
    (sec: number, totalSec: number) => {
      storeRecordWatchTime(lessonId, sec, totalSec);
    },
    [lessonId],
  );
  const markComplete = useCallback(() => {
    storeMarkComplete(lessonId);
  }, [lessonId]);
  const markVisited = useCallback(() => {
    storeMarkVisited(lessonId);
  }, [lessonId]);

  return { entry, recordPage, recordWatchTime, markComplete, markVisited };
}

/** 学習時間を積む間隔。 短くしても API 呼び出しが増えるだけなので 1 分刻みで足りる。 */
const STUDY_TICK_MS = 60_000;

/**
 * レッスンを開いている時間を `watched_sec` として積む (日別学習ログの原資)。
 *
 * サーバの日別ログは `watched_sec` の増分でしか学習時間を計上しないため、 これが無いと
 * 動画レッスンを持たないコース (TypeScript 入門研修はスライドとテキストだけ) の学習時間が
 * 常に 0 分になる。 動画は `VideoViewer` が再生位置を記録するので対象外にする。
 *
 * タブが隠れている間は数えない。 可視だった区間だけを足すので、 スリープや放置で
 * 実際より多く積み上がることはない。
 */
export function useStudyTime(lessonId: string, enabled: boolean): void {
  const ready = useProgressReady();

  useEffect(() => {
    if (!enabled || !ready || !lessonId) return;
    let accumulated = getEntry(lessonId)?.watchedSec ?? 0;
    let visibleSince = document.visibilityState === "visible" ? Date.now() : null;

    const flush = () => {
      if (visibleSince === null) return;
      const now = Date.now();
      accumulated += (now - visibleSince) / 1000;
      visibleSince = now;
      // totalSec に 0 を渡すと完了判定は走らない (滞在だけで完了させない)。
      storeRecordWatchTime(lessonId, accumulated, 0);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        visibleSince = Date.now();
      } else {
        flush();
        visibleSince = null;
      }
    };

    const timer = setInterval(flush, STUDY_TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [lessonId, enabled, ready]);
}
