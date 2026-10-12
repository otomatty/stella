/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_MATERIALS_BASE_URL?: string;
  /** 認証の方式。`access` (Cloudflare Access) か `dev-token` (ローカルの開発用 JWT)。未指定は dev サーバーなら dev-token、build なら access。 */
  readonly VITE_AUTH_MODE?: "access" | "dev-token";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
