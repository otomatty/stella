export type ReleaseProduct = "web" | "vscode";

interface ReleaseSummary {
  summary: string;
  points: string[];
}

export function releaseProductName(product: ReleaseProduct): string {
  return product === "web" ? "Web" : "VS Code 拡張";
}

export function extractChangelogSection(markdown: string, version: string): string | null {
  const lines = markdown.split(/\r?\n/);
  const heading = /^##[ \t]+/;
  const versionHeading =
    /^(?:\[([^\s\]]+)\](?: - \d{4}-\d{2}-\d{2})?|([^\s[\]]+)(?: \(\d{4}-\d{2}-\d{2}\))?)$/;
  const start = lines.findIndex((line) => {
    if (!heading.test(line)) return false;
    const match = versionHeading.exec(line.replace(heading, "").trim());
    return (match?.[1] ?? match?.[2]) === version;
  });
  if (start === -1) return null;

  const next = lines.findIndex((line, index) => index > start && heading.test(line));
  const section = lines.slice(start + 1, next === -1 ? lines.length : next);
  const first = section.findIndex((line) => line.trim());
  if (first === -1) return null;
  const last = section.findLastIndex((line) => line.trim());
  return section.slice(first, last + 1).join("\n");
}

export function fallbackSummary(section: string): ReleaseSummary {
  const lines = section.split(/\r?\n/);
  const points = lines
    .flatMap((line) => {
      const point = /^[-*] (.+)/.exec(line.trimStart())?.[1].trim();
      return point ? [point] : [];
    })
    .slice(0, 5);
  const firstLine = lines.find((line) => line.trim())?.trim();
  if (points.length === 0 && firstLine) points.push(firstLine);
  return { summary: section, points };
}

export function parseSummary(value: unknown): ReleaseSummary | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("summary" in value) ||
    !("points" in value)
  ) {
    return null;
  }
  const { summary, points } = value;
  if (
    typeof summary !== "string" ||
    !Array.isArray(points) ||
    points.length < 1 ||
    points.length > 5
  ) {
    return null;
  }
  const trimmedSummary = summary.trim();
  if (!trimmedSummary || trimmedSummary.length > 1500) return null;

  const trimmedPoints: string[] = [];
  for (const point of points) {
    if (typeof point !== "string") return null;
    const trimmed = point.trim();
    if (!trimmed || trimmed.length > 200) return null;
    trimmedPoints.push(trimmed);
  }
  return { summary: trimmedSummary, points: trimmedPoints };
}

export function buildReleaseBody(args: {
  product: ReleaseProduct;
  summary: string;
  section: string;
  commitSha: string;
}): string {
  const parts = [
    args.summary,
    `<details><summary>CHANGELOG の全文</summary>\n\n${args.section}\n\n</details>`,
  ];
  if (args.product === "vscode") {
    parts.push(
      "Marketplace から自動で更新されます。手動で入れる場合は .vsix をダウンロードし、VS Code の「Extensions: Install from VSIX...」でインストールしてください。",
    );
  }
  parts.push(`commit ${args.commitSha} からビルド。`);
  return parts.join("\n\n");
}

export function buildChatMessage(args: {
  product: ReleaseProduct;
  version: string;
  points: string[];
  releaseUrl: string;
}): string {
  const limit = 4000;
  const title = `*STELLA ${releaseProductName(args.product)} `;
  const titleEnd = " を公開しました*";
  const linkEnd = "|リリースノートを見る>";
  // 箇条書きの長さを決める前に、見出しとリンクの分を確保する。
  const budget = limit - title.length - titleEnd.length - `\n<${linkEnd}`.length;
  const url = args.releaseUrl.slice(0, budget);
  const version = args.version.slice(0, budget - url.length);
  const bullet = "\n• ";
  const lines = [`${title}${version}${titleEnd}`];
  let remaining = budget - url.length - version.length;
  for (const point of args.points.slice(0, 5)) {
    if (remaining <= bullet.length) break;
    const text = point
      .replace(/\s*[\r\n]+\s*/g, " ")
      .replaceAll("<", "＜")
      .replaceAll(">", "＞");
    const line = `${bullet}${text.slice(0, Math.min(200, remaining - bullet.length))}`;
    lines.push(line);
    remaining -= line.length;
  }
  return `${lines.join("")}\n<${url}${linkEnd}`;
}

export function isGoogleChatWebhookUrl(url: string): boolean {
  return url.startsWith("https://chat.googleapis.com/") && URL.canParse(url);
}
