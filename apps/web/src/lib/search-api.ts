/**
 * 横断検索 API クライアント (Issue #77)。
 *
 * Topbar の検索パレットから呼ぶ。 バックエンド未設定 (fixtures デモ) では
 * API が存在しないため、 呼び出し側で `isBackendConfigured()` を見て抑止する。
 */

import type { SearchResponse } from "@stella/shared/search/types";
import { apiFetch } from "./api-client";

export async function searchAll(query: string, signal?: AbortSignal): Promise<SearchResponse> {
  return apiFetch<SearchResponse>(
    `/api/search?q=${encodeURIComponent(query)}`,
    signal ? { signal } : {},
  );
}
