/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Hono API のオリジン (末尾スラッシュなし)。 フロントは全データアクセスをこれ経由で行う。 */
  readonly VITE_SERVER_URL?: string;

  // --- Neon 移行 (#neon) ---
  /** Neon Auth のベース URL (Magic Link 送信先)。 Neon Console → Auth で取得。 */
  readonly VITE_NEON_AUTH_URL?: string;
  /** Neon File Storage の公開ベース URL (教材 PDF/動画の配信)。 */
  readonly VITE_MATERIALS_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
