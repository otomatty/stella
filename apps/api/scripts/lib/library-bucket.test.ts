import { describe, expect, it, vi } from "vitest";
import { ensurePrivateLibraryBucket } from "./library-bucket.js";
const account = "a".repeat(32);
function response(result: unknown, status = 200): Response {
  return Response.json({ success: status === 200, result }, { status });
}
describe("private library bucket deployment", () => {
  it("creates only a missing fixed bucket, then checks both public domain kinds", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(null, 404))
      .mockResolvedValueOnce(response({ name: "stella-library-private" }))
      .mockResolvedValueOnce(response({ enabled: false }))
      .mockResolvedValueOnce(response({ domains: [] }));
    await ensurePrivateLibraryBucket(account, "test-token", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      body: '{"name":"stella-library-private"}',
    });
  });
  it.each([{ enabled: true }, {}, null])(
    "refuses public or unverifiable r2.dev access: %s",
    async (managed) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(response({ name: "stella-library-private" }))
        .mockResolvedValueOnce(response(managed))
        .mockResolvedValueOnce(response({ domains: [] }));
      await expect(ensurePrivateLibraryBucket(account, "test-token", fetcher)).rejects.toThrow(
        "public domains disabled",
      );
      expect(fetcher.mock.calls.every(([, init]) => !init?.method)).toBe(true);
    },
  );
  it("refuses custom public access and never treats a denied lookup as a missing bucket", async () => {
    const publicBucket = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ name: "stella-library-private" }))
      .mockResolvedValueOnce(response({ enabled: false }))
      .mockResolvedValueOnce(response({ domains: [{ enabled: true }] }));
    await expect(ensurePrivateLibraryBucket(account, "test-token", publicBucket)).rejects.toThrow();
    const denied = vi.fn<typeof fetch>().mockResolvedValue(response(null, 403));
    await expect(ensurePrivateLibraryBucket(account, "test-token", denied)).rejects.toThrow(
      "HTTP 403",
    );
    expect(denied).toHaveBeenCalledTimes(1);
  });
});
