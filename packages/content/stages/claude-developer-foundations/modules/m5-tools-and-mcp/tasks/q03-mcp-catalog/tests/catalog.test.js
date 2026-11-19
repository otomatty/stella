import { describe, expect, test, vi } from "vitest";
import { callTool, listTools, readResource } from "../src/catalog.js";

const reader = ["stock:read"];
const guideUri = "catalog://warehouse/categories";
const request = (args) => ({ name: "find_stock", arguments: args });

describe("品目表と在庫照会", () => {
  test("在庫閲覧権限に合わせて検索だけを列挙する", () => {
    expect(listTools([])).toEqual({ resultType: "complete", tools: [] });
    const listing = listTools(reader);
    expect(listing.resultType).toBe("complete");
    expect(listing.tools).toHaveLength(1);
    const tool = listing.tools[0];
    expect(tool.name).toBe("find_stock");
    expect(tool.description.trim().length).toBeGreaterThan(0);
    expect(tool.inputSchema).toMatchObject({
      type: "object",
      required: ["sku"],
      additionalProperties: false,
    });
    expect(Object.keys(tool.inputSchema.properties)).toEqual(["sku"]);
    const sku = tool.inputSchema.properties.sku;
    expect(sku.type).toBe("string");
    expect(typeof sku.pattern).toBe("string");
    const pattern = new RegExp(sku.pattern);
    expect(pattern.test("Z-019")).toBe(true);
    for (const bad of ["A-1234", "a-123", "AA-123", "X-01"]) {
      expect(pattern.test(bad)).toBe(false);
    }
  });

  test("分類表の URI・本文・種類を contents に返す", () => {
    for (const text of ["A は部品", "A は部品、B は備品"]) {
      expect(readResource(guideUri, text)).toEqual({
        resultType: "complete",
        contents: [{ uri: guideUri, mimeType: "text/plain", text }],
      });
    }
    expect(() => readResource("catalog://warehouse/archive", "旧版")).toThrow(
      "unknown_resource",
    );
  });

  test("未許可の直接呼び出しや未知のツールで台帳を読まない", () => {
    const lookup = vi.fn();
    expect(() =>
      callTool(request({ sku: "A-100", scopes: reader }), [], lookup),
    ).toThrow("forbidden");
    expect(() =>
      callTool(
        { name: "reserve_stock", arguments: { sku: "A-100" } },
        reader,
        lookup,
      ),
    ).toThrow("unknown_tool");
    expect(lookup).not.toHaveBeenCalled();
  });

  test("間違った品番や余分な引数には、直せる失敗を返す", () => {
    const lookup = vi.fn();
    for (const args of [
      undefined,
      null,
      [],
      {},
      { sku: 12 },
      { sku: "a-100" },
      { sku: "A-100", count: 7 },
    ]) {
      const reply = callTool(request(args), reader, lookup);
      expect(reply).toMatchObject({
        resultType: "complete",
        isError: true,
        content: [{ type: "text" }],
      });
      expect(reply.content[0].text).toContain("sku");
    }
    expect(lookup).not.toHaveBeenCalled();
  });

  test("台帳の値を読み、在庫ゼロと未登録を区別する", () => {
    const lookup = vi.fn((sku) => ({ "A-100": 0, "B-009": 17 })[sku] ?? null);
    for (const [sku, count] of [
      ["B-009", 17],
      ["A-100", 0],
    ]) {
      const reply = callTool(request({ sku }), reader, lookup);
      expect(reply.resultType).toBe("complete");
      expect(reply.isError).not.toBe(true);
      expect(reply.content).toHaveLength(1);
      expect(reply.content[0].type).toBe("text");
      expect(JSON.parse(reply.content[0].text)).toEqual({ sku, count });
    }
    const missing = callTool(request({ sku: "Z-123" }), reader, lookup);
    expect(missing).toMatchObject({
      resultType: "complete",
      isError: true,
      content: [{ type: "text" }],
    });
    expect(missing.content[0].text).toContain("Z-123");
    expect(lookup.mock.calls).toEqual([["B-009"], ["A-100"], ["Z-123"]]);
  });
});
