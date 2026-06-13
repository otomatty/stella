/**
 * [互換シム] 旧 `@/lib/supabase` の公開 API を Neon 構成へ橋渡しする。
 *
 * Supabase クライアントは廃止済み。 旧コードが広く参照していた `isSupabaseConfigured` は
 * 「バックエンド (Neon Auth + Hono API) が設定済みか」 の意味に再定義し、 DB 経路 / fixtures
 * フォールバックの分岐ゲートとして引き続き機能させる。 教材 URL は Neon File Storage へ委譲する。
 *
 * 既存の呼び出し側を一括置換しないための薄いシム。 将来的に各所を `isBackendConfigured` /
 * `./storage` へ直接張り替えてこのファイルを削除する。
 */

import { isAuthConfigured } from "./neon-auth";
import { isApiConfigured } from "./api-client";

/** バックエンド (Neon Auth + Hono API) が設定済みか。 旧 isSupabaseConfigured の後継。 */
export function isSupabaseConfigured(): boolean {
  return isAuthConfigured() && isApiConfigured();
}

// 教材 URL は Neon File Storage へ移行済み。 後方互換のため再エクスポートする。
export { getMaterialUrl, isStorageConfigured } from "./storage";
