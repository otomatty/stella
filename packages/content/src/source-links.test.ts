import { describe, expect, it, vi } from "vitest";
import { checkSourceLink, parseManualLinkChecks } from "./source-links.js";
const source = { id: "SRC-test", url: "https://example.org/docs/specific-page" };
describe("参照元のリンク確認", () => {
  it.each([404, 410])("HTTP %s は削除として記録する", async (status) => {
    expect(await checkSourceLink(source, async () => new Response(null, { status }))).toMatchObject(
      { status: "removed", httpStatus: status },
    );
  });
  it.each([401, 403, 429, 451, 500, 502])(
    "HTTP %s は削除と分けて手動確認を求める",
    async (status) => {
      expect(
        await checkSourceLink(source, async () => new Response(null, { status })),
      ).toMatchObject({ status: "manual-confirmation", httpStatus: status });
    },
  );
  it("HEAD が禁止されている資料は GET で確認する", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response("ok"));
    expect((await checkSourceLink(source, fetcher)).status).toBe("available");
    expect(fetcher.mock.calls.map((c) => c[1].method)).toEqual(["HEAD", "GET"]);
  });
  it("タイムアウトと通信障害を別の手動確認として記録する", async () => {
    const fetcher = (_url: string, init: RequestInit): Promise<Response> =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    expect((await checkSourceLink(source, fetcher, 5)).reason).toBe("timeout");
    expect(
      (
        await checkSourceLink(source, async () => {
          throw new Error("network");
        })
      ).reason,
    ).toBe("network-error");
  });
  it("消えた節は手動確認、見つかった節は応答確認済みとする", async () => {
    const src = { ...source, url: source.url + "#topic" };
    const response = (body: string) =>
      new Response(body, { headers: { "content-type": "text/html" } });
    expect(
      (await checkSourceLink(src, async () => response('<h2 id="topic">Topic</h2>'))).status,
    ).toBe("available");
    expect((await checkSourceLink(src, async () => response("no section"))).reason).toBe(
      "anchor-missing",
    );
  });
  it("手動確認には確認者・結果・日時・内容を残す", () => {
    const record = {
      sourceRef: source.id,
      url: source.url,
      checkedAt: "2026-10-05",
      reviewer: "teacher",
      result: "available",
      note: "ブラウザーで節を確認",
    };
    expect(parseManualLinkChecks([record])).toHaveLength(1);
    expect(() => parseManualLinkChecks([{ ...record, note: "" }])).toThrow("note");
  });
});
