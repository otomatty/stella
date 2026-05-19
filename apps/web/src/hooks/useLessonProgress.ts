/**
 * `lesson-progress` ストアを React コンポーネントから扱うフック。
 *
 * - `useLessonProgressMap()`: 全エントリの map を購読 (サイドバー status 算出用)
 * - `useLessonProgress(lessonId)`: 単一レッスンのエントリ + 更新メソッド (ビューア用)
 *
 * 両方とも内部で `useSyncExternalStore` を使い、 ストア更新時に自動再レンダする。
 */

import { useCallback, useSyncExternalStore } from 'react';
import {
  loadMap,
  subscribe,
  recordPage as storeRecordPage,
  recordWatchTime as storeRecordWatchTime,
  markComplete as storeMarkComplete,
  type LessonProgressEntry,
  type LessonProgressMap,
} from '@/lib/lesson-progress';

export function useLessonProgressMap(): LessonProgressMap {
  return useSyncExternalStore(subscribe, loadMap, loadMap);
}

export interface UseLessonProgressResult {
  entry: LessonProgressEntry | undefined;
  recordPage: (page: number, totalPages: number) => void;
  recordWatchTime: (sec: number, totalSec: number) => void;
  markComplete: () => void;
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

  return { entry, recordPage, recordWatchTime, markComplete };
}
