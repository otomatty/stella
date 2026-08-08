/**
 * 横断検索 (コース / レッスン) の型と純粋関数 (Issue #77)。
 *
 * Topbar の検索ボックスはハンドラを持たない UI スタブだったため、
 * `GET /api/search` を追加して実際にコース・レッスンを引けるようにした。
 * ここには API / フロントの双方が使うクエリ正規化・LIKE エスケープ・
 * 並び替えのロジックだけを置く (I/O は持たない)。
 */

import type { LessonType } from "../cms/types.js";

/** 検索ヒットの種別。 */
export type SearchResultKind = "course" | "lesson";

/** `GET /api/search` が返すヒット 1 件。 */
export interface SearchResult {
  kind: SearchResultKind;
  /** course なら courses.id、 lesson なら lessons.id。 */
  id: string;
  title: string;
  /** 補足行 (course: カテゴリ / lesson: コース名 · セクション名)。 */
  subtitle: string | null;
  /** 遷移先の解決に使うコース ID (lesson でも必ず入る)。 */
  course_id: string;
  course_title: string;
  /** lesson のときのみ。 アイコン表示に使う。 */
  lesson_type: LessonType | null;
}

/** `GET /api/search` の戻り値。 */
export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

/** これ未満の長さのクエリでは検索しない (1 文字で全件マッチするのを避ける)。 */
export const MIN_SEARCH_QUERY_LEN = 2;

/** 1 種別あたりの取得上限。 */
export const SEARCH_KIND_LIMIT = 20;

/** レスポンスに含める合計上限。 */
export const SEARCH_RESULT_LIMIT = 20;

/**
 * 入力を検索クエリへ正規化する。 前後の空白を落とし、 連続空白を 1 つに畳む。
 * 長すぎる入力は LIKE の負荷を抑えるため切り詰める。
 */
export function normalizeSearchQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 100);
}

/** 正規化済みクエリが検索を実行できる長さかどうか。 */
export function isSearchableQuery(query: string): boolean {
  return query.length >= MIN_SEARCH_QUERY_LEN;
}

/**
 * SQL LIKE のワイルドカード (`%` `_`) とエスケープ文字 (`\`) を無効化する。
 * 呼び出し側は必ず `ESCAPE '\'` を付けて使うこと。
 */
export function escapeLikePattern(query: string): string {
  return query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/** 部分一致用の LIKE パターン (`%...%`) を組み立てる。 */
export function buildLikePattern(query: string): string {
  return `%${escapeLikePattern(query)}%`;
}

/**
 * 前方一致用の LIKE パターン (`...%`) を組み立てる。
 *
 * 種別ごとの `LIMIT` は SQL 側で掛かるため、 truncate される前に前方一致を
 * 優先する ORDER BY を効かせる必要がある (そうしないと部分一致だけが 20 件
 * 返り、 前方一致が落ちることがある)。
 */
export function buildPrefixLikePattern(query: string): string {
  return `${escapeLikePattern(query)}%`;
}

/**
 * ヒットの並び替え。 「前方一致 → 部分一致」「コース → レッスン」「タイトル昇順」の順。
 *
 * D1 (SQLite) 側で ORDER BY を組み立てると種別ごとのクエリを跨げないため、
 * マージ後にこの純粋関数で整える。
 */
export function rankSearchResults(
  results: readonly SearchResult[],
  query: string,
): SearchResult[] {
  const needle = query.toLowerCase();
  const kindRank: Record<SearchResultKind, number> = { course: 0, lesson: 1 };
  const score = (r: SearchResult): number =>
    r.title.toLowerCase().startsWith(needle) ? 0 : 1;

  return [...results].sort((a, b) => {
    const byScore = score(a) - score(b);
    if (byScore !== 0) return byScore;
    const byKind = kindRank[a.kind] - kindRank[b.kind];
    if (byKind !== 0) return byKind;
    return a.title.localeCompare(b.title, "ja");
  });
}
