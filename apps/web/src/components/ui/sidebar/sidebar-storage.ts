/**
 * デスクトップのサイドバー開閉を跨セッションで覚える。
 *
 * shadcn/ui は cookie に置いて SSR の初回描画に効かせているが、 この web は
 * Vite の CSR なので、 テーマ (`useTheme`) と同じく localStorage に揃える。
 */

/** localStorage のキー。 値は `"1"` / `"0"`。 */
export const SIDEBAR_STORAGE_KEY = "falcon_sidebar_open_v1";

/** 保存値を真偽値へ。 未保存 / 壊れた値のときは `fallback` を返す。 */
export function parseSidebarOpen(raw: string | null, fallback: boolean): boolean {
  if (raw === "1") return true;
  if (raw === "0") return false;
  return fallback;
}

/** 保存済みの開閉状態を読む。 localStorage が使えない環境では `fallback`。 */
export function readSidebarOpen(fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    return parseSidebarOpen(localStorage.getItem(SIDEBAR_STORAGE_KEY), fallback);
  } catch {
    // private モード等で読めない場合は既定値のまま進める
    return fallback;
  }
}

/** 開閉状態を保存する。 書けない環境では黙って諦める (表示は続行できる)。 */
export function writeSidebarOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? "1" : "0");
  } catch {
    // 保存できなくてもセッション中の開閉は動く
  }
}
