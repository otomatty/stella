import { createHash } from "node:crypto";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./release-announce.js";

const prepareArgs = [
  "prepare",
  "--product",
  "vscode",
  "--version",
  "1.2.0",
  "--changelog",
  "CHANGELOG.md",
  "--commit",
  "abc123",
  "--out-dir",
  "dist",
];
const webhookUrl =
  "https://chat.googleapis.com/v1/spaces/example/messages?key=secret&token=private";

function mockDeps(env: Record<string, string | undefined> = {}) {
  return {
    env,
    fetch: vi.fn<typeof fetch>(),
    now: () => new Date("2026-11-22T22:50:00Z"),
    sleep: vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined),
    readFile: vi.fn<(path: string) => Promise<string>>(),
    writeFile: vi.fn<(path: string, content: string) => Promise<void>>(),
    makeDir: vi.fn<(path: string) => Promise<void>>(),
    createClient: vi.fn<NonNullable<Parameters<typeof main>[1]>["createClient"]>(),
  };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe("prepare", () => {
  it("fails before contacting Claude or writing files if the version is missing", async () => {
    const deps = mockDeps({ ANTHROPIC_API_KEY: "test-key" });
    deps.readFile.mockResolvedValue("## 1.2.10\n- 別の版");
    await expect(main(prepareArgs, deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      "::error::CHANGELOG.md に 1.2.0 の節がありません。リリースする前に変更内容を書いてください",
    );
    expect(deps.createClient).not.toHaveBeenCalled();
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it("uses CHANGELOG without an API key and writes both artifacts", async () => {
    const deps = mockDeps();
    const section = "### 追加\n\n- 新しい機能\n* 表示の改善";
    deps.readFile.mockResolvedValue(`# CHANGELOG\n## [1.2.0]\n\n${section}\n\n## 1.1.0\n- 前の版`);
    await expect(main(prepareArgs, deps)).resolves.toBe(0);
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "::warning::AI の要約を使えなかったので CHANGELOG をそのまま使います",
    );
    expect(deps.createClient).not.toHaveBeenCalled();
    expect(deps.makeDir).toHaveBeenCalledExactlyOnceWith("dist");
    const [[bodyPath, body], [summaryPath, summary]] = deps.writeFile.mock.calls;
    expect(bodyPath).toBe(join("dist", "release-body.md"));
    expect(body).toContain(
      `${section}\n\n<details><summary>CHANGELOG の全文</summary>\n\n${section}\n\n</details>`,
    );
    expect(body).toContain("Extensions: Install from VSIX...");
    expect(
      body.endsWith(
        "\n\nこの版を最初に公開したコミット: abc123。同じ版で .vsix を差し替えた場合、ビルド元のコミットは添付ファイルの名前に付いています。",
      ),
    ).toBe(true);
    expect(summaryPath).toBe(join("dist", "release-summary.json"));
    expect(JSON.parse(summary)).toEqual({
      product: "vscode",
      version: "1.2.0",
      points: ["新しい機能", "表示の改善"],
      items: [{ title: "追加", body: "- 新しい機能\n* 表示の改善", images: [] }],
    });
    expect(deps.writeFile).toHaveBeenCalledTimes(2);
  });

  it("continues with CHANGELOG if the SDK cannot be initialized", async () => {
    const deps = mockDeps({ ANTHROPIC_API_KEY: "private-key" });
    deps.readFile.mockResolvedValue("## 1.2.0\n- 追加");
    deps.createClient.mockImplementation(() => {
      throw new Error("private-key");
    });
    await expect(main(prepareArgs, deps)).resolves.toBe(0);
    expect(deps.createClient).toHaveBeenCalledExactlyOnceWith({
      apiKey: "private-key",
      timeout: 60_000,
      maxRetries: 2,
    });
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "::warning::AI の要約を使えなかったので CHANGELOG をそのまま使います",
    );
  });

  it.each([
    [
      '{"summary":"表示を改善しました。","points":["表示を改善しました。"]}',
      "表示を改善しました。",
    ],
    ['{"summary":"項目がありません"}', "追加"],
  ])(
    "writes the Claude points when valid and falls back otherwise",
    async (text, expectedPoint) => {
      const deps = mockDeps({ ANTHROPIC_API_KEY: "test-key", RELEASE_NOTES_MODEL: "test-model" });
      deps.readFile.mockResolvedValue("## 1.2.0\n- 追加");
      const create = vi.fn().mockResolvedValue({
        stop_reason: "end_turn",
        content: [{ type: "text", text }],
      });
      deps.createClient.mockReturnValue({ beta: { messages: { create } } } as unknown as ReturnType<
        typeof deps.createClient
      >);

      await expect(main(prepareArgs, deps)).resolves.toBe(0);
      expect(create).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ model: "test-model" }),
      );
      expect(JSON.parse(deps.writeFile.mock.calls[1][1])).toEqual({
        product: "vscode",
        version: "1.2.0",
        points: [expectedPoint],
        items: [{ title: null, body: "追加", images: [] }],
      });
    },
  );

  it("warns for unavailable shots without --images and removes the shot lines", async () => {
    const deps = mockDeps();
    deps.readFile.mockResolvedValue(
      "## 1.2.0\n- 変更\n  ![画面](shot:missing)\n- 続き\n  ![同じ画像](shot:missing)",
    );
    await expect(main(prepareArgs, deps)).resolves.toBe(0);
    expect(console.warn).toHaveBeenCalledWith(
      "::warning::missing のスクリーンショットが無いので、画像なしで載せます",
    );
    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(deps.writeFile.mock.calls[0][1]).not.toContain("shot:");
    expect(JSON.parse(deps.writeFile.mock.calls[1][1]).items).toEqual([
      { title: null, body: "変更", images: [] },
      { title: null, body: "続き", images: [] },
    ]);
  });

  it("resolves known shots in the summary and the release details, while sending only text to Claude", async () => {
    const deps = mockDeps({ ANTHROPIC_API_KEY: "test-key" });
    const url = "https://cdn.example.com/shot.png";
    deps.readFile
      .mockResolvedValueOnce(
        "## 1.2.0\n### 新機能\n\n変更した内容\n  ![説明](shot:known)\n![未撮影](shot:missing)",
      )
      .mockResolvedValueOnce(JSON.stringify({ shots: { known: { url } } }));
    const create = vi.fn().mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: '{"summary":"AI の要約","points":["AI の要点"]}' }],
    });
    deps.createClient.mockReturnValue({ beta: { messages: { create } } } as unknown as ReturnType<
      typeof deps.createClient
    >);
    await expect(main([...prepareArgs, "--images", "images.json"], deps)).resolves.toBe(0);
    expect(deps.readFile).toHaveBeenNthCalledWith(2, "images.json");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "user",
            content: expect.stringContaining(
              "<changelog>\n### 新機能\n\n変更した内容\n</changelog>",
            ),
          },
        ],
      }),
    );
    const body = deps.writeFile.mock.calls[0][1];
    expect(body).toContain(
      `AI の要約\n\n<details><summary>CHANGELOG の全文</summary>\n\n### 新機能\n\n変更した内容\n  ![説明](${url})\n\n</details>`,
    );
    expect(body).not.toContain("未撮影");
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "::warning::missing のスクリーンショットが無いので、画像なしで載せます",
    );
    expect(JSON.parse(deps.writeFile.mock.calls[1][1])).toEqual({
      product: "vscode",
      version: "1.2.0",
      points: ["AI の要点"],
      items: [{ title: "新機能", body: "変更した内容", images: [{ url, alt: "説明" }] }],
    });
  });

  it.each([
    "{",
    "{}",
    '{"shots":[]}',
    '{"shots":{"name":12}}',
    '{"shots":{"name":{"url":42}}}',
    '{"shots":{"name":{"url":"http://example.com/img.png"}}}',
    '{"shots":{"name":{"url":"https://"}}}',
  ])("rejects an invalid image manifest before writing %s", async (manifest) => {
    const deps = mockDeps({ ANTHROPIC_API_KEY: "test-key" });
    deps.readFile.mockResolvedValueOnce("## 1.2.0\n- 変更").mockResolvedValueOnce(manifest);
    await expect(main([...prepareArgs, "--images", "images.json"], deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("::error::--images"),
    );
    expect(deps.createClient).not.toHaveBeenCalled();
    expect(deps.makeDir).not.toHaveBeenCalled();
    expect(deps.writeFile).not.toHaveBeenCalled();
  });

  it("rejects inline and repeated --images arguments", async () => {
    const deps = mockDeps();
    await expect(main([...prepareArgs, "--images=images.json"], deps)).resolves.toBe(2);
    await expect(
      main([...prepareArgs, "--images", "a.json", "--images", "b.json"], deps),
    ).resolves.toBe(2);
    expect(deps.readFile).not.toHaveBeenCalled();
  });

  it("logs each changelog error and writes no files", async () => {
    const deps = mockDeps();
    deps.readFile.mockResolvedValue(
      "## 1.2.0\n### 新機能\n![](shot:known)\n![説明](shot:bad--name)",
    );
    await expect(main(prepareArgs, deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenNthCalledWith(1, "::error::「新機能」: 画像の説明が空です");
    expect(console.error).toHaveBeenNthCalledWith(
      2,
      "::error::「新機能」: 画像の名前「bad--name」の形式が不正です",
    );
    expect(deps.makeDir).not.toHaveBeenCalled();
    expect(deps.writeFile).not.toHaveBeenCalled();
  });
});

describe("digest", () => {
  const repo = "example/stella";
  const token = "private-github-token";
  const api = `https://api.github.com/repos/${repo}/releases`;
  const uploadApi = `https://uploads.github.com/repos/${repo}/releases`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const summaryName = "release-summary.json";
  const markerName = "release-announced.json";
  const summary = { product: "web", version: "1.2.0", points: ["<変更>"] };

  function release(id: number, tag = "web-v1.2.0") {
    return {
      id,
      tag_name: tag,
      html_url: `https://github.com/${repo}/releases/tag/${tag}`,
      published_at: "2026-11-22T12:00:00Z",
      draft: false,
      prerelease: false,
      assets: [{ id: id + 1000, name: summaryName }],
    };
  }

  function configuredDeps(env: Record<string, string | undefined> = {}) {
    return mockDeps({
      GOOGLE_CHAT_WEBHOOK_URL: webhookUrl,
      GITHUB_REPOSITORY: repo,
      GH_TOKEN: token,
      ...env,
    });
  }

  it.each([
    { GITHUB_REPOSITORY: undefined },
    { GITHUB_REPOSITORY: "owner/repo/extra" },
    { GITHUB_REPOSITORY: "owner/.." },
    { GH_TOKEN: undefined },
  ])("rejects incomplete GitHub configuration %j", async (env) => {
    const deps = configuredDeps(env);
    await expect(main(["digest"], deps)).resolves.toBe(2);
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it("leaves Chat untouched when there are no pending releases and accepts GITHUB_TOKEN", async () => {
    const deps = configuredDeps({ GH_TOKEN: undefined, GITHUB_TOKEN: token });
    deps.fetch.mockResolvedValueOnce(Response.json([]));
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(console.log).toHaveBeenCalledExactlyOnceWith("::notice::送る更新情報はありません");
    expect(deps.fetch).toHaveBeenCalledExactlyOnceWith(`${api}?per_page=100&page=1`, { headers });
  });

  it("skips ineligible releases and pending-only summaries and warns about bad summaries", async () => {
    const deps = configuredDeps();
    const marked = release(1);
    marked.assets.push({ id: 2001, name: markerName });
    deps.fetch
      .mockResolvedValueOnce(
        Response.json([
          marked,
          { ...release(2), draft: true },
          { ...release(3), prerelease: true },
          release(4, "v1.2.0"),
          { ...release(5), assets: [] },
          release(6, "vscode-v1.2.0"),
          release(7, "web-v1.1.0"),
          release(8),
          release(9),
          {
            ...release(10, "vscode-v0.11.0"),
            assets: [{ id: 1010, name: "release-summary.pending.json" }],
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json(summary))
      .mockResolvedValueOnce(Response.json(summary))
      .mockResolvedValueOnce(Response.json({ ...summary, points: [42] }))
      .mockResolvedValueOnce(new Response("{"));
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(deps.fetch.mock.calls.map(([url]) => url)).toEqual([
      `${api}?per_page=100&page=1`,
      `${api}/assets/1006`,
      `${api}/assets/1007`,
      `${api}/assets/1008`,
      `${api}/assets/1009`,
    ]);
    expect(deps.fetch.mock.calls[1][1]).toEqual({
      headers: { ...headers, Accept: "application/octet-stream" },
    });
    expect(console.warn).toHaveBeenCalledTimes(4);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("::warning::vscode-v1.2.0"));
    expect(console.log).toHaveBeenCalledExactlyOnceWith("::notice::送る更新情報はありません");
  });

  function threadHash(...tags: string[]) {
    return createHash("sha256").update(tags.sort().join("\n")).digest("hex").slice(0, 24);
  }

  function messageUrl(hash: string, index: number) {
    return `${webhookUrl}&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD&messageId=client-${hash}-${index}`;
  }

  function queueChat(deps: ReturnType<typeof configuredDeps>, ...statuses: number[]) {
    for (const status of statuses) deps.fetch.mockResolvedValueOnce(new Response(null, { status }));
  }

  it("posts the parent, ordered item cards, and footer in one thread before marking releases", async () => {
    const deps = configuredDeps();
    const web = release(1);
    const extension = release(2, "vscode-v1.2.0");
    const url = "https://cdn.example.com/shot.png";
    deps.fetch
      .mockResolvedValueOnce(Response.json([web, extension]))
      .mockResolvedValueOnce(
        Response.json({
          ...summary,
          items: [
            {
              title: "変更の見出し",
              body: "本文<&>\n続き",
              images: [
                { url, alt: "画面" },
                { url: "http://example.com/bad", alt: "除外" },
                { url: "https://", alt: "除外" },
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(Response.json({ ...summary, product: "vscode" }));
    queueChat(deps, 204, 204, 204, 204, 201, 201);
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(deps.fetch).toHaveBeenCalledTimes(9);
    expect(console.warn).not.toHaveBeenCalled();

    const hash = threadHash(web.tag_name, extension.tag_name);
    const thread = { threadKey: `stella-release-${hash}` };
    const bodies = [
      {
        text: `📣 *STELLA を更新しました*（11月23日）
🚀 Web v1.2.0
🧩 VS Code 拡張 v1.2.0
変更の内容はこのスレッドに載せています。`,
      },
      {
        cardsV2: [
          {
            cardId: "item",
            card: {
              header: { title: "変更の見出し", subtitle: "🚀 Web v1.2.0" },
              sections: [
                {
                  widgets: [
                    { textParagraph: { text: "本文&lt;&amp;&gt;<br>続き" } },
                    { image: { imageUrl: url, altText: "画面" } },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        cardsV2: [
          {
            cardId: "item",
            card: {
              header: { title: "🧩 VS Code 拡張 v1.2.0" },
              sections: [{ widgets: [{ textParagraph: { text: "&lt;変更&gt;" } }] }],
            },
          },
        ],
      },
      {
        text: `🚀 Web v1.2.0
開いたままの画面は、再読み込みすると新しい版になります。
<${web.html_url}|変更の詳細を見る>

🧩 VS Code 拡張 v1.2.0
VS Code が自動で更新します。すぐに使うには、VS Code を再起動してください。
<${extension.html_url}|変更の詳細を見る>`,
      },
    ];
    for (const [index, body] of bodies.entries()) {
      expect(deps.fetch).toHaveBeenNthCalledWith(4 + index, messageUrl(hash, index), {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify({ ...body, thread }),
        signal: expect.any(AbortSignal),
        redirect: "manual",
      });
      if (index > 0) {
        expect(deps.sleep.mock.invocationCallOrder[index - 1]).toBeGreaterThan(
          deps.fetch.mock.invocationCallOrder[2 + index],
        );
        expect(deps.sleep.mock.invocationCallOrder[index - 1]).toBeLessThan(
          deps.fetch.mock.invocationCallOrder[3 + index],
        );
      }
    }
    expect(deps.sleep.mock.calls).toEqual([[1100], [1100], [1100]]);
    for (const id of [1, 2]) {
      expect(deps.fetch).toHaveBeenNthCalledWith(
        7 + id,
        `${uploadApi}/${id}/assets?name=${markerName}`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ announcedAt: "2026-11-22T22:50:00.000Z" }),
          redirect: "manual",
        },
      );
    }
  });

  it("warns and falls back to each legacy point when items are malformed", async () => {
    const deps = configuredDeps();
    deps.fetch
      .mockResolvedValueOnce(Response.json([release(1)]))
      .mockResolvedValueOnce(
        Response.json({ ...summary, points: ["一", "二"], items: [{ title: 1 }] }),
      );
    queueChat(deps, 204, 204, 204, 204, 201);
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("::warning::web-v1.2.0 の項目の形式が不正"),
    );
    expect(deps.fetch.mock.calls[3][1]?.body).toContain('"text":"一"');
    expect(deps.fetch.mock.calls[4][1]?.body).toContain('"text":"二"');
  });

  it("reuses message IDs after a partial failure and continues after 409", async () => {
    const deps = configuredDeps();
    const web = release(1);
    const extension = release(2, "vscode-v1.2.0");
    deps.fetch
      .mockResolvedValueOnce(Response.json([web, extension]))
      .mockResolvedValueOnce(Response.json(summary))
      .mockResolvedValueOnce(Response.json({ ...summary, product: "vscode" }));
    queueChat(deps, 204, 204, 503);
    await expect(main(["digest"], deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("::error::HTTP 503");
    expect(deps.fetch).toHaveBeenCalledTimes(6);
    const firstUrls = deps.fetch.mock.calls.slice(3).map(([url]) => url);

    deps.fetch
      .mockClear()
      .mockResolvedValueOnce(Response.json([extension, web]))
      .mockResolvedValueOnce(Response.json({ ...summary, product: "vscode" }))
      .mockResolvedValueOnce(Response.json(summary));
    queueChat(deps, 409, 409, 204, 204, 201, 201);
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(deps.fetch.mock.calls.slice(3, 6).map(([url]) => url)).toEqual(firstUrls);
    expect(deps.fetch.mock.calls.slice(7).map(([url]) => url)).toEqual([
      `${uploadApi}/2/assets?name=${markerName}`,
      `${uploadApi}/1/assets?name=${markerName}`,
    ]);
  });

  it("logs only the HTTP status and skips markers when Chat returns an error", async () => {
    const deps = configuredDeps();
    deps.fetch
      .mockResolvedValueOnce(Response.json([release(1)]))
      .mockResolvedValueOnce(Response.json(summary))
      .mockResolvedValueOnce(new Response(webhookUrl, { status: 503 }));
    await expect(main(["digest"], deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("::error::HTTP 503");
    expect(deps.fetch).toHaveBeenCalledTimes(3);
  });

  it.each(["list", "summary", "chat", "upload"] as const)(
    "omits secrets from %s exceptions",
    async (stage) => {
      const deps = configuredDeps();
      const responses = [
        Response.json([release(1)]),
        Response.json(summary),
        new Response(null, { status: 204 }),
        new Response(null, { status: 204 }),
        new Response(null, { status: 204 }),
      ];
      const index = { list: 0, summary: 1, chat: 2, upload: 5 }[stage];
      if (index === undefined) throw new Error("Unknown stage");
      for (const response of responses.slice(0, index)) deps.fetch.mockResolvedValueOnce(response);
      deps.fetch.mockRejectedValueOnce(new Error(`Failed to fetch ${webhookUrl} with ${token}`));
      await expect(main(["digest"], deps)).resolves.toBe(1);
      expect(deps.fetch).toHaveBeenCalledTimes(index + 1);
      for (const logger of [console.log, console.warn, console.error]) {
        const calls = JSON.stringify(vi.mocked(logger).mock.calls);
        expect(calls).not.toContain(webhookUrl);
        expect(calls).not.toContain(token);
      }
      if (stage === "chat") {
        expect(console.error).toHaveBeenCalledExactlyOnceWith(
          "::error::HTTP ステータスを取得できませんでした",
        );
      }
    },
  );

  it("fails if any marker upload fails and still attempts the rest", async () => {
    const deps = configuredDeps();
    const unmarked = release(1);
    const marked = release(2, "web-v1.3.0");
    deps.fetch
      .mockResolvedValueOnce(Response.json([unmarked, marked]))
      .mockResolvedValueOnce(Response.json(summary))
      .mockResolvedValueOnce(Response.json({ ...summary, version: "1.3.0" }));
    queueChat(deps, 204, 204, 204, 204, 500, 201);
    await expect(main(["digest"], deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      "::error::web-v1.2.0 に送信済みの印を付けられず、翌日に重ねて送られるかもしれません (HTTP 500)",
    );
    expect(deps.fetch.mock.calls.at(-1)?.[0]).toBe(`${uploadApi}/2/assets?name=${markerName}`);

    marked.assets.push({ id: 2002, name: markerName });
    deps.fetch
      .mockClear()
      .mockResolvedValueOnce(Response.json([unmarked, marked]))
      .mockResolvedValueOnce(Response.json(summary));
    queueChat(deps, 204, 204, 204, 201);
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(deps.fetch.mock.calls.map(([url]) => url)).toEqual([
      `${api}?per_page=100&page=1`,
      `${api}/assets/1001`,
      ...[0, 1, 2].map((index) => messageUrl(threadHash("web-v1.2.0"), index)),
      `${uploadApi}/1/assets?name=${markerName}`,
    ]);
  });

  it.each([
    [undefined, 0, "Google Chat の通知先が未設定なので投稿しません"],
    [
      "https://chat.googleapis.com.evil.example/?token=private",
      1,
      "GOOGLE_CHAT_WEBHOOK_URL が Google Chat の Webhook ではありません",
    ],
  ])("leaves pending releases alone for webhook configuration %j", async (url, code, message) => {
    const deps = configuredDeps({ GOOGLE_CHAT_WEBHOOK_URL: url });
    deps.fetch
      .mockResolvedValueOnce(Response.json([release(1)]))
      .mockResolvedValueOnce(Response.json(summary));
    await expect(main(["digest"], deps)).resolves.toBe(code);
    expect(code === 0 ? console.log : console.error).toHaveBeenCalledExactlyOnceWith(
      `${code === 0 ? "::notice::" : "::error::"}${message}`,
    );
    expect(deps.fetch).toHaveBeenCalledTimes(2);
  });

  it("reads another page after a full page and queues its pending release", async () => {
    const deps = configuredDeps();
    deps.fetch
      .mockResolvedValueOnce(
        Response.json(Array.from({ length: 100 }, (_, i) => release(i, "other"))),
      )
      .mockResolvedValueOnce(Response.json([release(100)]))
      .mockResolvedValueOnce(Response.json(summary));
    queueChat(deps, 204, 204, 204, 201);
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(deps.fetch.mock.calls.map(([url]) => url)).toEqual([
      `${api}?per_page=100&page=1`,
      `${api}?per_page=100&page=2`,
      `${api}/assets/1100`,
      ...[0, 1, 2].map((index) => messageUrl(threadHash("web-v1.2.0"), index)),
      `${uploadApi}/100/assets?name=${markerName}`,
    ]);
  });

  it("stops after three full pages", async () => {
    const deps = configuredDeps();
    deps.fetch.mockImplementation(async () =>
      Response.json(Array.from({ length: 100 }, (_, i) => release(i, "other"))),
    );
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(deps.fetch).toHaveBeenCalledTimes(3);
    expect(deps.fetch).toHaveBeenLastCalledWith(`${api}?per_page=100&page=3`, { headers });
  });
});

it.each([
  [],
  ["prepare"],
  ["notify", "--summary", "release-summary.json"],
  ["digest", "--summary=release-summary.json"],
  ["digest", "--summary"],
  ["digest", "release-summary.json", "again.json"],
])("prints usage for invalid arguments %j", async (...argv) => {
  const deps = mockDeps();
  await expect(main(argv, deps)).resolves.toBe(2);
  expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("使い方"));
  expect(deps.readFile).not.toHaveBeenCalled();
  expect(deps.fetch).not.toHaveBeenCalled();
});
