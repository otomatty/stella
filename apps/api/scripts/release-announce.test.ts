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
    expect(body).toMatch(/commit abc123 からビルド。$/);
    expect(summaryPath).toBe(join("dist", "release-summary.json"));
    expect(JSON.parse(summary)).toEqual({
      product: "vscode",
      version: "1.2.0",
      points: ["新しい機能", "表示の改善"],
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
      });
    },
  );
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

  it("skips marked, draft, prerelease and unrelated releases and warns about bad summaries", async () => {
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

  it("posts a single JSON digest with a timeout, then marks each release", async () => {
    const deps = configuredDeps();
    const web = release(1);
    const extension = release(2, "vscode-v1.2.0");
    deps.fetch
      .mockResolvedValueOnce(Response.json([web, extension]))
      .mockResolvedValueOnce(Response.json(summary))
      .mockResolvedValueOnce(Response.json({ ...summary, product: "vscode" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(deps.fetch).toHaveBeenCalledTimes(6);
    expect(deps.fetch).toHaveBeenNthCalledWith(4, webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        text: `📣 *STELLA の更新情報*（11月23日）

🚀 *Web* — v1.2.0
• ＜変更＞
開いたままの画面は、再読み込みすると新しい版になります。
<${web.html_url}|変更の詳細を見る>

🧩 *VS Code 拡張* — v1.2.0
• ＜変更＞
VS Code が自動で更新します。すぐに使うには、VS Code を再起動してください。
<${extension.html_url}|変更の詳細を見る>`,
      }),
      signal: expect.any(AbortSignal),
      redirect: "manual",
    });
    for (const id of [1, 2]) {
      expect(deps.fetch).toHaveBeenNthCalledWith(
        4 + id,
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

  it.each(["list", "summary", "chat", "upload"])(
    "omits secrets from %s exceptions",
    async (stage) => {
      const deps = configuredDeps();
      const responses = [
        Response.json([release(1)]),
        Response.json(summary),
        new Response(null, { status: 204 }),
      ];
      const index = ["list", "summary", "chat", "upload"].indexOf(stage);
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
      .mockResolvedValueOnce(Response.json({ ...summary, version: "1.3.0" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    await expect(main(["digest"], deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      "::error::web-v1.2.0 に送信済みの印を付けられず、翌日に重ねて送られるかもしれません (HTTP 500)",
    );
    expect(deps.fetch.mock.calls.at(-1)?.[0]).toBe(`${uploadApi}/2/assets?name=${markerName}`);

    marked.assets.push({ id: 2002, name: markerName });
    deps.fetch
      .mockClear()
      .mockResolvedValueOnce(Response.json([unmarked, marked]))
      .mockResolvedValueOnce(Response.json(summary))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(deps.fetch.mock.calls.map(([url]) => url)).toEqual([
      `${api}?per_page=100&page=1`,
      `${api}/assets/1001`,
      webhookUrl,
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
      .mockResolvedValueOnce(Response.json(summary))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
    await expect(main(["digest"], deps)).resolves.toBe(0);
    expect(deps.fetch.mock.calls.map(([url]) => url)).toEqual([
      `${api}?per_page=100&page=1`,
      `${api}?per_page=100&page=2`,
      `${api}/assets/1100`,
      webhookUrl,
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
