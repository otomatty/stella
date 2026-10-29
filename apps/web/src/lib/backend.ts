/**
 * バックエンド (Hono API + Google OAuth) がフロントから利用可能か。
 *
 * `VITE_SERVER_URL` が設定されていれば API / 認証の両方を使える前提とする。
 */

import { isAuthConfigured } from "./auth-client";
import { isApiConfigured } from "./api-client";

/** Workers API + 認証が設定済みか。未設定時は fixtures / モックログインで動く。 */
export function isBackendConfigured(): boolean {
  return isAuthConfigured() && isApiConfigured();
}
