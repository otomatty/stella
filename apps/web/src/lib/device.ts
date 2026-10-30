/**
 * 端末の種類。課題はパソコンの VS Code で進める (07 §2) ので、VS Code を入れられない
 * スマートフォン・タブレットでは「VS Code で開く」の代わりに、パソコンで同じページを
 * 開くための導線を出す。
 *
 * 画面幅では決めない — iPad の横向きは幅が広くても VS Code を入れられず、狭くした PC の
 * ウィンドウなら開けるため。`pointer: coarse` も使わない (タッチ操作のできる Windows の
 * PC をスマートフォン扱いしてしまう)。
 */

export interface DeviceNavigator {
  userAgent?: string;
  maxTouchPoints?: number;
  userAgentData?: { platform?: string; mobile?: boolean };
  share?: unknown;
}

/** スマートフォン・タブレットか。 */
export function isHandheld(nav: DeviceNavigator | undefined): boolean {
  if (!nav) return false;
  if (nav.userAgentData?.mobile) return true;
  const ua = nav.userAgent ?? "";
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  // iPad の Safari はデスクトップ版の UA (Macintosh) を名乗るので、タッチ点の数で見分ける。
  return /Macintosh|Mac OS X/i.test(ua) && (nav.maxTouchPoints ?? 0) > 1;
}

/** ページのリンクを渡す手段。共有シート (Web Share API) が無いブラウザーではコピーする。 */
export function linkShareMethod(nav: DeviceNavigator | undefined): "share" | "copy" {
  return typeof nav?.share === "function" ? "share" : "copy";
}
