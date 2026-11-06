import { describe, expect, test } from "vitest";
import { buildRequest, textOf } from "../src/conversation.js";

const options = {
  model: "claude-opus-5-5",
  system: "あなたは社内ヘルプデスクの担当者です",
  maxTokens: 1024,
};

const history = [
  { role: "user", content: "注文の状況を教えて" },
  { role: "assistant", content: "注文番号を教えてください" },
];

describe("buildRequest", () => {
  test("それまでのやり取りのあとに、新しい発言を user として足す", () => {
    const request = buildRequest(history, "A-1024 です", options);
    expect(request.messages).toEqual([
      { role: "user", content: "注文の状況を教えて" },
      { role: "assistant", content: "注文番号を教えてください" },
      { role: "user", content: "A-1024 です" },
    ]);
  });

  test("役割は system に置き、messages に混ぜない", () => {
    const request = buildRequest(history, "A-1024 です", options);
    expect(request.system).toBe("あなたは社内ヘルプデスクの担当者です");
    expect(
      request.messages.some((message) =>
        message.content.includes("ヘルプデスク"),
      ),
    ).toBe(false);
  });

  test("model と max_tokens を書く", () => {
    const request = buildRequest([], "こんにちは", options);
    expect(request.model).toBe("claude-opus-5-5");
    expect(request.max_tokens).toBe(1024);
    expect(request.messages).toEqual([{ role: "user", content: "こんにちは" }]);
  });

  test("渡された履歴の配列は書き換えない", () => {
    const before = structuredClone(history);
    buildRequest(history, "A-1024 です", options);
    expect(history).toEqual(before);
  });
});

describe("textOf", () => {
  test("テキストのブロックをすべてつなぐ", () => {
    const response = {
      content: [
        { type: "text", text: "注文 A-1024 は" },
        { type: "text", text: "明日届きます。" },
      ],
    };
    expect(textOf(response)).toBe("注文 A-1024 は明日届きます。");
  });

  test("テキスト以外のブロックは飛ばす", () => {
    const response = {
      content: [
        {
          type: "tool_use",
          id: "toolu_01",
          name: "find_order",
          input: { id: "A-1024" },
        },
        { type: "text", text: "確認します。" },
      ],
    };
    expect(textOf(response)).toBe("確認します。");
  });

  test("content が空なら空の文字列を返す", () => {
    expect(textOf({ content: [] })).toBe("");
  });
});
