/**
 * レッスン視聴進捗のローカルストア。
 *
 * - 真実は localStorage の `lms_lesson_progress` (JSON)
 * - メモリ上にキャッシュを保持し、 書き込みは 1秒デバウンス
 * - `pagehide` 時に未フラッシュ分を即時保存 (タブクローズで失われないように)
 * - 完了判定: slides は閲覧ページ集合 / 動画は視聴秒数 が 90% 以上で auto complete
 * - 一度 `completed: true` になったレッスンは自動では取り消されない
 */

import type { Lesson, LessonStatus } from '@/data/types';

const STORAGE_KEY = 'lms_lesson_progress';
const COMPLETION_THRESHOLD = 0.9;
const DEBOUNCE_MS = 1000;

export interface LessonProgressEntry {
  completed: boolean;
  /** slides: 最終閲覧ページ (1-indexed) */
  lastPage?: number;
  /** slides: 既閲覧ページ集合 (Set を配列直列化) */
  viewedPages?: number[];
  /** video: 視聴済み秒数の最大値 */
  watchedSec?: number;
  /** ISO8601 */
  updatedAt: string;
}

export type LessonProgressMap = Record<string, LessonProgressEntry>;

type Listener = () => void;

const listeners = new Set<Listener>();
let cache: LessonProgressMap = readFromStorage();
let pendingFlush: ReturnType<typeof setTimeout> | null = null;

function readFromStorage(): LessonProgressMap {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as LessonProgressMap;
    return {};
  } catch {
    return {};
  }
}

function writeToStorage(map: LessonProgressMap): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // QuotaExceeded など。 ローカルでの一時保存だけ諦めて続行。
  }
}

/**
 * 2 つのエントリのうち updatedAt が新しい方を返す。
 * updatedAt がない / パースできない場合は b (= 現タブの値) を優先。
 */
function pickNewer(
  a: LessonProgressEntry | undefined,
  b: LessonProgressEntry | undefined,
): LessonProgressEntry | undefined {
  if (!a) return b;
  if (!b) return a;
  const ta = Date.parse(a.updatedAt);
  const tb = Date.parse(b.updatedAt);
  if (!Number.isFinite(ta) && !Number.isFinite(tb)) return b;
  if (!Number.isFinite(ta)) return b;
  if (!Number.isFinite(tb)) return a;
  return tb >= ta ? b : a;
}

/**
 * 別タブが先に書き込んだ進捗を踏み潰さないよう、 書き込み直前に
 * localStorage の最新値を再読込し、 updatedAt が新しい方を採用してマージする。
 */
function mergeAndWrite(): void {
  const fresh = readFromStorage();
  const keys = new Set<string>([...Object.keys(fresh), ...Object.keys(cache)]);
  const merged: LessonProgressMap = {};
  for (const k of keys) {
    const picked = pickNewer(fresh[k], cache[k]);
    if (picked) merged[k] = picked;
  }
  cache = merged;
  writeToStorage(cache);
}

function scheduleFlush(): void {
  if (pendingFlush) return;
  pendingFlush = setTimeout(() => {
    pendingFlush = null;
    mergeAndWrite();
  }, DEBOUNCE_MS);
}

function notify(): void {
  for (const l of listeners) l();
}

/** デバウンス中の書き込みを即時 flush (pagehide / 明示 save 用) */
export function flushNow(): void {
  if (pendingFlush) {
    clearTimeout(pendingFlush);
    pendingFlush = null;
  }
  mergeAndWrite();
}

if (typeof window !== 'undefined') {
  // pagehide はモバイル含めて beforeunload より確実に発火する
  window.addEventListener('pagehide', flushNow);
  // 別タブでの localStorage 更新を取り込み、 in-memory cache を同期
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    const fresh = readFromStorage();
    const keys = new Set<string>([...Object.keys(fresh), ...Object.keys(cache)]);
    const merged: LessonProgressMap = {};
    for (const k of keys) {
      const picked = pickNewer(fresh[k], cache[k]);
      if (picked) merged[k] = picked;
    }
    cache = merged;
    notify();
  });
}

export function loadMap(): LessonProgressMap {
  return cache;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getEntry(lessonId: string): LessonProgressEntry | undefined {
  return cache[lessonId];
}

function nowIso(): string {
  return new Date().toISOString();
}

function update(lessonId: string, entry: LessonProgressEntry): LessonProgressEntry {
  cache = { ...cache, [lessonId]: entry };
  scheduleFlush();
  notify();
  return entry;
}

export function recordPage(
  lessonId: string,
  page: number,
  totalPages: number,
): LessonProgressEntry {
  const prev = cache[lessonId];
  const validPage =
    Number.isInteger(page) &&
    page >= 1 &&
    (totalPages <= 0 || page <= totalPages)
      ? page
      : undefined;
  const viewedSet = new Set(prev?.viewedPages ?? []);
  if (validPage !== undefined) viewedSet.add(validPage);
  const viewedPages = Array.from(viewedSet).sort((a, b) => a - b);
  const completed =
    prev?.completed === true ||
    (totalPages > 0 && viewedPages.length / totalPages >= COMPLETION_THRESHOLD);
  return update(lessonId, {
    completed,
    lastPage: validPage ?? prev?.lastPage,
    viewedPages,
    watchedSec: prev?.watchedSec,
    updatedAt: nowIso(),
  });
}

export function recordWatchTime(
  lessonId: string,
  sec: number,
  totalSec: number,
): LessonProgressEntry {
  const prev = cache[lessonId];
  const prevWatched = prev?.watchedSec ?? 0;
  const normalizedSec = Number.isFinite(sec) ? Math.max(0, sec) : prevWatched;
  const watched = Math.max(prevWatched, normalizedSec);
  const completed =
    prev?.completed === true ||
    (totalSec > 0 && watched / totalSec >= COMPLETION_THRESHOLD);
  return update(lessonId, {
    completed,
    lastPage: prev?.lastPage,
    viewedPages: prev?.viewedPages,
    watchedSec: watched,
    updatedAt: nowIso(),
  });
}

export function markComplete(lessonId: string): LessonProgressEntry {
  const prev = cache[lessonId];
  if (prev?.completed) return prev;
  return update(lessonId, {
    completed: true,
    lastPage: prev?.lastPage,
    viewedPages: prev?.viewedPages,
    watchedSec: prev?.watchedSec,
    updatedAt: nowIso(),
  });
}

/**
 * fixture の初期 status と進捗マップから現在の表示 status を導出。
 *
 * 優先度: locked 維持 → completed なら done → fixture が done なら done 維持
 *      → エントリ有なら active → fixture status。
 * fixture done の lesson を再訪して部分閲覧しただけで done から active に
 * 落ちないように、 fixture done を partial entry より上に置く。
 */
export function resolveLessonStatus(
  lesson: Lesson,
  map: LessonProgressMap,
): LessonStatus {
  if (lesson.status === 'locked') return 'locked';
  const entry = map[lesson.id];
  if (entry?.completed) return 'done';
  if (lesson.status === 'done') return 'done';
  if (entry) return 'active';
  return lesson.status;
}
