import { describe, expect, test } from "vitest";
import { runToolLoop } from "../src/tool-loop.js";

const tools = [
  {
    name: "get_stock",
    description: "商品コードから在庫数を調べる",
    input_schema: {
      type: "object",
      properties: { sku: { type: "string" } },
      required: ["sku"],
    },
  },
];

const baseRequest = {
  model: "claude-haiku-5-5",
  max_tokens: 1024,
  tools,
  messages: [{ role: "user", content: "A-100 と B-200 の在庫はありますか？" }],
};

const toolUse = (id, name, input) => ({ type: "tool_use", id, name, input });
const text = (value) => ({ type: "text", text: value });

// 決めた順に応答を返し、送られたリクエストを写して残す偽の送信。
function fakeSend(replies) {
  const requests = [];
  const send = async (request) => {
    requests.push(structuredClone(request));
    const reply = replies[requests.length - 1];
    if (!reply) throw new Error("用意した応答より多く送りました");
    return reply;
  };
  return { send, requests };
}

const stockHandlers = {
  get_stock: async ({ sku }) => (sku === "A-100" ? "12" : "0"),
};

describe("runToolLoop", () => {
  test("ツールを実行し、結果を返したあとの答えを返す", async () => {
    const assistantContent = [
      text("在庫を調べます。"),
      toolUse("toolu_1", "get_stock", { sku: "A-100" }),
    ];
    const { send, requests } = fakeSend([
      { stop_reason: "tool_use", content: assistantContent },
      { stop_reason: "end_turn", content: [text("A-100 は 12 個あります。")] },
    ]);
    const result = await runToolLoop({
      send,
      request: baseRequest,
      handlers: stockHandlers,
    });

    expect(result.stopReason).toBe("end_turn");
    expect(result.text).toBe("A-100 は 12 個あります。");
    expect(result.turns).toBe(2);
    expect(requests[1].messages).toEqual([
      baseRequest.messages[0],
      { role: "assistant", content: assistantContent },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "toolu_1", content: "12" },
        ],
      },
    ]);
  });

  test("1 つの応答に呼び出しが複数あれば、結果を 1 つの user の発言で順に返す", async () => {
    const { send, requests } = fakeSend([
      {
        stop_reason: "tool_use",
        content: [
          toolUse("toolu_1", "get_stock", { sku: "A-100" }),
          toolUse("toolu_2", "get_stock", { sku: "B-200" }),
        ],
      },
      {
        stop_reason: "end_turn",
        content: [text("A-100 は 12 個、B-200 は品切れです。")],
      },
    ]);
    await runToolLoop({ send, request: baseRequest, handlers: stockHandlers });

    expect(requests[1].messages.at(-1)).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "toolu_1", content: "12" },
        { type: "tool_result", tool_use_id: "toolu_2", content: "0" },
      ],
    });
  });

  test("ツールに input を渡す", async () => {
    const inputs = [];
    const { send } = fakeSend([
      {
        stop_reason: "tool_use",
        content: [toolUse("toolu_1", "get_stock", { sku: "A-100" })],
      },
      { stop_reason: "end_turn", content: [text("あります。")] },
    ]);
    await runToolLoop({
      send,
      request: baseRequest,
      handlers: {
        get_stock: async (input) => {
          inputs.push(input);
          return "12";
        },
      },
    });
    expect(inputs).toEqual([{ sku: "A-100" }]);
  });

  test("知らないツールの呼び出しは、is_error の結果で返して続ける", async () => {
    const { send, requests } = fakeSend([
      {
        stop_reason: "tool_use",
        content: [toolUse("toolu_1", "delete_item", { sku: "A-100" })],
      },
      { stop_reason: "end_turn", content: [text("その操作はできません。")] },
    ]);
    const result = await runToolLoop({
      send,
      request: baseRequest,
      handlers: stockHandlers,
    });
    const [toolResult] = requests[1].messages.at(-1).content;
    expect(toolResult.tool_use_id).toBe("toolu_1");
    expect(toolResult.is_error).toBe(true);
    expect(toolResult.content).toContain("delete_item");
    expect(result.stopReason).toBe("end_turn");
  });

  test("ツールを呼ばずに答えたら、1 回で終える", async () => {
    const { send, requests } = fakeSend([
      {
        stop_reason: "end_turn",
        content: [text("在庫の確認には商品コードが要ります。")],
      },
    ]);
    const result = await runToolLoop({
      send,
      request: baseRequest,
      handlers: stockHandlers,
    });
    expect(result).toEqual({
      stopReason: "end_turn",
      text: "在庫の確認には商品コードが要ります。",
      messages: [
        baseRequest.messages[0],
        {
          role: "assistant",
          content: [text("在庫の確認には商品コードが要ります。")],
        },
      ],
      turns: 1,
    });
    expect(requests).toHaveLength(1);
  });

  test("tool_use 以外で止まったら、その理由を返す", async () => {
    const { send } = fakeSend([
      { stop_reason: "max_tokens", content: [text("A-100 は")] },
    ]);
    const result = await runToolLoop({
      send,
      request: baseRequest,
      handlers: stockHandlers,
    });
    expect(result.stopReason).toBe("max_tokens");
    expect(result.text).toBe("A-100 は");
  });

  test("maxTurns 回送っても終わらなければ、max_turns で止める", async () => {
    const again = {
      stop_reason: "tool_use",
      content: [toolUse("toolu_x", "get_stock", { sku: "A-100" })],
    };
    const { send, requests } = fakeSend([again, again, again, again]);
    const result = await runToolLoop({
      send,
      request: baseRequest,
      handlers: stockHandlers,
      maxTurns: 3,
    });
    expect(requests).toHaveLength(3);
    expect(result.stopReason).toBe("max_turns");
    expect(result.turns).toBe(3);
  });

  test("model・tools などの項目を毎回送り、受け取った履歴は書き換えない", async () => {
    const original = structuredClone(baseRequest);
    const { send, requests } = fakeSend([
      {
        stop_reason: "tool_use",
        content: [toolUse("toolu_1", "get_stock", { sku: "A-100" })],
      },
      { stop_reason: "end_turn", content: [text("あります。")] },
    ]);
    await runToolLoop({ send, request: baseRequest, handlers: stockHandlers });
    for (const request of requests) {
      expect(request.model).toBe("claude-haiku-5-5");
      expect(request.tools).toEqual(tools);
    }
    expect(baseRequest).toEqual(original);
  });
});
