import { describe, expect, it } from "vitest";
import {
  buildDigestMessage,
  type DigestEntry,
  buildReleaseBody,
  extractChangelogSection,
  fallbackSummary,
  isGoogleChatWebhookUrl,
  parseSummary,
  releaseProductName,
} from "./release-notes.js";

describe("extractChangelogSection", () => {
  it.each(["[1.2.0]", "1.2.0", "[1.2.0] - 2026-11-22", "1.2.0 (2026-11-22)"])(
    "extracts the section headed by %s",
    (heading) => {
      const markdown = `# CHANGELOG\n\n## ${heading}\n\n### 追加\n\n- 変更点\n  \n## [1.1.0]\n- 前の変更点`;
      expect(extractChangelogSection(markdown, "1.2.0")).toBe("### 追加\n\n- 変更点");
    },
  );

  it("matches the full version and reads a CRLF section at the end", () => {
    const markdown = "## 1.2.10\r\n- 別の版\r\n## 1.2.0\r\n\r\n    本文\r\n  \r\n";
    expect(extractChangelogSection(markdown, "1.2.0")).toBe("    本文");
    expect(extractChangelogSection(markdown, "1.2")).toBeNull();
    expect(extractChangelogSection("## 1.2.10\n- 別の版", "1.2.0")).toBeNull();
  });

  it("returns null when the section has no body", () => {
    expect(extractChangelogSection("## 1.2.0\n \n## 1.1.0\n本文", "1.2.0")).toBeNull();
    expect(extractChangelogSection("## 1.2.0", "1.2.0")).toBeNull();
  });
});

describe("fallbackSummary", () => {
  it("leaves the summary intact and takes the first five list entries", () => {
    const section = "### 追加\r\n- 一\r\n* 二\r\n  - 三\r\n- 四\r\n* 五\r\n- 六";
    expect(fallbackSummary(section)).toEqual({
      summary: section,
      points: ["一", "二", "三", "四", "五"],
    });
  });

  it("uses the first nonblank line when there are no list entries", () => {
    const section = "\n  最初の行  \n次の行";
    expect(fallbackSummary(section)).toEqual({ summary: section, points: ["最初の行"] });
  });
});

describe("parseSummary", () => {
  it("trims whitespace and accepts lengths at the limits", () => {
    const summary = "要".repeat(1500);
    const point = "点".repeat(200);
    expect(parseSummary({ summary: ` ${summary} `, points: Array(5).fill(` ${point} `) })).toEqual({
      summary,
      points: Array(5).fill(point),
    });
  });

  it.each([
    null,
    {},
    { summary: 1, points: ["変更"] },
    { summary: "  ", points: ["変更"] },
    { summary: "要".repeat(1501), points: ["変更"] },
    { summary: "概要", points: "変更" },
    { summary: "概要", points: [] },
    { summary: "概要", points: Array(6).fill("変更") },
    { summary: "概要", points: [1] },
    { summary: "概要", points: ["  "] },
    { summary: "概要", points: ["点".repeat(201)] },
  ])("rejects invalid summary %j", (value) => {
    expect(parseSummary(value)).toBeNull();
  });
});

it("uses both product names and adds the VSIX instructions to the extension release", () => {
  expect(releaseProductName("web")).toBe("Web");
  expect(releaseProductName("vscode")).toBe("VS Code 拡張");
  const args = { summary: "概要", section: "### 追加\n- 変更", commitSha: "abc123" };
  const details = "<details><summary>CHANGELOG の全文</summary>\n\n### 追加\n- 変更\n\n</details>";
  const commit = "この版を最初に公開したコミット: abc123";
  const vsix =
    "Marketplace から自動で更新されます。手動で入れる場合は .vsix をダウンロードし、VS Code の「Extensions: Install from VSIX...」でインストールしてください。";
  expect(buildReleaseBody({ ...args, product: "web" })).toBe(`概要\n\n${details}\n\n${commit}`);
  expect(buildReleaseBody({ ...args, product: "vscode" })).toBe(
    `概要\n\n${details}\n\n${vsix}\n\n${commit}。同じ版で .vsix を差し替えた場合、ビルド元のコミットは添付ファイルの名前に付いています。`,
  );
});

describe("buildDigestMessage", () => {
  const now = new Date("2026-11-22T22:50:00Z");
  const title = "📣 *STELLA の更新情報*（11月23日）";
  const webGuidance = "開いたままの画面は、再読み込みすると新しい版になります。";
  const extensionGuidance =
    "VS Code が自動で更新します。すぐに使うには、VS Code を再起動してください。";
  const baseUrl = "https://github.com/example/stella/releases/tag";
  const web = (minor: number, points = [`変更 ${minor}`]): DigestEntry => ({
    product: "web",
    version: `1.${minor}.0`,
    points,
    releaseUrl: `${baseUrl}/web-v1.${minor}.0`,
    publishedAt: `2026-11-22T0${minor}:00:00Z`,
  });

  it("formats one Web release using the next date in Japan at 22:50 UTC", () => {
    expect(buildDigestMessage([web(1, ["変更 A", "変更 B"])], now)).toBe(`${title}

🚀 *Web* — v1.1.0
• 変更 A
• 変更 B
${webGuidance}
<${baseUrl}/web-v1.1.0|変更の詳細を見る>`);
  });

  it("puts Web first and formats both products without duplicating the version prefix", () => {
    const extension: DigestEntry = {
      product: "vscode",
      version: "v0.11.0",
      points: ["課題文を表示できるようになりました"],
      releaseUrl: `${baseUrl}/vscode-v0.11.0`,
      publishedAt: "2026-11-22T18:00:00Z",
    };
    expect(buildDigestMessage([extension, web(1)], now)).toBe(`${title}

🚀 *Web* — v1.1.0
• 変更 1
${webGuidance}
<${baseUrl}/web-v1.1.0|変更の詳細を見る>

🧩 *VS Code 拡張* — v0.11.0
• 課題文を表示できるようになりました
${extensionGuidance}
<${baseUrl}/vscode-v0.11.0|変更の詳細を見る>`);
  });

  it("orders three releases by publication date for the heading, points and links", () => {
    const oldest = { ...web(3), publishedAt: "2026-11-22T00:00:00Z" };
    expect(buildDigestMessage([web(1), oldest, web(2)], now)).toBe(`${title}

🚀 *Web* — v1.2.0（前回のお知らせから 3 回更新）
• 変更 2
• 変更 1
• 変更 3
${webGuidance}
変更の詳細: <${baseUrl}/web-v1.3.0|v1.3.0>・<${baseUrl}/web-v1.1.0|v1.1.0>・<${baseUrl}/web-v1.2.0|v1.2.0>`);
  });

  it("deduplicates exact points before folding line breaks and escaping brackets", () => {
    const repeated = "<引数|値> \r\n\n 続き";
    expect(buildDigestMessage([web(1, [repeated]), web(2, [repeated, "追加"])], now)).toBe(`${title}

🚀 *Web* — v1.2.0（前回のお知らせから 2 回更新）
• ＜引数|値＞ 続き
• 追加
${webGuidance}
変更の詳細: <${baseUrl}/web-v1.1.0|v1.1.0>・<${baseUrl}/web-v1.2.0|v1.2.0>`);
  });

  it("limits points to five lines of at most 200 characters and counts the omitted points", () => {
    const points = Array.from({ length: 7 }, (_, i) => `${i}${"点".repeat(200)}`);
    const displayed = [0, 1, 2, 3, 4].map((i) => `• ${i}${"点".repeat(199)}`).join("\n");
    expect(buildDigestMessage([web(1, points)], now)).toBe(`${title}

🚀 *Web* — v1.1.0
${displayed}
（ほか 2 件は変更の詳細をご覧ください）
${webGuidance}
<${baseUrl}/web-v1.1.0|変更の詳細を見る>`);
  });

  it("links to the five newest versions in ascending publication order", () => {
    expect(
      buildDigestMessage(
        [1, 2, 3, 4, 5, 6].map((i) => web(i)),
        now,
      ),
    ).toBe(`${title}

🚀 *Web* — v1.6.0（前回のお知らせから 6 回更新）
• 変更 6
• 変更 5
• 変更 4
• 変更 3
• 変更 2
（ほか 1 件は変更の詳細をご覧ください）
${webGuidance}
変更の詳細: <${baseUrl}/web-v1.2.0|v1.2.0>・<${baseUrl}/web-v1.3.0|v1.3.0>・<${baseUrl}/web-v1.4.0|v1.4.0>・<${baseUrl}/web-v1.5.0|v1.5.0>・<${baseUrl}/web-v1.6.0|v1.6.0>・ほか 1 版`);
  });

  it("drops points from the end before changing headings, guidance or links", () => {
    const longUrl = `${web(1).releaseUrl}?query=${"x".repeat(3650)}`;
    const message = buildDigestMessage(
      [{ ...web(1), points: ["残る点", "点".repeat(200)], releaseUrl: longUrl }],
      now,
    );
    expect(message.length).toBeLessThanOrEqual(4000);
    expect(message).toBe(`${title}

🚀 *Web* — v1.1.0
• 残る点
（ほか 1 件は変更の詳細をご覧ください）
${webGuidance}
<${longUrl}|変更の詳細を見る>`);
  });

  it("keeps the required lines within the limit for oversized version and link text", () => {
    const message = buildDigestMessage(
      [
        {
          ...web(1),
          version: "v".repeat(4000),
          releaseUrl: `${web(1).releaseUrl}/${"x".repeat(8000)}`,
        },
      ],
      now,
    );
    expect(message.length).toBeLessThanOrEqual(4000);
    expect(message).toContain("🚀 *Web* — v");
    expect(message).toContain(webGuidance);
    expect(message.split("\n").at(-1)).toMatch(/^<https:\/\/[^>]+\|変更の詳細を見る>$/);
  });
});

describe("isGoogleChatWebhookUrl", () => {
  it("accepts a Google Chat webhook", () => {
    expect(
      isGoogleChatWebhookUrl(
        "https://chat.googleapis.com/v1/spaces/example/messages?key=test&token=test",
      ),
    ).toBe(true);
  });

  it.each([
    "http://chat.googleapis.com/v1/spaces/example/messages",
    "https://other.example/webhook",
    "https://chat.googleapis.com.evil.example/",
    "https://chat.googleapis.com@evil.example/",
    "not a URL",
  ])("rejects %s", (url) => {
    expect(isGoogleChatWebhookUrl(url)).toBe(false);
  });
});
