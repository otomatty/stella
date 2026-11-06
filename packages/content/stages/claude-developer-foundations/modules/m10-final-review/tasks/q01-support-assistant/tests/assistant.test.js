import { describe, expect, test, vi } from "vitest";
import {
  answerInquiry,
  lookupOrderTool,
  replySchema,
} from "../src/assistant.js";
import {
  apiError,
  fakeClient,
  finalReply,
  message,
  thinking,
  toolUse,
} from "./fake-client.js";

const ORDER = {
  order_id: "A-1024",
  status: "shipped",
  shipped_on: "2026-10-29",
  refund_deadline: "2026-11-12",
};

const REPLY = {
  answer: "ご注文 A-1024 は 10 月 29 日に発送しました。",
  category: "shipping",
  needs_human: false,
};

function options(client, overrides = {}) {
  return {
    client,
    model: "claude-sonnet-5-5",
    maxTokens: 1024,
    question: "注文 A-1024 はいつ届きますか？",
    handlers: { lookup_order: vi.fn(async () => ORDER) },
    maxRetries: 3,
    ...overrides,
  };
}

const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isType(type, value) {
  if (type === "null") return value === null;
  if (type === "object") return isObject(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

// テスト用の小さな検査器。type・enum・properties・required・additionalProperties を見る。
function matches(schema, value) {
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => isType(type, value))) return false;
  }
  if (isObject(value) && schema.properties) {
    if (!(schema.required ?? []).every((key) => key in value)) return false;
    for (const [key, child] of Object.entries(value)) {
      const childSchema = schema.properties[key];
      if (!childSchema) {
        if (schema.additionalProperties === false) return false;
      } else if (!matches(childSchema, child)) return false;
    }
  }
  return true;
}

describe("lookupOrderTool", () => {
  test("lookup_order という名前で、説明があり、strict を付ける", () => {
    expect(lookupOrderTool.name).toBe("lookup_order");
    expect(typeof lookupOrderTool.description).toBe("string");
    expect(lookupOrderTool.description.trim()).not.toBe("");
    expect(lookupOrderTool.strict).toBe(true);
  });

  test("入力は文字列の order_id だけで、必須にし、ほかの項目を認めない", () => {
    const schema = lookupOrderTool.input_schema;
    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties)).toEqual(["order_id"]);
    expect(schema.properties.order_id.type).toBe("string");
    expect(schema.required).toEqual(["order_id"]);
    expect(schema.additionalProperties).toBe(false);
  });
});

describe("replySchema", () => {
  test("answer・category・needs_human をすべて必須にし、ほかの項目を認めない", () => {
    expect(replySchema.type).toBe("object");
    const fields = ["answer", "category", "needs_human"];
    expect(Object.keys(replySchema.properties).sort()).toEqual(fields);
    expect([...replySchema.required].sort()).toEqual(fields);
    expect(replySchema.additionalProperties).toBe(false);
  });

  test("category は 3 つの種類だけ、needs_human は真偽値にする", () => {
    expect(replySchema.properties.answer.type).toBe("string");
    expect([...replySchema.properties.category.enum].sort()).toEqual([
      "other",
      "refund",
      "shipping",
    ]);
    expect(replySchema.properties.needs_human.type).toBe("boolean");
  });

  test("代表の答えが合い、形の違う答えは合わない", () => {
    expect(matches(replySchema, REPLY)).toBe(true);
    expect(matches(replySchema, { ...REPLY, category: "delivery" })).toBe(
      false,
    );
    expect(matches(replySchema, { ...REPLY, needs_human: "no" })).toBe(false);
    expect(matches(replySchema, { ...REPLY, extra: 1 })).toBe(false);
    const missing = { answer: REPLY.answer, category: REPLY.category };
    expect(matches(replySchema, missing)).toBe(false);
  });
});

describe("answerInquiry のリクエスト", () => {
  test("質問を messages に入れ、ツールと構造化出力を付けて送る", async () => {
    const client = fakeClient([finalReply(REPLY)]);
    await answerInquiry(options(client));
    const { body } = client.calls[0];
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.max_tokens).toBe(1024);
    expect(typeof body.system).toBe("string");
    expect(body.system.trim()).not.toBe("");
    expect(body.messages).toEqual([
      { role: "user", content: "注文 A-1024 はいつ届きますか？" },
    ]);
    expect(body.tools).toEqual([lookupOrderTool]);
    expect(body.output_config).toEqual({
      format: { type: "json_schema", schema: replySchema },
    });
  });

  test("送り直しの回数を、リクエストごとに SDK へ渡す", async () => {
    const client = fakeClient([
      toolUse(["toolu_01", "lookup_order", { order_id: "A-1024" }]),
      finalReply(REPLY),
    ]);
    await answerInquiry(options(client, { maxRetries: 5 }));
    expect(client.calls).toHaveLength(2);
    for (const call of client.calls) {
      expect(call.options).toEqual({ maxRetries: 5 });
      expect(call.body.tools).toEqual([lookupOrderTool]);
      expect(call.body.output_config).toEqual({
        format: { type: "json_schema", schema: replySchema },
      });
    }
  });
});

describe("ツール使用のループ", () => {
  test("ツールを実行して結果を返し、最後の答えを読む", async () => {
    const call = toolUse(["toolu_01", "lookup_order", { order_id: "A-1024" }]);
    const client = fakeClient([call, finalReply(REPLY)]);
    const input = options(client);
    const result = await answerInquiry(input);

    expect(input.handlers.lookup_order).toHaveBeenCalledWith({
      order_id: "A-1024",
    });
    expect(client.calls[1].body.messages).toEqual([
      { role: "user", content: "注文 A-1024 はいつ届きますか？" },
      { role: "assistant", content: call.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_01",
            content: JSON.stringify(ORDER),
          },
        ],
      },
    ]);
    expect(result).toEqual({ status: "answered", reply: REPLY, turns: 2 });
  });

  test("thinking ブロックも含めて、応答の content をそのまま返す", async () => {
    const call = toolUse(["toolu_01", "lookup_order", { order_id: "A-1024" }]);
    const client = fakeClient([call, finalReply(REPLY)]);
    await answerInquiry(options(client));
    const assistant = client.calls[1].body.messages[1];
    expect(assistant.content[0]).toEqual(call.content[0]);
    expect(assistant.content[0].type).toBe("thinking");
    expect(assistant.content).toHaveLength(call.content.length);
  });

  test("1 つの応答の呼び出しは、すべての結果を 1 つの user の発言にまとめる", async () => {
    const client = fakeClient([
      toolUse(
        ["toolu_01", "lookup_order", { order_id: "A-1024" }],
        ["toolu_02", "lookup_order", { order_id: "B-2048" }],
      ),
      finalReply(REPLY),
    ]);
    const lookup = vi.fn(async ({ order_id }) => ({ ...ORDER, order_id }));
    await answerInquiry(
      options(client, { handlers: { lookup_order: lookup } }),
    );

    const messages = client.calls[1].body.messages;
    expect(messages).toHaveLength(3);
    expect(messages[2].role).toBe("user");
    expect(messages[2].content.map((block) => block.tool_use_id)).toEqual([
      "toolu_01",
      "toolu_02",
    ]);
    expect(JSON.parse(messages[2].content[1].content).order_id).toBe("B-2048");
  });

  test("知らないツールは、is_error を付けた結果で返して続ける", async () => {
    const client = fakeClient([
      toolUse(["toolu_09", "cancel_order", { order_id: "A-1024" }]),
      finalReply({ ...REPLY, needs_human: true }),
    ]);
    const result = await answerInquiry(options(client));
    const [toolResult] = client.calls[1].body.messages[2].content;
    expect(toolResult.type).toBe("tool_result");
    expect(toolResult.tool_use_id).toBe("toolu_09");
    expect(toolResult.is_error).toBe(true);
    expect(toolResult.content).toContain("cancel_order");
    expect(result.status).toBe("answered");
  });

  test("ツールが例外を投げたら、is_error を付けた結果で理由を返して続ける", async () => {
    const client = fakeClient([
      toolUse(["toolu_01", "lookup_order", { order_id: "Z-0000" }]),
      finalReply({ ...REPLY, needs_human: true }),
    ]);
    const failing = vi.fn(async () => {
      throw new Error("注文が見つかりません");
    });
    const result = await answerInquiry(
      options(client, { handlers: { lookup_order: failing } }),
    );
    const [toolResult] = client.calls[1].body.messages[2].content;
    expect(toolResult.tool_use_id).toBe("toolu_01");
    expect(toolResult.is_error).toBe(true);
    expect(toolResult.content).toContain("注文が見つかりません");
    expect(result).toEqual({
      status: "answered",
      reply: { ...REPLY, needs_human: true },
      turns: 2,
    });
  });

  test("maxTurns 回送っても答えが出なければ、max_turns で止める", async () => {
    const calls = Array.from({ length: 5 }, (_, index) =>
      toolUse([`toolu_${index}`, "lookup_order", { order_id: "A-1024" }]),
    );
    const client = fakeClient(calls);
    const result = await answerInquiry(options(client, { maxTurns: 2 }));
    expect(client.calls).toHaveLength(2);
    expect(result).toEqual({ status: "max_turns", turns: 2 });
  });

  test("maxTurns を省略すると 4 回まで送る", async () => {
    const calls = Array.from({ length: 5 }, (_, index) =>
      toolUse([`toolu_${index}`, "lookup_order", { order_id: "A-1024" }]),
    );
    const client = fakeClient(calls);
    const result = await answerInquiry(options(client));
    expect(client.calls).toHaveLength(4);
    expect(result).toEqual({ status: "max_turns", turns: 4 });
  });
});

describe("止まった理由", () => {
  test("end_turn なら、thinking ブロックを飛ばしてテキストの JSON を読む", async () => {
    const client = fakeClient([finalReply(REPLY)]);
    const result = await answerInquiry(options(client));
    expect(result).toEqual({ status: "answered", reply: REPLY, turns: 1 });
  });

  test("refusal なら、拒否として返し、ツールは実行しない", async () => {
    const client = fakeClient([message("refusal", [])]);
    const input = options(client);
    const result = await answerInquiry(input);
    expect(result).toEqual({ status: "refused", turns: 1 });
    expect(input.handlers.lookup_order).not.toHaveBeenCalled();
  });

  test("max_tokens で切れた答えは、JSON として読まずに truncated で返す", async () => {
    const cut = message("max_tokens", [
      thinking("sig-cut"),
      { type: "text", text: '{"answer": "ご注文 A-1024 は' },
    ]);
    const client = fakeClient([cut]);
    const result = await answerInquiry(options(client));
    expect(result).toEqual({
      status: "truncated",
      stopReason: "max_tokens",
      turns: 1,
    });
  });

  test("model_context_window_exceeded も、切れた答えとして返す", async () => {
    const client = fakeClient([
      message("model_context_window_exceeded", [
        { type: "text", text: '{"answer"' },
      ]),
    ]);
    const result = await answerInquiry(options(client));
    expect(result).toEqual({
      status: "truncated",
      stopReason: "model_context_window_exceeded",
      turns: 1,
    });
  });

  test("扱いを決めていない値は、unexpected として値と一緒に返す", async () => {
    const client = fakeClient([message("stop_sequence", [])]);
    const result = await answerInquiry(options(client));
    expect(result).toEqual({
      status: "unexpected",
      stopReason: "stop_sequence",
      turns: 1,
    });
  });
});

describe("エラー", () => {
  test.each([429, 500, 529])(
    "%i は、SDK が送り直したあとのエラーとして、重ねて送り直さずに返す",
    async (status) => {
      const client = fakeClient([apiError(status), finalReply(REPLY)]);
      const result = await answerInquiry(options(client));
      expect(result).toEqual({ status: "unavailable", httpStatus: status });
      expect(client.calls).toHaveLength(1);
    },
  );

  test("ツールを使ったあとのエラーも、同じように返す", async () => {
    const client = fakeClient([
      toolUse(["toolu_01", "lookup_order", { order_id: "A-1024" }]),
      apiError(529),
    ]);
    const result = await answerInquiry(options(client));
    expect(result).toEqual({ status: "unavailable", httpStatus: 529 });
    expect(client.calls).toHaveLength(2);
  });

  test("400 のような一時的でないエラーは、そのまま投げる", async () => {
    const error = apiError(400, "max_tokens が大きすぎます");
    const client = fakeClient([error]);
    await expect(answerInquiry(options(client))).rejects.toBe(error);
    expect(client.calls).toHaveLength(1);
  });

  test("status を持たないエラーも、そのまま投げる", async () => {
    const error = new TypeError("handlers が渡されていません");
    const client = fakeClient([error]);
    await expect(answerInquiry(options(client))).rejects.toBe(error);
  });
});
