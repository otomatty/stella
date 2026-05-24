/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase プロジェクト URL (例: https://xxxxx.supabase.co)。 教材ファイルの配信に使用。 */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable key (`sb_publishable_...`)。 Settings → API Keys から取得。 */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /**
   * @deprecated `VITE_SUPABASE_PUBLISHABLE_KEY` を使用してください (legacy anon JWT 用)。
   */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** チャット API のオリジン (末尾スラッシュなし)。未設定時は同一オリジン。 */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
