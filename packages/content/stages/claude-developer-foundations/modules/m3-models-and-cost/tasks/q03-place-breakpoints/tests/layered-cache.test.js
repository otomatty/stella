import { describe, expect, it } from "vitest";
import { buildLayeredRequest, findCacheBreak } from "../src/layered-cache.js";

const inputs = {
  model: "claude-haiku-5-5",
  maxTokens: 256,
  tools: Object.freeze([
    { name: "lookup_shelf", input_schema: { type: "object", properties: {} } },
    { name: "lookup_hours", input_schema: { type: "object", properties: {} } },
  ]),
  instructions: "貸出資料を基に窓口を案内する。",
  policy: "東棟の窓口は午後4時に閉まります。",
  question: "窓口は何時までですか。",
};

function breakpoint(text) {
  return { type: "text", text, cache_control: { type: "ephemeral" } };
}

function request(overrides = {}) {
  return {
    model: inputs.model,
    max_tokens: inputs.maxTokens,
    tools: structuredClone(inputs.tools),
    system: [breakpoint(inputs.instructions), breakpoint(inputs.policy)],
    messages: [{ role: "user", content: inputs.question }],
    ...overrides,
  };
}

describe("更新頻度に合わせた本文", () => {
  it("入力の順でツールを並べ、指示と資料だけに区切りを置く", () => {
    expect(buildLayeredRequest(inputs)).toEqual(request());
    expect(inputs.tools.map((tool) => tool.name)).toEqual([
      "lookup_shelf",
      "lookup_hours",
    ]);
  });

  it("資料が空なら指示の区切りだけにする", () => {
    expect(buildLayeredRequest({ ...inputs, policy: "" })).toEqual(
      request({ system: [breakpoint(inputs.instructions)] }),
    );
  });
});

describe("今回の最後の区切りまでの違い", () => {
  it("モデルが変わればツールより先に報告する", () => {
    expect(
      findCacheBreak(
        request(),
        request({ model: "claude-opus-5-5", tools: [] }),
      ),
    ).toEqual({ layer: "model", blockIndex: null });
  });

  it("ツールの並びが変われば指示より先に報告する", () => {
    const next = request();
    next.tools.reverse();
    next.system[0].text = "窓口の場所だけ案内する。";
    expect(findCacheBreak(request(), next)).toEqual({
      layer: "tools",
      blockIndex: null,
    });
  });

  it("同じ名前でもツールの入力スキーマが変われば報告する", () => {
    const next = request();
    next.tools[0].input_schema.properties.shelf = { type: "integer" };
    expect(findCacheBreak(request(), next)).toEqual({
      layer: "tools",
      blockIndex: null,
    });
  });

  it("空だった資料が足されたときは 2 ブロック目の違いを返す", () => {
    expect(
      findCacheBreak(
        request({ system: [breakpoint(inputs.instructions)] }),
        request(),
      ),
    ).toEqual({ layer: "system", blockIndex: 1 });
  });

  it.each([
    [0, "貸し出せる場合だけ窓口を案内する。"],
    [1, "東棟の窓口は午後5時に閉まります。"],
  ])("system のブロック %i の変更を報告する", (index, changed) => {
    const next = request();
    next.system[index].text = changed;
    expect(findCacheBreak(request(), next)).toEqual({
      layer: "system",
      blockIndex: index,
    });
  });

  it("今回の区切りが指示までなら前回の資料は比較しない", () => {
    expect(
      findCacheBreak(
        request(),
        request({ system: [breakpoint(inputs.instructions)] }),
      ),
    ).toEqual({ layer: null, blockIndex: null });
  });

  it("質問と出力の上限だけが違っても前半は一致する", () => {
    const next = request({
      max_tokens: 512,
      messages: [{ role: "user", content: "土曜も開いていますか。" }],
    });
    expect(findCacheBreak(request(), next)).toEqual({
      layer: null,
      blockIndex: null,
    });
  });

  it("質問自体が最後の区切りなら、その違いを報告する", () => {
    const previous = request({
      messages: [{ role: "user", content: [breakpoint(inputs.question)] }],
    });
    const next = request({
      messages: [
        { role: "user", content: [breakpoint("土曜も開いていますか。")] },
      ],
    });
    expect(findCacheBreak(previous, next)).toEqual({
      layer: "messages",
      blockIndex: null,
    });
  });

  it("発言の途中に区切りがあればその後のブロックは比較しない", () => {
    function withQuestion(text) {
      return request({
        messages: [
          {
            role: "user",
            content: [breakpoint("東棟の窓口"), { type: "text", text }],
          },
        ],
      });
    }
    expect(
      findCacheBreak(
        withQuestion(inputs.question),
        withQuestion("土曜も開いていますか。"),
      ),
    ).toEqual({ layer: null, blockIndex: null });
  });

  it("最後の区切りがツールの途中なら後続のツールと指示は比較しない", () => {
    function toolPrefix(secondToolName) {
      return request({
        tools: [
          { ...inputs.tools[0], cache_control: { type: "ephemeral" } },
          { ...inputs.tools[1], name: secondToolName },
        ],
        system: [{ type: "text", text: inputs.instructions }],
      });
    }
    expect(
      findCacheBreak(toolPrefix("lookup_hours"), toolPrefix("lookup_lockers")),
    ).toEqual({ layer: null, blockIndex: null });
  });

  it("同じモデルで区切りがない場合は比較する前半がない", () => {
    const next = request({
      system: [{ type: "text", text: "新しい共通の指示" }],
    });
    expect(findCacheBreak(request(), next)).toEqual({
      layer: null,
      blockIndex: null,
    });
  });
});
