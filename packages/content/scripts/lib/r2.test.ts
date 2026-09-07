import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createR2Client, putAll } from "./r2.js";

const BUCKET = "stella-materials-public";
const originalFetch = globalThis.fetch;

let dir: string;

beforeEach(() => {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "acct");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "token");
  dir = mkdtempSync(join(tmpdir(), "r2-test-"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.fetch = originalFetch;
  rmSync(dir, { recursive: true, force: true });
});

function stubFetch(
  handler: (url: string, init?: RequestInit) => Response,
): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async (url: string, init?: RequestInit) => handler(String(url), init));
  globalThis.fetch = spy as unknown as typeof fetch;
  return spy;
}

describe("createR2Client (remote)", () => {
  it("キーの / は階層のまま、それ以外はエスケープして PUT する", async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = [];
    stubFetch((url, init) => {
      seen.push({ url, init });
      return new Response("", { status: 200 });
    });
    const file = join(dir, "a.svg");
    writeFileSync(file, "<svg/>");
    await createR2Client(BUCKET, true).putFile("ses/courses/a b.svg", file, "image/svg+xml");
    expect(seen[0]?.url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/acct/r2/buckets/${BUCKET}/objects/ses/courses/a%20b.svg`,
    );
    expect(seen[0]?.init?.method).toBe("PUT");
    const headers = seen[0]?.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token");
    expect(headers["Content-Type"]).toBe("image/svg+xml");
  });

  it("404 は null (台帳の初回)、それ以外の失敗は投げる", async () => {
    stubFetch(() => new Response("nope", { status: 404 }));
    await expect(createR2Client(BUCKET, true).get("lesson-pdf/state.json")).resolves.toBeNull();
    stubFetch(() => new Response("boom", { status: 500 }));
    await expect(createR2Client(BUCKET, true).get("lesson-pdf/state.json")).rejects.toThrow(
      /HTTP 500/,
    );
  });

  it("失敗した PUT は例外にする (黙って成功にしない)", async () => {
    stubFetch(() => new Response("denied", { status: 403 }));
    await expect(
      createR2Client(BUCKET, true).put("k", new TextEncoder().encode("x"), "text/plain"),
    ).rejects.toThrow(/HTTP 403/);
  });

  it("トークンが無ければ落とす", async () => {
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    stubFetch(() => new Response("", { status: 200 }));
    await expect(
      createR2Client(BUCKET, true).put("k", new TextEncoder().encode("x"), "text/plain"),
    ).rejects.toThrow(/CLOUDFLARE_API_TOKEN/);
  });
});

describe("putAll", () => {
  const entries = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      key: `k${i}`,
      file: `f${i}`,
      contentType: "text/plain",
    }));

  it("全件 put する", async () => {
    const put = vi.fn(async () => {
      // put は成功したことにする (ここで見たいのは呼ばれた回数)。
    });
    await putAll({ putFile: put } as never, entries(30), 8);
    expect(put).toHaveBeenCalledTimes(30);
  });

  it("同時実行数を超えない", async () => {
    let running = 0;
    let peak = 0;
    const putFile = vi.fn(async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 1));
      running--;
    });
    await putAll({ putFile } as never, entries(20), 4);
    expect(peak).toBeLessThanOrEqual(4);
  });

  it("同時実行数が 0 や NaN でも 1 件も put しないまま成功しない", async () => {
    // 立てる worker が 0 本だと「何もせず成功」になり、呼び出し側は put 済みとして
    // 台帳に書く。次のデプロイからは R2 に無いオブジェクトを飛ばしてしまう。
    for (const bad of [0, -1, Number.NaN]) {
      const putFile = vi.fn(async () => {
        // put は成功したことにする (ここで見たいのは呼ばれた回数)。
      });
      await putAll({ putFile } as never, entries(3), bad);
      expect(putFile, `concurrency=${bad}`).toHaveBeenCalledTimes(3);
    }
  });

  it("一時的な失敗は再試行する", async () => {
    let attempts = 0;
    const putFile = vi.fn(async () => {
      attempts++;
      if (attempts === 1) throw new Error("Unspecified error (0)");
    });
    await putAll({ putFile } as never, entries(1), 1);
    expect(attempts).toBe(2);
  });
});
