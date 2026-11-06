import { describe, expect, test } from "vitest";
import { parseCategory, routeInquiry } from "../src/router.js";

const routes = {
  billing: {
    model: "claude-haiku-5-5",
    system: "請求の担当として、請求書と支払いの手順に沿って答えてください。",
    maxTokens: 512,
  },
  technical: {
    model: "claude-opus-5-5",
    system: "技術の担当として、原因の切り分けの手順に沿って答えてください。",
    maxTokens: 2048,
  },
  general: {
    model: "claude-haiku-5-5",
    system: "窓口の担当として、短く丁寧に答えてください。",
    maxTokens: 512,
  },
};

const categories = Object.keys(routes);

function fakeSend(answer) {
  const requests = [];
  const send = async (request) => {
    requests.push(structuredClone(request));
    return { content: [{ type: "text", text: answer }] };
  };
  return { send, requests };
}

describe("parseCategory", () => {
  test("決めた種類と同じなら、そのまま返す", () => {
    expect(parseCategory("billing", categories)).toBe("billing");
  });

  test("前後の空白と大文字・小文字の違いをそろえる", () => {
    expect(parseCategory("  Technical\n", categories)).toBe("technical");
  });

  test("末尾の句読点を外す", () => {
    expect(parseCategory("billing.", categories)).toBe("billing");
    expect(parseCategory("general。", categories)).toBe("general");
  });

  test("決めた種類にない分類は null にする", () => {
    expect(parseCategory("refund", categories)).toBeNull();
    expect(parseCategory("billing and technical", categories)).toBeNull();
    expect(parseCategory("", categories)).toBeNull();
  });
});

describe("routeInquiry", () => {
  test("分類した種類のモデル・指示・上限で答えさせる", async () => {
    const { send, requests } = fakeSend(
      "ネットワークの設定を確かめてください。",
    );
    const result = await routeInquiry("API がタイムアウトします", {
      classify: async () => "technical",
      send,
      routes,
      fallback: "general",
    });
    expect(requests).toEqual([
      {
        model: "claude-opus-5-5",
        max_tokens: 2048,
        system: routes.technical.system,
        messages: [{ role: "user", content: "API がタイムアウトします" }],
      },
    ]);
    expect(result).toEqual({
      category: "technical",
      model: "claude-opus-5-5",
      text: "ネットワークの設定を確かめてください。",
      fellBack: false,
    });
  });

  test("分類には問い合わせの本文を渡す", async () => {
    const seen = [];
    const { send } = fakeSend("再発行します。");
    await routeInquiry("請求書を再発行してください", {
      classify: async (text) => {
        seen.push(text);
        return "Billing";
      },
      send,
      routes,
      fallback: "general",
    });
    expect(seen).toEqual(["請求書を再発行してください"]);
  });

  test("当てはまらない分類は fallback の行き先へ回す", async () => {
    const { send, requests } = fakeSend("担当に確認します。");
    const result = await routeInquiry("返金してほしい", {
      classify: async () => "refund",
      send,
      routes,
      fallback: "general",
    });
    expect(requests[0].model).toBe("claude-haiku-5-5");
    expect(requests[0].system).toBe(routes.general.system);
    expect(result.category).toBe("general");
    expect(result.fellBack).toBe(true);
  });

  test("応答のテキストのブロックをつないで返す", async () => {
    const send = async () => ({
      content: [
        { type: "text", text: "請求書は" },
        { type: "text", text: "マイページから出せます。" },
      ],
    });
    const result = await routeInquiry("請求書はどこ？", {
      classify: async () => "billing",
      send,
      routes,
      fallback: "general",
    });
    expect(result.text).toBe("請求書はマイページから出せます。");
  });

  test("fallback の行き先が routes になければ、送る前にエラーにする", async () => {
    const { send, requests } = fakeSend("");
    await expect(
      routeInquiry("こんにちは", {
        classify: async () => "general",
        send,
        routes,
        fallback: "human",
      }),
    ).rejects.toThrow(/human/);
    expect(requests).toHaveLength(0);
  });
});
