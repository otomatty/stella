/**
 * セキュリティ画面の表示用の小さな関数 (React に依らないのでテストで直接確かめる)。
 */

import {
  SECURITY_EVENT_LABELS,
  SECURITY_RULES,
  type SecurityAlertStatus,
  type SecurityEventRow,
} from "@stella/shared/security/types";

/** 日本時間で `2026/10/12 14:03:05` の形にする (閲覧者の端末のタイムゾーンに依らない)。 */
export function formatJst(iso: string | null | undefined, withSeconds = true): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  });
}

/** 日次の集計の日付 (`2026-10-12`) を `10/12 (月)` にする。 */
export function formatDayLabel(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  const [, y, mo, d] = m;
  // 日付だけの値なので UTC の正午で曜日を取る (タイムゾーンで日がずれない)。
  const weekday = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), 12)).getUTCDay();
  return `${Number(mo)}/${Number(d)} (${"日月火水木金土"[weekday]})`;
}

let regionNames: Intl.DisplayNames | null | undefined;

/** 国コード (`JP`) を `日本 (JP)` にする。読めないコードはそのまま。 */
export function countryLabel(code: string | null | undefined): string {
  if (!code) return "—";
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["ja"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  try {
    const name = regionNames?.of(code.toUpperCase());
    return name && name !== code.toUpperCase() ? `${name} (${code.toUpperCase()})` : code;
  } catch {
    return code;
  }
}

/**
 * サインインした国が前回と違うなら前回の国コードを返す (同じ・分からないときは null)。
 * API は国が変わったサインインの metadata に `previous_country` を入れる。
 */
export function previousCountryIfChanged(
  row: Pick<SecurityEventRow, "country" | "metadata">,
): string | null {
  const prev = row.metadata?.["previous_country"];
  if (typeof prev !== "string" || !prev.trim()) return null;
  if (!row.country) return null;
  return prev.trim().toUpperCase() === row.country.trim().toUpperCase() ? null : prev.trim();
}

/** User-Agent を `Chrome 129 / Windows` のような短い形にする。読めなければ先頭を切り詰める。 */
export function shortUserAgent(ua: string | null | undefined, max = 40): string {
  if (!ua) return "—";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Mac OS X|Macintosh/.test(ua)
        ? "macOS"
        : /Android/.test(ua)
          ? "Android"
          : /CrOS/.test(ua)
            ? "ChromeOS"
            : /Linux/.test(ua)
              ? "Linux"
              : null;
  // 判定の順番が大事 (Edge / Opera の UA は Chrome を、Chrome の UA は Safari を含む)。
  const browsers: [string, RegExp][] = [
    ["Edge", /Edg(?:e|A|iOS)?\/(\d+)/],
    ["Opera", /OPR\/(\d+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/(\d+)/],
    ["Chrome", /(?:Chrome|CriOS)\/(\d+)/],
    ["Safari", /Version\/(\d+)[\d.]* .*Safari\//],
  ];
  for (const [name, re] of browsers) {
    const m = re.exec(ua);
    if (m) return os ? `${name} ${m[1]} / ${os}` : `${name} ${m[1]}`;
  }
  if (os) return os;
  return ua.length > max ? `${ua.slice(0, max - 1)}…` : ua;
}

/** 出来事の種類の表示名 (未知の種類はそのまま)。 */
export function eventKindLabel(kind: string): string {
  return (SECURITY_EVENT_LABELS as Record<string, string>)[kind] ?? kind;
}

/** 検知ルールの説明 (未知のルールは title だけで出す)。 */
export function ruleInfo(rule: string): { label: string; what: string; action: string } | null {
  return (
    (SECURITY_RULES as Record<string, { label: string; what: string; action: string }>)[rule] ??
    null
  );
}

/** 検知ルールが detail に入れる項目の表示名 (apps/api/src/lib/security-detect.ts)。知らない項目はそのまま出す。 */
const DETAIL_LABELS: Record<string, string> = {
  actor_id: "利用者 ID",
  actor_name: "操作した人",
  role: "ロール",
  email: "メールアドレス",
  ip: "IP アドレス",
  country: "国",
  usual_countries: "いつもの国",
  path: "パス",
  reason: "理由",
  user_agent: "ブラウザ",
  jst_hour: "時刻 (日本時間)",
  count_last_hour: "直近 1 時間の件数",
  hourly_average_7d: "過去 7 日の 1 時間平均",
  action: "操作",
  target_id: "対象の利用者 ID",
  new_role: "新しいロール",
  previous_role: "前のロール",
};

/** アラートの詳細 (detail) を「項目: 値」の並びにする。値の無い項目は落とす。 */
export function detailEntries(
  detail: Record<string, unknown> | null | undefined,
): [string, string][] {
  if (!detail) return [];
  const out: [string, string][] = [];
  for (const [key, value] of Object.entries(detail)) {
    if (value === null || value === undefined || value === "") continue;
    let text: string;
    if (Array.isArray(value))
      text = value.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join(", ");
    else if (typeof value === "object") text = JSON.stringify(value);
    else text = String(value);
    if (text) out.push([DETAIL_LABELS[key] ?? key, text]);
  }
  return out;
}

/** アラートの状態ごとに出す操作 (いまの状態へ移るボタンは出さない)。 */
export function alertTransitions(status: SecurityAlertStatus): SecurityAlertStatus[] {
  switch (status) {
    case "open":
      return ["acknowledged", "resolved"];
    case "acknowledged":
      return ["resolved", "open"];
    case "resolved":
      return ["open"];
  }
}

/** 日次の棒の長さ (%)。0 件は 0、1 件以上は見えるよう最低 4%。 */
export function barPercent(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}
