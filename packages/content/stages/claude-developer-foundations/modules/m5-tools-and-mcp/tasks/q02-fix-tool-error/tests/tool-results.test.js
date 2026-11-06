import { describe, expect, test } from "vitest";
import { toToolResults } from "../src/tool-results.js";

const toolUse = (id, name, input) => ({ type: "tool_use", id, name, input });

const tools = {
  get_stock: async ({ sku }) => (sku === "A-100" ? "12" : "0"),
  get_price: async () => "1,980 円",
};

describe("toToolResults", () => {
  test("呼び出しを順に実行し、結果を 1 つの user の発言で返す", async () => {
    const message = await toToolResults(
      [
        { type: "text", text: "調べます。" },
        toolUse("toolu_1", "get_stock", { sku: "A-100" }),
        toolUse("toolu_2", "get_price", { sku: "A-100" }),
      ],
      tools,
    );
    expect(message).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "toolu_1", content: "12" },
        { type: "tool_result", tool_use_id: "toolu_2", content: "1,980 円" },
      ],
    });
  });

  test("ツールが例外を投げても止まらず、is_error の結果で理由を返す", async () => {
    const message = await toToolResults(
      [toolUse("toolu_1", "get_stock", { sku: "A-100" })],
      {
        get_stock: async () => {
          throw new Error("在庫の API に接続できません");
        },
      },
    );
    const [result] = message.content;
    expect(result.type).toBe("tool_result");
    expect(result.tool_use_id).toBe("toolu_1");
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("在庫の API に接続できません");
  });

  test("1 つのツールが失敗しても、ほかの呼び出しの結果を順に返す", async () => {
    const message = await toToolResults(
      [
        toolUse("toolu_1", "get_stock", { sku: "A-100" }),
        toolUse("toolu_2", "get_price", { sku: "A-100" }),
      ],
      {
        ...tools,
        get_stock: async () => {
          throw new Error("在庫の API に接続できません");
        },
      },
    );
    expect(message.content.map((result) => result.tool_use_id)).toEqual([
      "toolu_1",
      "toolu_2",
    ]);
    expect(message.content[0].is_error).toBe(true);
    expect(message.content[1]).toEqual({
      type: "tool_result",
      tool_use_id: "toolu_2",
      content: "1,980 円",
    });
  });

  test("Error 以外の値が投げられても、その内容を返す", async () => {
    const message = await toToolResults(
      [toolUse("toolu_1", "get_stock", { sku: "A-100" })],
      {
        get_stock: async () => {
          throw "timeout";
        },
      },
    );
    expect(message.content[0].is_error).toBe(true);
    expect(message.content[0].content).toContain("timeout");
  });

  test("知らないツールの呼び出しは、名前を含む is_error の結果で返す", async () => {
    const message = await toToolResults(
      [toolUse("toolu_1", "cancel_order", { id: "O-1" })],
      tools,
    );
    expect(message.content[0].is_error).toBe(true);
    expect(message.content[0].content).toContain("cancel_order");
  });
});
