/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_MATERIALS_BASE_URL?: string;
  /** 認証の方式。`clerk` (Clerk) か `dev-token` (ローカルの開発用 JWT)。未指定は dev サーバーなら dev-token、build なら clerk。 */
  readonly VITE_AUTH_MODE?: "clerk" | "dev-token";
  /** Clerk の公開鍵 (`pk_test_…` / `pk_live_…`)。clerk のときに要る。 */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  /** 講師・管理者用の入口 (Cloudflare Access で守ったオリジン)。 */
  readonly VITE_STAFF_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
