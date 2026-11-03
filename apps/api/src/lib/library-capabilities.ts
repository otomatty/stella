import type { Env } from "../env.js";
import { libraryEnabled } from "./library-authz.js";

/**
 * 本棚が使えるか。本は利用者が作った zip をそのまま保管するだけなので、外部の処理
 * (OCR・読み上げ) に問い合わせることはない。フラグが有効で、非公開の R2 が束ねられていること。
 */
export function libraryAvailable(env: Env): boolean {
  return libraryEnabled(env.LIBRARY_ENABLED) && Boolean(env.LIBRARY_BUCKET);
}

/** /api/healthz 用。秘密値も本の中身も読まない。 */
export function libraryRuntimeStatus(env: Env) {
  return { libraryEnabled: libraryAvailable(env) };
}
