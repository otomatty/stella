export type ReleaseProduct = "web" | "vscode";

export interface ChangelogShot {
  name: string;
  alt: string;
}

export interface ChangelogItem {
  title: string | null;
  body: string;
  shots: ChangelogShot[];
}

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

const shotLine = /^\s*!\[((?:[^\]\\]|\\.)*)\]\(shot:([^)]*)\)\s*$/;
const shotName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const imageSyntax = /!\[.*?\]\([^)]*\)/;
const bulletPrefix = /^[-*] /;

function trimBlankLines(lines: string[]): string {
  const first = lines.findIndex((line) => line.trim());
  return first === -1
    ? ""
    : lines.slice(first, lines.findLastIndex((line) => line.trim()) + 1).join("\n");
}

export function parseChangelogItems(section: string): {
  items: ChangelogItem[];
  errors: string[];
} {
  const lines = section.split(/\r?\n/);
  const items: ChangelogItem[] = [];
  const errors: string[] = [];
  const groups: { title: string | null; lines: string[] }[] = [];
  let group: (typeof groups)[number] = { title: null, lines: [] };
  const hasHeadings = lines.some((line) => line.startsWith("### "));
  const hasBullets = lines.some((line) => bulletPrefix.test(line));
  if (hasHeadings) {
    for (const line of lines) {
      if (!line.startsWith("### ")) {
        group.lines.push(line);
        continue;
      }
      if (group.title !== null) groups.push(group);
      else {
        const preamble = group.lines.find((line) => line.trim())?.trim();
        if (preamble) {
          errors.push(
            `「${preamble.replace(bulletPrefix, "").slice(0, 30)}」: 最初の ### 見出しより前に本文があります`,
          );
        }
      }
      group = { title: line.slice(4).trim(), lines: [] };
    }
    groups.push(group);
  } else if (hasBullets) {
    let inBullet = false;
    for (const line of lines) {
      const bullet = bulletPrefix.test(line);
      if (bullet || (inBullet && /^\S/.test(line))) {
        if (group.lines.some((line) => line.trim())) groups.push(group);
        group = { title: null, lines: [] };
        inBullet = bullet;
      }
      group.lines.push(line);
    }
    if (group.lines.some((line) => line.trim())) groups.push(group);
  } else {
    groups.push({ title: null, lines });
  }

  for (const { title, lines } of groups) {
    const firstLine = lines.find((line) => line.trim())?.trim();
    const label = title || firstLine?.replace(bulletPrefix, "").slice(0, 30) || "本文";
    const shots: ChangelogShot[] = [];
    const body = lines.filter((line) => {
      const match = shotLine.exec(line);
      if (match) {
        const [, alt, name] = match;
        if (!alt.trim()) errors.push(`「${label}」: 画像の説明が空です`);
        if (!shotName.test(name))
          errors.push(`「${label}」: 画像の名前「${name}」の形式が不正です`);
        shots.push({ name, alt });
        return false;
      }
      if (imageSyntax.test(line)) {
        errors.push(`「${label}」: 画像は ![説明](shot:名前) を単独の行に書いてください`);
      }
      return true;
    });
    if (title !== null && imageSyntax.test(title)) {
      errors.push(`「${label}」: 画像は見出しの下の単独の行に書いてください`);
    }
    if (shots.length > 2) errors.push(`「${label}」: 画像は 1 項目につき 2 枚までです`);
    items.push({
      title,
      body: trimBlankLines(
        body.map((line, index) =>
          !hasHeadings && hasBullets && index === 0 ? line.replace(bulletPrefix, "") : line,
        ),
      ),
      shots,
    });
  }
  return { items, errors };
}

export function collectShotNames(items: ChangelogItem[]): string[] {
  return [...new Set(items.flatMap(({ shots }) => shots.map(({ name }) => name)))];
}

function replaceChangelogShots(section: string, shotUrls?: ReadonlyMap<string, string>): string {
  const lines = section.split(/\r?\n/).flatMap((line) => {
    const match = shotLine.exec(line);
    if (!match) return [line];
    const [, alt, name] = match;
    const url = shotUrls?.get(name);
    return url ? [line.replace(`![${alt}](shot:${name})`, () => `![${alt}](${url})`)] : [];
  });
  return trimBlankLines(lines);
}

export function changelogWithoutShots(section: string): string {
  return replaceChangelogShots(section);
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
  shotUrls?: ReadonlyMap<string, string>;
}): string {
  const parts = [
    args.summary,
    `<details><summary>CHANGELOG の全文</summary>\n\n${replaceChangelogShots(args.section, args.shotUrls)}\n\n</details>`,
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

interface ReleaseImage {
  url: string;
  alt: string;
}

export interface ReleaseItem {
  title: string | null;
  body: string;
  images: ReleaseImage[];
}

export interface DigestEntry {
  product: ReleaseProduct;
  version: string;
  items: ReleaseItem[];
  releaseUrl: string;
  publishedAt: string;
}

type CardWidget =
  | { textParagraph: { text: string } }
  | {
      image: { imageUrl: string; altText: string };
    };

type ChatMessage =
  | { text: string }
  | {
      cardsV2: {
        cardId: string;
        card: {
          header: { title: string; subtitle?: string };
          sections: { widgets: CardWidget[] }[];
        };
      }[];
    };

function shorten(text: string, limit: number): string {
  const characters = Array.from(text);
  return characters.length <= limit ? text : `${characters.slice(0, limit - 1).join("")}…`;
}

function displayVersion(entry: DigestEntry): string {
  return shorten(`v${entry.version.replace(/^v/, "")}`, 200);
}

function productVersion(entry: DigestEntry): string {
  return `${chatCopy[entry.product].icon} ${releaseProductName(entry.product)} ${displayVersion(entry)}`;
}

function buildItemCard(entry: DigestEntry, item: ReleaseItem): ChatMessage {
  const version = productVersion(entry);
  const widgets: CardWidget[] = [];
  if (item.body) {
    const text = shorten(item.body, 2000)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replace(/\r?\n/g, "<br>");
    widgets.push({ textParagraph: { text } });
  }
  for (const { url, alt } of item.images) {
    widgets.push({ image: { imageUrl: url, altText: alt } });
  }
  return {
    cardsV2: [
      {
        cardId: "item",
        card: {
          header: item.title
            ? { title: Array.from(item.title).slice(0, 200).join(""), subtitle: version }
            : { title: version },
          sections: widgets.length ? [{ widgets }] : [],
        },
      },
    ],
  };
}

function releaseLink(entry: DigestEntry, label: string, compact: boolean): string {
  const url = compact
    ? (/^https:\/\/github\.com\/[\w-]{1,39}\/[\w.-]{1,100}\/releases\//.exec(
        entry.releaseUrl,
      )?.[0] ?? "https://github.com")
    : entry.releaseUrl;
  return `<${url}|${label}>`;
}

export function buildDigestMessages(entries: DigestEntry[], now: Date): ChatMessage[] {
  const maxMessages = 30;
  const date = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
  }).format(now);
  const groups = (["web", "vscode"] as const).flatMap((product) => {
    const releases = entries
      .filter((entry) => entry.product === product)
      .sort(
        (a, b) =>
          Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
          b.version.localeCompare(a.version, "en"),
      );
    return releases.length ? [{ product, releases }] : [];
  });
  const productLines = groups.map(({ releases }) => {
    const heading = productVersion(releases[0]);
    return releases.length === 1
      ? heading
      : `${heading}（前回のお知らせから ${releases.length} 回更新）`;
  });
  const messages: ChatMessage[] = [
    {
      text: [
        `📣 *STELLA を更新しました*（${date}）`,
        ...productLines,
        "変更の内容はこのスレッドに載せています。",
      ].join("\n"),
    },
  ];

  const items = groups.flatMap(({ releases }) =>
    releases
      .slice()
      .reverse()
      .flatMap((entry) => entry.items.map((item) => ({ entry, item }))),
  );
  const itemLimit = items.length <= maxMessages - 2 ? maxMessages - 2 : maxMessages - 3;
  for (const { entry, item } of items.slice(0, itemLimit)) {
    messages.push(buildItemCard(entry, item));
  }
  if (items.length > itemLimit) {
    messages.push({ text: `ほか ${items.length - itemLimit} 件は変更の詳細をご覧ください` });
  }

  const footer = (compact: boolean) =>
    groups
      .map(({ product, releases }, index) => {
        const lines = [productLines[index], chatCopy[product].guidance];
        if (releases.length === 1) {
          lines.push(releaseLink(releases[0], "変更の詳細を見る", compact));
        } else {
          const links = releases
            .slice(0, 5)
            .reverse()
            .map((entry) =>
              releaseLink(
                entry,
                compact ? shorten(displayVersion(entry), 150) : displayVersion(entry),
                compact,
              ),
            );
          if (releases.length > 5) links.push(`ほか ${releases.length - 5} 版`);
          lines.push(`変更の詳細: ${links.join("・")}`);
        }
        return lines.join("\n");
      })
      .join("\n\n");
  const details = footer(false);
  messages.push({ text: details.length <= 4000 ? details : footer(true) });
  return messages;
}

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function isGoogleChatWebhookUrl(url: string): boolean {
  return url.startsWith("https://chat.googleapis.com/") && URL.canParse(url);
}
