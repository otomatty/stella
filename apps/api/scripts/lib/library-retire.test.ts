import { describe, expect, it, vi } from "vitest";
import { LIBRARY_BUCKET_NAME, retireLibraryStorage } from "./library-retire.js";

const account = "a".repeat(32);
const token = "test-token";
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/stella-library-private`;
const existing = () => Response.json({ success: true, result: { name: LIBRARY_BUCKET_NAME } });
const notEmpty = () =>
  Response.json(
    { success: false, errors: [{ code: 10008, message: "Bucket not empty" }] },
    { status: 409 },
  );

describe("retire personal library storage", () => {
  it("404: succeeds without modifying anything", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }));
    await expect(retireLibraryStorage(account, token, fetcher)).resolves.toBe("absent");
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      base,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("deletes an empty bucket with fixed URL, credentials and timeout", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(existing())
      .mockResolvedValueOnce(Response.json({ success: true }));
    const timeout = vi.spyOn(AbortSignal, "timeout");
    try {
      await expect(retireLibraryStorage(account, token, fetcher)).resolves.toBe("deleted");
      expect(fetcher).toHaveBeenCalledTimes(2);
      for (const [i, method] of ["GET", "DELETE"].entries()) {
        expect(fetcher).toHaveBeenNthCalledWith(i + 1, base, {
          method,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          signal: expect.any(AbortSignal),
          redirect: "error",
        });
      }
      expect(timeout.mock.calls).toEqual([[30_000], [30_000]]);
    } finally {
      timeout.mockRestore();
    }
  });

  it("schedules all objects and multipart uploads for deletion after one day when not empty", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(existing())
      .mockResolvedValueOnce(notEmpty())
      .mockResolvedValueOnce(Response.json({ success: true }));
    await expect(retireLibraryStorage(account, token, fetcher)).resolves.toBe("scheduled");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      `${base}/lifecycle`,
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          rules: [
            {
              id: "retire-personal-library-2026-11",
              enabled: true,
              conditions: { prefix: "" },
              deleteObjectsTransition: { condition: { type: "Age", maxAge: 86400 } },
              abortMultipartUploadsTransition: { condition: { type: "Age", maxAge: 86400 } },
            },
          ],
        }),
      }),
    );
  });

  it.each(["GET", "DELETE", "PUT"])(
    "fails on other %s errors, exposing only codes and messages",
    async (method) => {
      const fetcher = vi.fn<typeof fetch>();
      if (method !== "GET") fetcher.mockResolvedValueOnce(existing());
      if (method === "PUT") fetcher.mockResolvedValueOnce(notEmpty());
      fetcher.mockResolvedValueOnce(
        Response.json(
          {
            success: false,
            errors: [{ code: 10000, message: `Authentication error ${token}` }],
            private: "do not log this",
          },
          { status: 403 },
        ),
      );
      await expect(retireLibraryStorage(account, token, fetcher)).rejects.toThrow(
        "10000: Authentication error [redacted]",
      );
      expect(fetcher).toHaveBeenCalledTimes(method === "GET" ? 1 : method === "DELETE" ? 2 : 3);
    },
  );

  it("does not treat a different conflict as a nonempty bucket", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(existing())
      .mockResolvedValueOnce(
        Response.json(
          { success: false, errors: [{ code: 10073, message: "Bucket conflict" }] },
          { status: 409 },
        ),
      );
    await expect(retireLibraryStorage(account, token, fetcher)).rejects.toThrow(
      "10073: Bucket conflict",
    );
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(["GET", "DELETE", "PUT"])("stops on an unexpected bucket name in %s", async (method) => {
    const fetcher = vi.fn<typeof fetch>();
    if (method !== "GET") fetcher.mockResolvedValueOnce(existing());
    if (method === "PUT") fetcher.mockResolvedValueOnce(notEmpty());
    fetcher.mockResolvedValueOnce(
      Response.json({ success: true, result: { name: "stella-materials-public" } }),
    );
    await expect(retireLibraryStorage(account, token, fetcher)).rejects.toThrow(
      "Unexpected library bucket",
    );
    expect(fetcher).toHaveBeenCalledTimes(method === "GET" ? 1 : method === "DELETE" ? 2 : 3);
  });

  it.each(["", "a".repeat(31), "g".repeat(32), "../other-account"])(
    "rejects an invalid account before fetching: %s",
    async (accountId) => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(retireLibraryStorage(accountId, token, fetcher)).rejects.toThrow(
        "Cloudflare account and API token are required",
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("rejects an empty token", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(retireLibraryStorage(account, "", fetcher)).rejects.toThrow(
      "Cloudflare account and API token are required",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not leak network errors or non-JSON response bodies", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error(`private ${token}`));
    await expect(retireLibraryStorage(account, token, fetcher)).rejects.toThrow(
      "Library bucket request failed (network or timeout)",
    );
    fetcher.mockResolvedValueOnce(new Response(`private ${token}`, { status: 502 }));
    await expect(retireLibraryStorage(account, token, fetcher)).rejects.toThrow(
      "Library bucket request failed: HTTP 502",
    );
  });
});
