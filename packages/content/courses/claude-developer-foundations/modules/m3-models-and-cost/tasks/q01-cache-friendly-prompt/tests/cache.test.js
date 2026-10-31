import { describe, expect, test } from "vitest";
import { buildCachedRequest, readCacheUsage } from "../src/cache.js";

const base = {
  model: "claude-sonnet-5-5",
  maxTokens: 1024,
  instructions: "社内の手引きだけを根拠に、質問に答えてください",
  documents: ["手引き 第1章 経費の申請", "手引き 第2章 休暇の申請"],
  now: "2026-10-31 09:00",
  question: "交通費の申請の締め切りはいつですか？",
};

const cacheMarks = (request) =>
  JSON.stringify(request).split('"cache_control"').length - 1;

describe("buildCachedRequest", () => {
  test("指示と資料を system に置き、資料の最後のブロックにだけ cache_control を付ける", () => {
    const request = buildCachedRequest(base);
    expect(request).toEqual({
      model: "claude-sonnet-5-5",
      max_tokens: 1024,
      system: [
        { type: "text", text: base.instructions },
        { type: "text", text: "手引き 第1章 経費の申請" },
        {
          type: "text",
          text: "手引き 第2章 休暇の申請",
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `今の時刻: 2026-10-31 09:00\n\n${base.question}`,
        },
      ],
    });
    expect(cacheMarks(request)).toBe(1);
  });

  test("時刻と質問が変わっても、system は同じになる", () => {
    const first = buildCachedRequest(base);
    const second = buildCachedRequest({
      ...base,
      now: "2026-10-31 09:03",
      question: "有給休暇は何日前に申請しますか？",
    });
    expect(second.system).toEqual(first.system);
    expect(second.messages).not.toEqual(first.messages);
    expect(JSON.stringify(first.system)).not.toContain("09:00");
  });

  test("資料がなければ、指示のブロックに cache_control を付ける", () => {
    const request = buildCachedRequest({ ...base, documents: [] });
    expect(request.system).toEqual([
      {
        type: "text",
        text: base.instructions,
        cache_control: { type: "ephemeral" },
      },
    ]);
  });

  test("ttl が 1h なら、cache_control に ttl を書く", () => {
    const request = buildCachedRequest({ ...base, ttl: "1h" });
    expect(request.system.at(-1).cache_control).toEqual({
      type: "ephemeral",
      ttl: "1h",
    });
    expect(cacheMarks(request)).toBe(1);
  });

  test("ttl が 5m なら、既定の cache_control にする", () => {
    const request = buildCachedRequest({ ...base, ttl: "5m" });
    expect(request.system.at(-1).cache_control).toEqual({ type: "ephemeral" });
  });

  test("受け取った資料の配列を書き換えない", () => {
    const documents = ["手引き 第1章 経費の申請"];
    buildCachedRequest({ ...base, documents });
    expect(documents).toEqual(["手引き 第1章 経費の申請"]);
  });
});

describe("readCacheUsage", () => {
  test("キャッシュから読み込んだときは hit にし、入力の合計を 3 つの和にする", () => {
    expect(
      readCacheUsage({
        input_tokens: 50,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 30000,
      }),
    ).toEqual({
      totalInput: 30050,
      read: 30000,
      written: 0,
      uncached: 50,
      status: "hit",
    });
  });

  test("書き込んだだけのときは write にする", () => {
    expect(
      readCacheUsage({
        input_tokens: 50,
        cache_creation_input_tokens: 30000,
        cache_read_input_tokens: 0,
      }),
    ).toEqual({
      totalInput: 30050,
      read: 0,
      written: 30000,
      uncached: 50,
      status: "write",
    });
  });

  test("読み込みも書き込みもなければ none にする", () => {
    expect(
      readCacheUsage({
        input_tokens: 400,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      }).status,
    ).toBe("none");
  });

  test("キャッシュの値が null や省略のときは 0 として数える", () => {
    expect(
      readCacheUsage({
        input_tokens: 400,
        cache_creation_input_tokens: null,
      }),
    ).toEqual({
      totalInput: 400,
      read: 0,
      written: 0,
      uncached: 400,
      status: "none",
    });
  });
});
