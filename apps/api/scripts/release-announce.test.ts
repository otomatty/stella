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
const releaseUrl = "https://github.com/example/stella/releases/tag/v1.2.0";
const notifyArgs = ["notify", "--summary", "release-summary.json", "--release-url", releaseUrl];
const webhookUrl =
  "https://chat.googleapis.com/v1/spaces/example/messages?key=secret&token=private";

function mockDeps(env: Record<string, string | undefined> = {}) {
  return {
    env,
    fetch: vi.fn<typeof fetch>(),
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

describe("notify", () => {
  function configuredDeps() {
    const deps = mockDeps({ GOOGLE_CHAT_WEBHOOK_URL: webhookUrl });
    deps.readFile.mockResolvedValue(
      JSON.stringify({ product: "web", version: "1.2.0", points: ["<変更>"] }),
    );
    return deps;
  }

  it("skips reading the summary and posting when the webhook is unset", async () => {
    const deps = mockDeps();
    await expect(main(notifyArgs, deps)).resolves.toBe(0);
    expect(console.log).toHaveBeenCalledExactlyOnceWith(
      "::notice::Google Chat の通知先が未設定なので投稿しません",
    );
    expect(deps.fetch).not.toHaveBeenCalled();
    expect(deps.readFile).not.toHaveBeenCalled();
  });

  it("rejects invalid webhook URLs without printing them", async () => {
    const deps = mockDeps({
      GOOGLE_CHAT_WEBHOOK_URL: "https://chat.googleapis.com.evil.example/?token=private",
    });
    await expect(main(notifyArgs, deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      "::error::GOOGLE_CHAT_WEBHOOK_URL が Google Chat の Webhook ではありません",
    );
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it("posts the Chat text once as JSON with a timeout", async () => {
    const deps = configuredDeps();
    deps.fetch.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(main(notifyArgs, deps)).resolves.toBe(0);
    expect(deps.fetch).toHaveBeenCalledExactlyOnceWith(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({
        text: `🚀 *STELLA（Web）を更新しました* — v1.2.0
• ＜変更＞

開いたままの画面は、再読み込みすると新しい版になります。
<${releaseUrl}|変更の詳細を見る>`,
      }),
      signal: expect.any(AbortSignal),
      redirect: "manual",
    });
  });

  it("logs only the HTTP status on an unsuccessful response", async () => {
    const deps = configuredDeps();
    deps.fetch.mockResolvedValue(new Response(webhookUrl, { status: 503 }));
    await expect(main(notifyArgs, deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledExactlyOnceWith("::error::HTTP 503");
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not print webhook URLs that appear in exceptions", async () => {
    const deps = configuredDeps();
    deps.fetch.mockRejectedValue(new Error(`Failed to fetch ${webhookUrl}`));
    await expect(main(notifyArgs, deps)).resolves.toBe(1);
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      "::error::HTTP ステータスを取得できませんでした",
    );
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });
});

it.each([
  [],
  ["prepare"],
  [
    "notify",
    "--summary",
    "release-summary.json",
    "--release-url",
    "https://github.com.evil.example/",
  ],
  ["notify", "--summary=release-summary.json", "--release-url", releaseUrl],
  ["notify", "--summary", "--release-url", releaseUrl],
  [...notifyArgs, "--summary", "again.json"],
])("prints usage for invalid arguments %j", async (...argv) => {
  const deps = mockDeps();
  await expect(main(argv, deps)).resolves.toBe(2);
  expect(console.error).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("使い方"));
  expect(deps.readFile).not.toHaveBeenCalled();
});
