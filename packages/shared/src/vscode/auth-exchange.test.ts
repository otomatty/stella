import { describe, expect, it, vi } from "vitest";
import { EXCHANGE_BLOCKED_MESSAGE, exchangeVscodeLink } from "./auth-exchange.js";

describe("exchangeVscodeLink", () => {
  it("returns access_token on 200", async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ access_token: "jwt-1" }), { status: 200 }),
    );
    const token = await exchangeVscodeLink("http://127.0.0.1:8787", "ABCD2345", fetchFn);
    expect(token).toBe("jwt-1");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/auth/vscode-link/exchange",
      expect.objectContaining({ method: "POST", redirect: "manual" }),
    );
  });

  it("throws on 401", async () => {
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ error: "接続コードが無効です" }), { status: 401 }),
    );
    await expect(exchangeVscodeLink("http://127.0.0.1:8787", "NOPE", fetchFn)).rejects.toThrow(
      /無効/,
    );
  });

  it("Access のログイン画面へのリダイレクトは、交換の経路を Access の対象外にするよう案内する", async () => {
    const fetchFn = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://team.cloudflareaccess.com/cdn-cgi/access/login" },
        }),
    );
    await expect(exchangeVscodeLink("https://stella.example", "ABCD2345", fetchFn)).rejects.toThrow(
      EXCHANGE_BLOCKED_MESSAGE,
    );
  });

  it("opaqueredirect (status 0) も同じく案内する", async () => {
    const opaque = { type: "opaqueredirect", status: 0, ok: false } as Response;
    const fetchFn = vi.fn(async () => opaque);
    await expect(exchangeVscodeLink("https://stella.example", "ABCD2345", fetchFn)).rejects.toThrow(
      /講師・管理者用の入口/,
    );
  });

  it("HTML の応答 (Access のブロック画面・Web の画面) は API に届いていないと案内する", async () => {
    for (const status of [200, 403]) {
      const fetchFn = vi.fn(
        async () =>
          new Response("<!doctype html><title>Forbidden</title>", {
            status,
            headers: { "content-type": "text/html; charset=utf-8" },
          }),
      );
      await expect(
        exchangeVscodeLink("https://stella.example", "ABCD2345", fetchFn),
      ).rejects.toThrow(/stella\.serverUrl/);
    }
  });
});
