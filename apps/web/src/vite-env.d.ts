/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase プロジェクト URL (例: https://xxxxx.supabase.co)。 教材ファイルの配信に使用。 */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (publishable) key。 */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** チャット API のオリジン (末尾スラッシュなし)。未設定時は同一オリジン。 */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
