/**
 * 横断検索 Hook (Issue #77)。
 *
 * 入力をデバウンスして `GET /api/search` を叩き、 直前のリクエストは AbortController で
 * 打ち切る。 バックエンド未設定 (fixtures デモ) では検索を行わず、 その旨を
 * `unavailable` で返して呼び出し側が空状態を出せるようにする。
 */

import { useEffect, useRef, useState } from "react";

import {
  isSearchableQuery,
  normalizeSearchQuery,
  type SearchResult,
} from "@stella/shared/search/types";
import { isBackendConfigured } from "@/lib/backend";
import { searchAll } from "@/lib/search-api";

/** 入力が止まってから実際に投げるまでの待ち時間 (ms)。 */
const DEBOUNCE_MS = 200;

export interface UseSearchResult {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  /** 正規化済みクエリ。 2 文字未満なら空扱い。 */
  query: string;
  /** クエリが短すぎて検索していない状態。 */
  tooShort: boolean;
  /** バックエンド未設定で検索自体が使えない状態。 */
  unavailable: boolean;
}

export function useSearch(raw: string, enabled = true): UseSearchResult {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const unavailable = !isBackendConfigured();
  const query = normalizeSearchQuery(raw);
  const searchable = enabled && !unavailable && isSearchableQuery(query);

  useEffect(() => {
    abortRef.current?.abort();
    if (!searchable) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      void searchAll(query, controller.signal)
        .then((res) => {
          if (controller.signal.aborted) return;
          setResults(res.results ?? []);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          console.error("[useSearch] search failed", err);
          setResults([]);
          setError(err instanceof Error ? err.message : "検索に失敗しました");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchable]);

  // アンマウント時に進行中のリクエストを止める。
  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    results,
    loading,
    error,
    query,
    tooShort: enabled && !unavailable && !isSearchableQuery(query),
    unavailable,
  };
}
