import { describe, expect, test } from "vitest";
import { readReply } from "../src/reply.js";

const text = (value) => ({ type: "text", text: value });

describe("readReply", () => {
  test("end_turn は答えを終えた応答として本文を返す", () => {
    const response = {
      content: [text("注文 A-1024 は"), text("明日届きます。")],
      stop_reason: "end_turn",
    };
    expect(readReply(response)).toEqual({
      kind: "done",
      text: "注文 A-1024 は明日届きます。",
    });
  });

  test("stop_sequence も答えを終えた応答として扱う", () => {
    const response = {
      content: [text("以上です")],
      stop_reason: "stop_sequence",
    };
    expect(readReply(response)).toEqual({ kind: "done", text: "以上です" });
  });

  test("max_tokens は途中で切れた応答として、受け取った本文を返す", () => {
    const response = {
      content: [text('{"summary": "会議の決')],
      stop_reason: "max_tokens",
    };
    expect(readReply(response)).toEqual({
      kind: "truncated",
      text: '{"summary": "会議の決',
    });
  });

  test("model_context_window_exceeded も途中で切れた応答として扱う", () => {
    const response = {
      content: [text("長い要約の途中")],
      stop_reason: "model_context_window_exceeded",
    };
    expect(readReply(response)).toEqual({
      kind: "truncated",
      text: "長い要約の途中",
    });
  });

  test("tool_use はツールの呼び出しだけを、順に返す", () => {
    const response = {
      content: [
        text("在庫と配送を確認します。"),
        {
          type: "tool_use",
          id: "toolu_01",
          name: "find_stock",
          input: { sku: "B-200" },
        },
        {
          type: "tool_use",
          id: "toolu_02",
          name: "find_delivery",
          input: { order: "A-1024" },
        },
      ],
      stop_reason: "tool_use",
    };
    expect(readReply(response)).toEqual({
      kind: "tool",
      calls: [
        { id: "toolu_01", name: "find_stock", input: { sku: "B-200" } },
        { id: "toolu_02", name: "find_delivery", input: { order: "A-1024" } },
      ],
    });
  });

  test("refusal は拒否として、表示する説明を返す", () => {
    const response = {
      content: [],
      stop_reason: "refusal",
      stop_details: {
        type: "refusal",
        category: "cyber",
        explanation: "この依頼にはお答えできません。",
      },
    };
    expect(readReply(response)).toEqual({
      kind: "refused",
      explanation: "この依頼にはお答えできません。",
    });
  });

  test("refusal の説明が無いときは null にする", () => {
    const withoutCategory = {
      content: [],
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: null, explanation: null },
    };
    expect(readReply(withoutCategory)).toEqual({
      kind: "refused",
      explanation: null,
    });
    expect(
      readReply({ content: [], stop_reason: "refusal", stop_details: null }),
    ).toEqual({
      kind: "refused",
      explanation: null,
    });
  });

  test("ほかの値は、扱いを決めていない応答として値をそのまま返す", () => {
    const response = {
      content: [text("検索を続けます")],
      stop_reason: "pause_turn",
    };
    expect(readReply(response)).toEqual({
      kind: "unexpected",
      stopReason: "pause_turn",
    });
  });
});
