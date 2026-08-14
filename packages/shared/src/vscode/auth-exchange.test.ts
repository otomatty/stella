import { describe, expect, it, vi } from "vitest";
import { exchangeVscodeLink } from "./auth-exchange.js";

describe("exchangeVscodeLink", () => {
  it("returns access_token on 200", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "jwt-1" }), { status: 200 }),
    );
    const token = await exchangeVscodeLink("http://127.0.0.1:8787", "ABCD2345", fetchFn);
    expect(token).toBe("jwt-1");
    expect(fetchFn).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/auth/vscode-link/exchange",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws on 401", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ error: "接続コードが無効です" }), { status: 401 }),
    );
    await expect(
      exchangeVscodeLink("http://127.0.0.1:8787", "NOPE", fetchFn),
    ).rejects.toThrow(/無効/);
  });
});
