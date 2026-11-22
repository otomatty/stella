import { describe, expect, it } from "vitest";
import {
  buildChatMessage,
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
  const commit = "commit abc123 からビルド。";
  const vsix =
    "Marketplace から自動で更新されます。手動で入れる場合は .vsix をダウンロードし、VS Code の「Extensions: Install from VSIX...」でインストールしてください。";
  expect(buildReleaseBody({ ...args, product: "web" })).toBe(`概要\n\n${details}\n\n${commit}`);
  expect(buildReleaseBody({ ...args, product: "vscode" })).toBe(
    `概要\n\n${details}\n\n${vsix}\n\n${commit}`,
  );
});

describe("buildChatMessage", () => {
  const releaseUrl = "https://github.com/example/stella/releases/tag/v1.2.0";

  it("escapes angle brackets, folds multiline points and includes the release link", () => {
    expect(
      buildChatMessage({
        product: "vscode",
        version: "1.2.0",
        points: ["<引数|値>\n 続き"],
        releaseUrl,
      }),
    ).toBe(
      `*STELLA VS Code 拡張 1.2.0 を公開しました*\n• ＜引数|値＞ 続き\n<${releaseUrl}|リリースノートを見る>`,
    );
  });

  it("limits points to five lines of at most 200 characters each", () => {
    const points = Array(6).fill("点".repeat(201));
    const lines = buildChatMessage({ product: "web", version: "1.2.0", points, releaseUrl }).split(
      "\n",
    );
    expect(lines.slice(1, -1)).toEqual(Array(5).fill(`• ${"点".repeat(200)}`));
  });

  it("keeps the whole message within 4000 characters and reserves space for the link", () => {
    const longUrl = `${releaseUrl}?query=${"x".repeat(3800)}`;
    const args = { product: "web" as const, points: ["点".repeat(200)], releaseUrl: longUrl };
    const message = buildChatMessage({ ...args, version: "1.2.0" });
    expect(message).toHaveLength(4000);
    expect(message.endsWith(`\n<${longUrl}|リリースノートを見る>`)).toBe(true);
    expect(
      buildChatMessage({ ...args, version: "v".repeat(4000), releaseUrl: `${longUrl}${longUrl}` }),
    ).toHaveLength(4000);
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
