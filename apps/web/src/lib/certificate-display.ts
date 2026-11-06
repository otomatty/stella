import type { CertificateAchievement } from "@stella/shared/cms/certificate-achievement";

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
