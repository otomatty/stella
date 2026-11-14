import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ensureMaterialsCors,
  MATERIALS_BUCKET_NAME,
  materialsCorsRules,
} from "./materials-cors.js";

const account = "a".repeat(32);
const webOrigin = "https://stella.saedgewell.workers.dev";

describe("materials bucket CORS deployment", () => {
  it("allows the web and local development to read media with Range requests", async () => {
    const rules = {
      rules: [
        {
          allowed: {
            origins: [webOrigin, "http://localhost:5173", "http://127.0.0.1:5173"],
            methods: ["GET", "HEAD"],
            headers: ["Range"],
          },
          exposeHeaders: ["Content-Length", "Content-Range", "Accept-Ranges"],
          maxAgeSeconds: 3600,
        },
      ],
    };
    expect(materialsCorsRules(webOrigin)).toEqual(rules);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: true }));
    const timeout = vi.spyOn(AbortSignal, "timeout");
    try {
      await ensureMaterialsCors(account, "test-token", webOrigin, fetcher);
      expect(timeout).toHaveBeenCalledWith(30_000);
      expect(fetcher).toHaveBeenCalledExactlyOnceWith(
        `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/stella-materials-public/cors`,
        {
          method: "PUT",
          headers: { Authorization: "Bearer test-token", "Content-Type": "application/json" },
          body: JSON.stringify(rules),
          signal: expect.any(AbortSignal),
        },
      );
    } finally {
      timeout.mockRestore();
    }
  });

  it.each([
    "",
    "not-a-url",
    "http://example.com",
    "https://example.com/",
    "https://example.com/path",
    "https://example.com?query=1",
    "https://example.com#fragment",
    "https://user:password@example.com",
  ])("rejects invalid web origins before fetching: %s", async (origin) => {
    expect(() => materialsCorsRules(origin)).toThrow();
    const fetcher = vi.fn<typeof fetch>();
    await expect(ensureMaterialsCors(account, "test-token", origin, fetcher)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    ["", "test-token"],
    ["a".repeat(31), "test-token"],
    ["a".repeat(33), "test-token"],
    ["g".repeat(32), "test-token"],
    [account, ""],
  ])("rejects invalid account or token inputs: %s", async (accountId, apiToken) => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(ensureMaterialsCors(accountId, apiToken, webOrigin, fetcher)).rejects.toThrow(
      "Cloudflare account and API token are required",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    { status: 403, body: { success: true }, error: "Materials CORS request failed: HTTP 403" },
    { status: 200, body: { success: false }, error: "Materials CORS request was not successful" },
    { status: 200, body: {}, error: "Materials CORS request was not successful" },
    { status: 200, body: null, error: "Materials CORS request was not successful" },
  ])("rejects unsuccessful API responses: $status $body", async ({ status, body, error }) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));
    await expect(ensureMaterialsCors(account, "test-token", webOrigin, fetcher)).rejects.toThrow(
      error,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("targets the materials bucket bound in wrangler.toml", () => {
    const config = readFileSync(join(import.meta.dirname, "../../wrangler.toml"), "utf8");
    const bucket = config
      .split(/^\[\[r2_buckets\]\]\s*$/m)
      .slice(1)
      .map((block) => block.split(/^\[/m)[0] ?? "")
      .find((block) => /^\s*binding\s*=\s*"MATERIALS_BUCKET"/m.test(block));
    expect(bucket?.match(/^\s*bucket_name\s*=\s*"(.+?)"/m)?.[1]).toBe(MATERIALS_BUCKET_NAME);
  });
});
