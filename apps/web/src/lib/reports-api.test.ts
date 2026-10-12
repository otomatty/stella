import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
vi.mock("./api-client", () => ({
  apiFetch: async (path: string) => {
    calls.push(path);
    const offset = Number(new URL(path, "https://x.test").searchParams.get("offset"));
    // 1 ページ目は 1000 件、2 ページ目は 1 件 (合計 1001 件)。
    const rows = Array.from({ length: offset === 0 ? 1000 : 1 }, (_, i) => ({
      id: `${offset + i}`,
    }));
    return { report: { type: "enrollments", from: null, to: null, total: 1001, rows } };
  },
}));

import { fetchAllReportRows, fetchReport } from "./reports-api";

beforeEach(() => {
  calls.length = 0;
});

describe("レポートの書き出しの印 (持ち出しの検知の材料)", () => {
  it("CSV の書き出しは先頭ページにだけ export=1 を付ける", async () => {
    const rows = await fetchAllReportRows("enrollments", { from: null, to: null });
    expect(rows).toHaveLength(1001);
    expect(calls.map((c) => new URL(c, "https://x.test").searchParams.get("export"))).toEqual([
      "1",
      null,
    ]);
  });

  it("画面のプレビューには付けない", async () => {
    await fetchReport("enrollments", { from: null, to: null });
    expect(calls[0]).not.toContain("export=");
  });
});
