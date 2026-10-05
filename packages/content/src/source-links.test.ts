import { describe, expect, it, vi } from "vitest";
import {
  checkSourceLink,
  type FetchSource,
  findManualConfirmation,
  missingSourceSections,
  parseManualLinkChecks,
  type SourceLinkResult,
  sourceSections,
} from "./source-links.js";
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
  it("不正なパーセントエンコードのアンカーは通信の失敗にせず、生の値で照合する", async () => {
    const src = { ...source, url: `${source.url}#a%E0` };
    const response = (body: string) =>
      new Response(body, { headers: { "content-type": "text/html" } });
    expect((await checkSourceLink(src, async () => response('<h2 id="a%E0">A</h2>'))).status).toBe(
      "available",
    );
    expect((await checkSourceLink(src, async () => response("no section"))).reason).toBe(
      "anchor-missing",
    );
  });
  describe("台帳の読む節 (section) だけで場所を示す資料", () => {
    const html = (body: string) =>
      new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
    const page = [
      '<h1 id="creating">HTML: ウェブサイトのコンテンツの作成</h1>',
      '<h2 id="what"><a href="#what">HTMLとは</a></h2>',
      '<h3 id="first">初めての&nbsp;HTML&#x3000;文書の作成</h3>',
      "<H2>3.1 見出し &amp; 段落</H2>",
    ].join("\n");
    const sectioned = { ...source, section: "HTML とは / 初めての HTML 文書の作成 / 見出し" };
    it("` / ` で区切った節を、空白・全角・タグ・文字参照の違いを吸収して見出しと照合する", async () => {
      expect(sourceSections(sectioned.section)).toEqual([
        "HTML とは",
        "初めての HTML 文書の作成",
        "見出し",
      ]);
      expect(sourceSections("Request/Response の違い")).toEqual(["Request/Response の違い"]);
      const fetcher = vi.fn<FetchSource>(async () => html(page));
      expect(await checkSourceLink(sectioned, fetcher)).toMatchObject({
        status: "available",
        reason: "ok",
      });
      // HEAD では節を確かめられないので、最初から本文を取る。
      expect(fetcher.mock.calls.map((c) => c[1].method)).toEqual(["GET"]);
    });
    it("ページが残っていても節の見出しが消えたら、削除ではなく手動確認に回す", async () => {
      const result = await checkSourceLink(
        { ...sectioned, section: "HTML とは / 属性 / 見出し" },
        async () => html(page),
      );
      expect(result).toMatchObject({
        status: "manual-confirmation",
        reason: "section-missing",
        httpStatus: 200,
        missingSections: ["属性"],
      });
    });
    it("本文中の語だけでは節の見出しとみなさない", () => {
      expect(
        missingSourceSections("<p>属性について</p><h2>見出し</h2>", ["属性", "見出し"]),
      ).toEqual(["属性"]);
    });
    it("節が消えても 404 / 410 のときだけ削除にする", async () => {
      expect(
        await checkSourceLink(sectioned, async () => new Response(null, { status: 404 })),
      ).toMatchObject({ status: "removed", reason: "http-404" });
    });
    it("書籍の節は紹介ページに載らないので照合しない", async () => {
      const fetcher = vi.fn<FetchSource>(async () => html("<h1>書誌</h1>"));
      expect(await checkSourceLink({ ...sectioned, kind: "book" }, fetcher)).toMatchObject({
        status: "available",
      });
      expect(fetcher.mock.calls.map((c) => c[1].method)).toEqual(["HEAD"]);
    });
    it("URL の # と台帳の節を両方確かめる", async () => {
      const src = { ...sectioned, url: `${source.url}#what` };
      expect((await checkSourceLink(src, async () => html(page))).status).toBe("available");
      expect(
        (await checkSourceLink({ ...src, section: "属性" }, async () => html(page))).reason,
      ).toBe("section-missing");
    });
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
  describe("手動確認は確かめた読む節と理由にだけ効く", () => {
    const now = new Date("2026-10-08T00:00:00Z");
    const registered = { ...source, section: "HTML とは / 見出し" };
    const sectionMissing: SourceLinkResult = {
      sourceRef: source.id,
      url: source.url,
      checkedAt: now.toISOString(),
      status: "manual-confirmation",
      reason: "section-missing",
      httpStatus: 200,
      missingSections: ["見出し"],
    };
    const timeout: SourceLinkResult = {
      sourceRef: source.id,
      url: source.url,
      checkedAt: now.toISOString(),
      status: "manual-confirmation",
      reason: "timeout",
    };
    const record = {
      sourceRef: source.id,
      url: source.url,
      section: registered.section,
      reason: "section-missing",
      missingSections: ["見出し"],
      checkedAt: "2026-10-05",
      reviewer: "teacher",
      result: "available",
      note: "見出しが「見出しと段落」に変わったが同じ内容を確認",
    };
    const [confirmed] = parseManualLinkChecks([record]);
    it("同じ節・理由で、見失った節を確かめた記録を直近7日だけ添える", () => {
      expect(findManualConfirmation(sectionMissing, registered, [confirmed], now)).toBe(confirmed);
      // 見失った節が減っても、確かめた範囲に収まるので添える。
      const [wider] = parseManualLinkChecks([
        { ...record, missingSections: ["HTML とは", "見出し"] },
      ]);
      expect(findManualConfirmation(sectionMissing, registered, [wider], now)).toBe(wider);
      expect(
        findManualConfirmation(
          sectionMissing,
          registered,
          [confirmed],
          new Date("2026-10-12T00:00:01Z"),
        ),
      ).toBeUndefined();
      expect(
        findManualConfirmation(
          sectionMissing,
          registered,
          [confirmed],
          new Date("2026-10-04T00:00:00Z"),
        ),
      ).toBeUndefined();
    });
    it("台帳の読む節を書き換えたら、前の節を確かめた記録を添えない", () => {
      expect(
        findManualConfirmation(
          sectionMissing,
          { section: "HTML とは / 属性 / 見出し" },
          [confirmed],
          now,
        ),
      ).toBeUndefined();
    });
    it("理由が変わったら、別の理由を確かめた記録を添えない", () => {
      const [timeoutCheck] = parseManualLinkChecks([
        { ...record, reason: "timeout", missingSections: undefined },
      ]);
      expect(findManualConfirmation(timeout, registered, [timeoutCheck], now)).toBe(timeoutCheck);
      // 先週はタイムアウトで確かめたが、今週は節の見出しが消えた。
      expect(
        findManualConfirmation(sectionMissing, registered, [timeoutCheck], now),
      ).toBeUndefined();
      expect(findManualConfirmation(timeout, registered, [confirmed], now)).toBeUndefined();
    });
    it("新たに見失った節は確かめた範囲に入らない", () => {
      expect(
        findManualConfirmation(
          { ...sectionMissing, missingSections: ["HTML とは", "見出し"] },
          registered,
          [confirmed],
          now,
        ),
      ).toBeUndefined();
    });
    it("節・理由の無い記録 (節の照合より前の形) は読めるが、どの結果にも添えない", () => {
      const [legacy] = parseManualLinkChecks([
        {
          sourceRef: source.id,
          url: source.url,
          checkedAt: "2026-10-05",
          reviewer: "teacher",
          result: "available",
          note: "ブラウザーでページを確認",
        },
      ]);
      expect(legacy.reason).toBeUndefined();
      expect(findManualConfirmation(sectionMissing, registered, [legacy], now)).toBeUndefined();
      expect(findManualConfirmation(timeout, registered, [legacy], now)).toBeUndefined();
    });
    it.each([
      ["reason だけ欠けた記録", { reason: undefined }, "reason"],
      ["section だけ欠けた記録", { section: undefined }, "section"],
      ["未知の理由", { reason: "ok" }, "reason"],
      ["見失った節の無い section-missing", { missingSections: [] }, "missingSections"],
      ["section-missing 以外の見失った節", { reason: "timeout" }, "missingSections"],
    ])("確かめた内容が読めない記録を拒否する: %s", (_label, change, message) => {
      expect(() => parseManualLinkChecks([{ ...record, ...change }])).toThrow(message);
    });
  });
});
