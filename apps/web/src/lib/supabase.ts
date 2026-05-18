/**
 * Supabase クライアントの遅延初期化と教材URL解決ヘルパ。
 *
 * 環境変数 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` が未設定でも、
 * アプリのビルド・既存ダミー画面の起動は壊れない (P0 受け入れ条件)。
 * 教材ファイルをfetchしようとした瞬間に明示的なエラーを出す。
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars are missing. Copy apps/web/.env.local.example to .env.local and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
    );
  }
  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
  }
  return cached;
}

const BUCKET = 'materials-public';

/**
 * Supabase Storage の `materials-public` バケット上のオブジェクト public URL を返す。
 *
 * 例: `getMaterialUrl('web-fundamentals/01-http.pdf')`
 */
export function getMaterialUrl(path: string): string {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
