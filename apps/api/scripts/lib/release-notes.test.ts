import { describe, expect, it } from "vitest";
import {
  buildDigestMessages,
  collectShotNames,
  type DigestEntry,
  buildReleaseBody,
  extractChangelogSection,
  fallbackSummary,
  isGoogleChatWebhookUrl,
  parseChangelogItems,
  parseSummary,
  type ReleaseItem,
  releaseProductName,
  stripShotLines,
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

describe("parseChangelogItems", () => {
  it("uses headings as item boundaries and extracts ordered standalone shots", () => {
    const result = parseChangelogItems(
      "\r\n### 課題の画面  \r\n\r\n最初の行  \r\n\r\n- 補足\r\n  ![提出画面](shot:task-1)  \r\n![詳細](shot:detail)\r\n\r\n### 次の変更\r\n![もう一度](shot:task-1)",
    );
    expect(result).toEqual({
      items: [
        {
          title: "課題の画面",
          body: "最初の行  \n\n- 補足",
          shots: [
            { name: "task-1", alt: "提出画面" },
            { name: "detail", alt: "詳細" },
          ],
        },
        { title: "次の変更", body: "", shots: [{ name: "task-1", alt: "もう一度" }] },
      ],
      errors: [],
    });
    expect(collectShotNames(result.items)).toEqual(["task-1", "detail"]);
  });

  it("keeps unindented prose and uses indented lines as bullet continuations", () => {
    expect(
      parseChangelogItems(
        "冒頭の説明\n\n- 最初  \n  続き\n  ![画面](shot:screen)\n\n* 変更\n  - 補足\n最後の説明\n続き",
      ),
    ).toEqual({
      items: [
        { title: null, body: "冒頭の説明", shots: [] },
        { title: null, body: "最初  \n  続き", shots: [{ name: "screen", alt: "画面" }] },
        { title: null, body: "変更\n  - 補足", shots: [] },
        { title: null, body: "最後の説明\n続き", shots: [] },
      ],
      errors: [],
    });
  });

  it.each([
    ["+ ", "+ "],
    ["1. ", "2.\t"],
    ["1)\t", "2) "],
  ])("groups %s and %s with separate shot limits", (first, second) => {
    const section = `${first}最初\n  ![一](shot:a)\n  ![二](shot:b)\n${second}次\n  ![三](shot:c)`;
    expect(parseChangelogItems(section)).toEqual({
      items: [
        {
          title: null,
          body: "最初",
          shots: [
            { name: "a", alt: "一" },
            { name: "b", alt: "二" },
          ],
        },
        { title: null, body: "次", shots: [{ name: "c", alt: "三" }] },
      ],
      errors: [],
    });
    expect(
      parseChangelogItems(
        section.replace("\n  ![二](shot:b)", "\n  ![二](shot:b)\n  ![四](shot:d)"),
      ).errors,
    ).toEqual(["「最初」: 画像は 1 項目につき 2 枚までです"]);
  });

  it("keeps a section with no headings or bullets together", () => {
    expect(parseChangelogItems("\n最初の行\n\n次の行\n  ")).toEqual({
      items: [{ title: null, body: "最初の行\n\n次の行", shots: [] }],
      errors: [],
    });
  });

  it("ignores blank lines before the first bullet", () => {
    expect(parseChangelogItems("\n  \n- 変更\n")).toEqual({
      items: [{ title: null, body: "変更", shots: [] }],
      errors: [],
    });
  });

  it("reports prose and bullets before the first heading", () => {
    expect(parseChangelogItems("- 見出しの前\n### 項目\n- 補足").errors).toEqual([
      "「見出しの前」: 最初の ### 見出しより前に本文があります",
    ]);
  });

  it.each([
    ["![ ](shot:valid)", "画像の説明が空"],
    ["![説明](shot:bad--name)", "画像の名前"],
    ["![説明](shot:UPPER)", "画像の名前"],
    ["![説明](shot:)", "画像の名前"],
    ["文中の ![説明](shot:valid)", "画像は ![説明](shot:名前) を単独の行"],
    ["文中の ![説明](foo.png)", "画像は ![説明](shot:名前) を単独の行"],
    ["![説明](https://example.com/manual.png)", "画像は ![説明](shot:名前) を単独の行"],
  ])("reports invalid shot syntax %s with the item label", (line, reason) => {
    const label = "先".repeat(30);
    expect(parseChangelogItems(`- ${label}残り\n  ${line}`).errors).toEqual([
      expect.stringContaining(`「${label}」: ${reason}`),
    ]);
  });

  it("reports more than two shots in the same item", () => {
    expect(
      parseChangelogItems("### 表示\n![一](shot:a)\n![二](shot:b)\n![三](shot:c)").errors,
    ).toEqual(["「表示」: 画像は 1 項目につき 2 枚までです"]);
  });
});

describe("stripShotLines", () => {
  it("removes standalone shot lines across releases and preserves the other lines and endings", () => {
    const markdown =
      "# CHANGELOG\r\n\r\n## 1.2.0\r\n+ 説明  \r\n  ![画面](shot:screen) \r\n\r\n## 1.1.0\n![以前](shot:old)\n文中の ![例](shot:example)\n![画像](./manual.png)\n";
    expect(stripShotLines(markdown)).toBe(
      "# CHANGELOG\r\n\r\n## 1.2.0\r\n+ 説明  \r\n\r\n## 1.1.0\n文中の ![例](shot:example)\n![画像](./manual.png)\n",
    );
  });

  it("preserves whether the last line ends with a newline when removing a final shot", () => {
    expect(stripShotLines("本文\r\n![画面](shot:screen)\r\n")).toBe("本文\r\n");
    expect(stripShotLines("本文\r\n![画面](shot:screen)")).toBe("本文");
    expect(stripShotLines("![画面](shot:screen)\r\n")).toBe("\r\n");
  });
});

describe("buildDigestMessages", () => {
  const now = new Date("2026-11-22T22:50:00Z");
  const title = "📣 *STELLA を更新しました*（11月23日）";
  const webGuidance = "開いたままの画面は、再読み込みすると新しい版になります。";
  const extensionGuidance =
    "VS Code が自動で更新します。すぐに使うには、VS Code を再起動してください。";
  const baseUrl = "https://github.com/example/stella/releases/tag";
  const item = (body: string): ReleaseItem => ({ title: null, body, images: [] });
  const web = (minor: number, items: ReleaseItem[] = [item(`変更 ${minor}`)]): DigestEntry => ({
    product: "web",
    version: `1.${minor}.0`,
    items,
    releaseUrl: `${baseUrl}/web-v1.${minor}.0`,
    publishedAt: `2026-11-22T0${minor}:00:00Z`,
  });

  it("uses the next date in Japan and puts Web first without duplicating the version prefix", () => {
    const extension: DigestEntry = {
      product: "vscode",
      version: "v0.11.0",
      items: [item("課題文を表示できるようになりました")],
      releaseUrl: `${baseUrl}/vscode-v0.11.0`,
      publishedAt: "2026-11-22T18:00:00Z",
    };
    const messages = buildDigestMessages(
      [extension, web(1, [item("変更 A"), item("変更 B")])],
      now,
    );
    expect(messages[0]).toEqual({
      text: `${title}
🚀 Web v1.1.0
🧩 VS Code 拡張 v0.11.0
変更の内容はこのスレッドに載せています。`,
    });
    expect(messages.slice(1, -1).map(cardBody)).toEqual([
      "変更 A",
      "変更 B",
      "課題文を表示できるようになりました",
    ]);
    expect(messages.at(-1)).toEqual({
      text: `🚀 Web v1.1.0
${webGuidance}
<${baseUrl}/web-v1.1.0|変更の詳細を見る>

🧩 VS Code 拡張 v0.11.0
${extensionGuidance}
<${baseUrl}/vscode-v0.11.0|変更の詳細を見る>`,
    });
  });

  function cardBody(message: ReturnType<typeof buildDigestMessages>[number]) {
    const widget =
      "cardsV2" in message ? message.cardsV2[0].card.sections[0].widgets[0] : undefined;
    return widget && "textParagraph" in widget ? widget.textParagraph.text : undefined;
  }

  it("orders releases by publication date and keeps repeated changelog entries", () => {
    const oldest = { ...web(3, [item("同じ説明")]), publishedAt: "2026-11-22T00:00:00Z" };
    const messages = buildDigestMessages([web(1), oldest, web(2, [item("同じ説明")])], now);
    expect(messages[0]).toEqual({
      text: expect.stringContaining("🚀 Web v1.2.0（前回のお知らせから 3 回更新）"),
    });
    expect(messages.slice(1, -1).map(cardBody)).toEqual(["同じ説明", "変更 1", "同じ説明"]);
    expect(messages.at(-1)).toEqual({
      text: expect.stringContaining(
        `変更の詳細: <${baseUrl}/web-v1.3.0|v1.3.0>・<${baseUrl}/web-v1.1.0|v1.1.0>・<${baseUrl}/web-v1.2.0|v1.2.0>`,
      ),
    });
  });

  it("escapes the body, caps displayed text lengths, and supports image-only cards", () => {
    const image = { url: "https://example.com/shot.png", alt: "画面" };
    const messages = buildDigestMessages(
      [
        web(1, [
          {
            title: "題".repeat(201),
            body: `<引数&値> \r\n\n 続き${"点".repeat(2000)}`,
            images: [image],
          },
          { title: "画像だけ", body: "", images: [image] },
        ]),
      ],
      now,
    );
    const start = "<引数&値> \r\n\n 続き";
    expect(cardBody(messages[1])).toBe(
      `&lt;引数&amp;値&gt; <br><br> 続き${"点".repeat(1999 - start.length)}…`,
    );
    expect(messages[1]).toMatchObject({
      cardsV2: [{ card: { header: { title: "題".repeat(200), subtitle: "🚀 Web v1.1.0" } } }],
    });
    expect(messages[2]).toEqual({
      cardsV2: [
        {
          cardId: "item",
          card: {
            header: { title: "画像だけ", subtitle: "🚀 Web v1.1.0" },
            sections: [{ widgets: [{ image: { imageUrl: image.url, altText: image.alt } }] }],
          },
        },
      ],
    });
  });

  it.each([28, 29, 35])("caps the full thread at 30 messages for %i items", (count) => {
    const messages = buildDigestMessages(
      [
        web(
          1,
          Array.from({ length: count }, (_, i) => item(`変更 ${i + 1}`)),
        ),
      ],
      now,
    );
    expect(messages).toHaveLength(30);
    expect(messages.at(-2)).toEqual(
      count <= 28
        ? expect.objectContaining({ cardsV2: expect.any(Array) })
        : { text: `ほか ${count - 27} 件は変更の詳細をご覧ください` },
    );
    expect(messages.at(-1)).toEqual({ text: expect.stringContaining("変更の詳細を見る") });
  });

  it("links to the five newest versions in ascending publication order", () => {
    const messages = buildDigestMessages(
      [1, 2, 3, 4, 5, 6].map((i) => web(i)),
      now,
    );
    expect(messages.at(-1)).toEqual({
      text: `🚀 Web v1.6.0（前回のお知らせから 6 回更新）
${webGuidance}
変更の詳細: <${baseUrl}/web-v1.2.0|v1.2.0>・<${baseUrl}/web-v1.3.0|v1.3.0>・<${baseUrl}/web-v1.4.0|v1.4.0>・<${baseUrl}/web-v1.5.0|v1.5.0>・<${baseUrl}/web-v1.6.0|v1.6.0>・ほか 1 版`,
    });
  });

  it("preserves cards and a long release URL when they fit in separate messages", () => {
    const longUrl = `${web(1).releaseUrl}?query=${"x".repeat(3650)}`;
    const messages = buildDigestMessages(
      [{ ...web(1), items: [item("変更 A"), item("点".repeat(200))], releaseUrl: longUrl }],
      now,
    );
    expect(messages.slice(1, -1).map(cardBody)).toEqual(["変更 A", "点".repeat(200)]);
    expect(messages.at(-1)).toEqual({
      text: expect.stringContaining(`<${longUrl}|変更の詳細を見る>`),
    });
  });

  it("keeps guidance and a link within the limit for oversized version and link text", () => {
    const messages = buildDigestMessages(
      [
        {
          ...web(1),
          version: "v".repeat(4000),
          releaseUrl: `${web(1).releaseUrl}/${"x".repeat(8000)}`,
        },
      ],
      now,
    );
    const footer = messages.at(-1);
    expect(footer).toEqual({ text: expect.stringContaining(webGuidance) });
    if (!footer || !("text" in footer)) throw new Error("Missing footer");
    expect(footer.text.length).toBeLessThanOrEqual(4000);
    expect(footer.text).toContain("🚀 Web v");
    expect(footer.text.split("\n").at(-1)).toMatch(/^<https:\/\/[^>]+\|変更の詳細を見る>$/);
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
