import type { CertificateAchievement } from "@stella/shared/cms/certificate-achievement";

const LINKED_IN_ADD_URL = "https://www.linkedin.com/profile/add";

const ACHIEVEMENT_LINES: {
  key: keyof CertificateAchievement;
  label: string;
  unit: string;
}[] = [
  { key: "lessons", label: "レッスン", unit: "完了" },
  { key: "quizzes", label: "小テスト", unit: "合格" },
  { key: "assignments", label: "課題のレビュー", unit: "合格" },
];

export interface AchievementLine {
  label: string;
  value: string;
}

/** 閲覧者のタイムゾーンによらず、日本の発行日を表示する。 */
export function formatIssuedDateJa(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function achievementLabel(a: CertificateAchievement | null | undefined): string | null {
  if (!a) return null;
  const labels: string[] = [];
  if (a.lessons) labels.push(`レッスン ${a.lessons.done} 件を完了`);
  if (a.quizzes) labels.push(`小テスト ${a.quizzes.done} 件に合格`);
  if (a.assignments) labels.push(`課題 ${a.assignments.done} 件がレビューに合格`);
  return labels.length > 0 ? labels.join("・") : null;
}

/** 詳細ページの「修了の内容」。ある項目だけ、レッスン → 小テスト → 課題の順。 */
export function achievementRows(
  achievement: CertificateAchievement | null | undefined,
): AchievementLine[] {
  if (!achievement) return [];
  const rows: AchievementLine[] = [];
  for (const field of ACHIEVEMENT_LINES) {
    const item = achievement[field.key];
    if (!item) continue;
    rows.push({
      label: field.label,
      value: `${item.done} / ${item.total} ${field.unit}`,
    });
  }
  return rows;
}

/** 狭い画面の一覧用。項目が無ければ null。 */
export function achievementSummary(
  achievement: CertificateAchievement | null | undefined,
): string | null {
  const rows = achievementRows(achievement);
  if (rows.length === 0) return null;
  return rows.map((row) => `${row.label} ${row.value}`).join("・");
}

/** 発行日を日本時間の年・月にする。読めない値は null。 */
function issuedYearMonth(iso: string): { year: string; month: string } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    timeZone: "Asia/Tokyo",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = Number(parts.find((part) => part.type === "month")?.value);
  if (!year || !Number.isInteger(month)) return null;
  return { year, month: String(month) };
}

/**
 * LinkedIn の資格欄へ追加する URL。
 * organizationName には呼び出し側が `DISPLAY_NAME` を渡す。
 */
export function buildLinkedInAddUrl(input: {
  stageTitle: string;
  issuedAt: string;
  certCode: string;
  verifyUrl: string;
  organizationName: string;
}): string {
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: input.stageTitle,
    organizationName: input.organizationName,
  });
  const issued = issuedYearMonth(input.issuedAt);
  if (issued) {
    params.set("issueYear", issued.year);
    params.set("issueMonth", issued.month);
  }
  params.set("certUrl", input.verifyUrl);
  params.set("certId", input.certCode);
  return `${LINKED_IN_ADD_URL}?${params.toString()}`;
}

export function findIssuedCertificate<T extends { id: string; revoked: boolean }>(
  rows: readonly T[],
  certId: string,
): T | null {
  const found = rows.find((row) => row.id === certId);
  if (!found || found.revoked) return null;
  return found;
}

export function splitVerificationUrl(url: string): { host: string; path: string } {
  try {
    const parsed = new URL(url);
    return { host: parsed.host, path: parsed.pathname + parsed.search + parsed.hash };
  } catch {
    return { host: "", path: url };
  }
}

/** 横に連続する黒いマスをまとめ、SVG の座標系で描く。 */
export function qrPath(modules: boolean[][]): string {
  const paths: string[] = [];
  for (const [y, row] of modules.entries()) {
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < row.length && row[x]) x++;
      const length = x - start;
      paths.push(`M${start} ${y}h${length}v1h-${length}z`);
    }
  }
  return paths.join("");
}
