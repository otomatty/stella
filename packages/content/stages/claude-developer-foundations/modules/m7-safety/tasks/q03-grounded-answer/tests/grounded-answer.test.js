import { describe, expect, test } from "vitest";
import {
  buildGroundedRequest,
  readGroundedAnswer,
} from "../src/grounded-answer.js";

const SYSTEM =
  "渡した資料だけを使って答えてください。資料に答えが無いときは、「資料に該当する記載がありません。」だけを返してください。";

const manual = {
  title: "点検手引き",
  text: "棚の耐荷重は 80 kg です。屋内専用です。",
};
const hours = { title: "受付案内", text: "受付は 16 時までです。" };

function request(documents, question = "棚の耐荷重はいくらですか。") {
  return buildGroundedRequest({
    model: "claude-opus-5-5",
    maxTokens: 1024,
    documents,
    question,
  });
}

function cite(title, quote) {
  return {
    type: "char_location",
    cited_text: quote,
    document_index: 0,
    document_title: title,
    start_char_index: 0,
    end_char_index: quote.length,
  };
}

describe("buildGroundedRequest", () => {
  test("文書を順に並べ、質問を最後にし、引用をすべて有効にする", () => {
    expect(request([manual, hours], "屋外で使えますか。")).toEqual({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "text",
                media_type: "text/plain",
                data: manual.text,
              },
              title: "点検手引き",
              citations: { enabled: true },
            },
            {
              type: "document",
              source: {
                type: "text",
                media_type: "text/plain",
                data: hours.text,
              },
              title: "受付案内",
              citations: { enabled: true },
            },
            { type: "text", text: "屋外で使えますか。" },
          ],
        },
      ],
    });
  });

  test("構造化出力の設定を付けない", () => {
    const body = request([manual]);
    expect(body).not.toHaveProperty("output_config");
    expect(body).not.toHaveProperty("output_format");
  });

  test("資料が空なら例外を投げ、配列は書き換えない", () => {
    expect(() => request([])).toThrow(/資料がありません/);
    expect(() =>
      buildGroundedRequest({
        model: "claude-opus-5-5",
        maxTokens: 8,
        documents: undefined,
        question: "質問",
      }),
    ).toThrow(/資料がありません/);
    const kept = [manual];
    const snapshot = structuredClone(kept);
    request(kept);
    expect(kept).toEqual(snapshot);
  });
});

describe("readGroundedAnswer", () => {
  test("引用の無い前置きを外し、引用の付いた文だけを残す", () => {
    expect(
      readGroundedAnswer({
        stop_reason: "end_turn",
        content: [
          { type: "thinking", thinking: "手引きを見る" },
          { type: "text", text: "手元の知識では、" },
          {
            type: "text",
            text: "棚の耐荷重は 80 kg です。",
            citations: [cite("点検手引き", "棚の耐荷重は 80 kg です。")],
          },
        ],
      }),
    ).toEqual({
      status: "answered",
      text: "棚の耐荷重は 80 kg です。",
      sources: [{ title: "点検手引き", quote: "棚の耐荷重は 80 kg です。" }],
    });
  });

  test("同じ引用は 1 件にし、出てきた順を保つ", () => {
    const load = cite("点検手引き", "棚の耐荷重は 80 kg です。");
    const indoor = cite("点検手引き", "屋内専用です。");
    expect(
      readGroundedAnswer({
        stop_reason: "end_turn",
        content: [
          {
            type: "text",
            text: "耐荷重は 80 kg です。",
            citations: [load, indoor],
          },
          { type: "text", text: "屋内専用です。", citations: [load] },
        ],
      }),
    ).toEqual({
      status: "answered",
      text: "耐荷重は 80 kg です。屋内専用です。",
      sources: [
        { title: "点検手引き", quote: "棚の耐荷重は 80 kg です。" },
        { title: "点検手引き", quote: "屋内専用です。" },
      ],
    });
  });

  test("決まった返事だけ、引用の無い主張だけは not_found", () => {
    expect(
      readGroundedAnswer({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "資料に該当する記載がありません。" }],
      }),
    ).toEqual({ status: "not_found" });
    expect(
      readGroundedAnswer({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "屋外でも使えます。" }],
      }),
    ).toEqual({ status: "not_found" });
  });

  test("拒否と上限は本文より先に返す", () => {
    const cited = {
      type: "text",
      text: "棚の耐荷重は 80 kg です。",
      citations: [cite("点検手引き", "棚の耐荷重は 80 kg です。")],
    };
    expect(
      readGroundedAnswer({ stop_reason: "refusal", content: [cited] }),
    ).toEqual({ status: "refused" });
    expect(
      readGroundedAnswer({ stop_reason: "max_tokens", content: [cited] }),
    ).toEqual({ status: "truncated" });
  });
});
