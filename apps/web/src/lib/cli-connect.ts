import type { DeviceNavigator } from "./device";
import { isHandheld } from "./device";

/** 設定の「CLI で接続する」を出すか。スマートフォンとタブレットでは出さない。 */
export function showCliConnectSection(nav: DeviceNavigator | undefined): boolean {
  return !isHandheld(nav);
}

/** 発行した接続コードの有効期限。API の ISO 時刻を日本時間で出す。 */
export function formatCliCodeExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function cliLoginCommand(code: string): string {
  return `stella login --code ${code}`;
}
