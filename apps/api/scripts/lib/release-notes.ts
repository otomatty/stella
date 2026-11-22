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
  const firstCommit = `この版を最初に公開したコミット: ${args.commitSha}`;
  parts.push(
    args.product === "vscode"
      ? `${firstCommit}。同じ版で .vsix を差し替えた場合、ビルド元のコミットは添付ファイルの名前に付いています。`
      : firstCommit,
  );
  return parts.join("\n\n");
}

const chatCopy = {
  web: {
    icon: "🚀",
    guidance: "開いたままの画面は、再読み込みすると新しい版になります。",
  },
  vscode: {
    icon: "🧩",
    guidance: "VS Code が自動で更新します。すぐに使うには、VS Code を再起動してください。",
  },
};

export interface DigestEntry {
  product: ReleaseProduct;
  version: string;
  points: string[];
  releaseUrl: string;
  publishedAt: string;
}

export function buildDigestMessage(entries: DigestEntry[], now: Date): string {
  const limit = 4000;
  const date = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
  }).format(now);
  const groups = (["web", "vscode"] as const).flatMap((product) => {
    const releases = entries
      .filter((entry) => entry.product === product)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    if (releases.length === 0) return [];

    const uniquePoints = [...new Set(releases.flatMap(({ points }) => points))];
    const points = uniquePoints.slice(0, 5).map((point) =>
      point
        .replace(/\s*[\r\n]+\s*/g, " ")
        .replaceAll("<", "＜")
        .replaceAll(">", "＞")
        .slice(0, 200),
    );
    return [{ product, releases, points, pointCount: uniquePoints.length }];
  });

  const render = (compactLinks = false, versionScale = 1) => {
    const blocks = groups.map(({ product, releases, points, pointCount }) => {
      const { icon, guidance } = chatCopy[product];
      const version = (entry: DigestEntry) => {
        const value = entry.version.replace(/^v/, "");
        return `v${value.slice(0, Math.floor(value.length * versionScale))}`;
      };
      const link = ({ releaseUrl }: DigestEntry, label: string) => {
        if (!compactLinks) return `<${releaseUrl}|${label}>`;
        const releaseList = /^https:\/\/github\.com\/[\w-]{1,39}\/[\w.-]{1,100}\/releases\//.exec(
          releaseUrl,
        )?.[0];
        return `<${releaseList ?? "https://github.com"}|${label}>`;
      };
      const count = releases.length;
      const heading = `${icon} *${releaseProductName(product)}* — ${version(releases[0])}`;
      const lines = [count === 1 ? heading : `${heading}（前回のお知らせから ${count} 回更新）`];
      lines.push(...points.map((point) => `• ${point}`));
      const omittedPoints = pointCount - points.length;
      if (omittedPoints > 0) lines.push(`（ほか ${omittedPoints} 件は変更の詳細をご覧ください）`);
      lines.push(guidance);
      if (count === 1) {
        lines.push(link(releases[0], "変更の詳細を見る"));
      } else {
        const links = releases
          .slice(0, 5)
          .reverse()
          .map((entry) => link(entry, version(entry)));
        if (count > 5) links.push(`ほか ${count - 5} 版`);
        lines.push(`変更の詳細: ${links.join("・")}`);
      }
      return lines.join("\n");
    });
    return [`📣 *STELLA の更新情報*（${date}）`, ...blocks].join("\n\n");
  };

  let message = render();
  for (const { points } of groups.slice().reverse()) {
    while (message.length > limit && points.length > 0) {
      points.pop();
      message = render();
    }
  }
  if (message.length <= limit) return message;

  // リンクだけで収まらない場合も、有効なリンクを残す。
  message = render(true);
  if (message.length <= limit) return message;
  const fixedLength = render(true, 0).length;
  return render(true, (limit - fixedLength) / (message.length - fixedLength));
}

export function isGoogleChatWebhookUrl(url: string): boolean {
  return url.startsWith("https://chat.googleapis.com/") && URL.canParse(url);
}
