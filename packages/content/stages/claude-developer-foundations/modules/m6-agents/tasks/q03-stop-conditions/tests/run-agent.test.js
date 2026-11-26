import { expect, it, vi } from "vitest";
import { runAgent } from "../src/run-agent.js";

const text = (value) => Object.freeze({ type: "text", text: value });
const toolUse = (id, name, input) =>
  Object.freeze({ type: "tool_use", id, name, input: Object.freeze(input) });
const reply = (stop_reason, blocks, outputTokens = 1) =>
  Object.freeze({
    stop_reason,
    content: Object.freeze(blocks),
    usage: Object.freeze({ input_tokens: 16, output_tokens: outputTokens }),
  });

function setup(replies, limits = {}) {
  const send = vi.fn(async () => {
    const next = replies.shift();
    if (!next) throw new Error("送信回数が想定を超えました");
    return next;
  });
  const options = Object.freeze({
    prompt: "伝票 A17 の配送状況を教えてください。",
    maxTurns: 12,
    maxBudgetUsd: 5,
    priceOf: vi.fn((usage) => usage.output_tokens / 16),
    ...limits,
  });
  return { send, options };
}

it("同じ応答のツール結果を ID で結び、履歴と最終テキストを返す", async () => {
  const first = reply("tool_use", [
    text("配送記録を調べます。"),
    toolUse("toolu_scan", "lookup", { parcel: "A17" }),
    toolUse("toolu_missing", "missing", {}),
    toolUse("toolu_estimate", "estimate", { parcel: "A17" }),
  ]);
  const last = reply(
    "end_turn",
    [text("配送中です。"), text("到着日は未定です。")],
    3,
  );
  const { send, options } = setup([first, last]);
  const lookup = vi.fn(async () => "輸送中");
  const estimate = vi.fn(() => {
    throw new Error("到着予定が未登録です");
  });

  const result = await runAgent(
    send,
    Object.freeze({ lookup, estimate }),
    options,
  );

  expect(lookup).toHaveBeenCalledWith({ parcel: "A17" });
  expect(estimate).toHaveBeenCalledWith({ parcel: "A17" });
  expect(options.priceOf.mock.calls).toEqual([[first.usage], [last.usage]]);
  const initial = { role: "user", content: options.prompt };
  const assistant = { role: "assistant", content: first.content };
  const results = {
    role: "user",
    content: [
      { type: "tool_result", tool_use_id: "toolu_scan", content: "輸送中" },
      expect.objectContaining({
        type: "tool_result",
        tool_use_id: "toolu_missing",
        is_error: true,
        content: expect.stringMatching(/\S/),
      }),
      expect.objectContaining({
        type: "tool_result",
        tool_use_id: "toolu_estimate",
        is_error: true,
        content: expect.stringMatching(/\S/),
      }),
    ],
  };
  expect(send.mock.calls).toEqual([
    [[initial]],
    [[initial, assistant, results]],
  ]);
  expect(result).toEqual({
    subtype: "success",
    result: "配送中です。到着日は未定です。",
    numTurns: 2,
    totalCostUsd: 0.25,
    messages: [
      initial,
      assistant,
      results,
      { role: "assistant", content: last.content },
    ],
  });
});

const paused = reply("pause_turn", [
  text("配送会社のお知らせを調べます。"),
  Object.freeze({
    type: "server_tool_use",
    id: "srvtoolu_notice",
    name: "web_search",
    input: { query: "配送 運休" },
  }),
]);

it("一時停止の内容を保って3回まで送り直せる", async () => {
  const { send, options } = setup([
    paused,
    paused,
    paused,
    reply("end_turn", [text("通常運行です。")]),
  ]);
  const search = vi.fn();
  const result = await runAgent(send, { web_search: search }, options);
  const assistant = { role: "assistant", content: paused.content };

  expect(result).toMatchObject({
    subtype: "success",
    result: "通常運行です。",
    numTurns: 4,
  });
  expect(send.mock.calls[3][0]).toEqual([
    { role: "user", content: options.prompt },
    assistant,
    assistant,
    assistant,
  ]);
  expect(search).not.toHaveBeenCalled();
});

it("連続4回目の一時停止で打ち切る", async () => {
  const { send, options } = setup([paused, paused, paused, paused]);
  const result = await runAgent(send, {}, options);

  expect(result).toMatchObject({
    subtype: "error_during_execution",
    result: null,
    numTurns: 4,
    totalCostUsd: 0.25,
  });
  expect(result.messages).toHaveLength(5);
  expect(send).toHaveBeenCalledTimes(4);
});

it("ツールを処理したあとには一時停止の連続回数が戻る", async () => {
  const lookup = reply("tool_use", [
    toolUse("toolu_scan", "lookup", { parcel: "A17" }),
  ]);
  const { send, options } = setup([
    paused,
    paused,
    paused,
    lookup,
    paused,
    reply("end_turn", [text("確認できました。")]),
  ]);

  expect(
    await runAgent(send, { lookup: () => "輸送中" }, options),
  ).toMatchObject({
    subtype: "success",
    numTurns: 6,
  });
});

it("オブジェクトのキー順と呼び出し ID が違っても同じ失敗の連続で止まる", async () => {
  const first = reply("tool_use", [
    toolUse("toolu_a", "lookup", { parcel: "A17", depot: "北" }),
  ]);
  const second = reply("tool_use", [
    toolUse("toolu_b", "lookup", { depot: "北", parcel: "A17" }),
    toolUse("toolu_c", "lookup", { parcel: "B21" }),
  ]);
  const { send, options } = setup([first, second]);
  const lookup = vi.fn(({ parcel }) => {
    if (parcel === "A17") throw new Error("見つかりません");
    return "輸送中";
  });
  const result = await runAgent(send, { lookup }, options);

  expect(result).toMatchObject({
    subtype: "error_during_execution",
    result: null,
    numTurns: 2,
  });
  expect(result.messages.at(-1)).toEqual({
    role: "user",
    content: [
      expect.objectContaining({ tool_use_id: "toolu_b", is_error: true }),
      expect.objectContaining({ tool_use_id: "toolu_c", content: "輸送中" }),
    ],
  });
  expect(send).toHaveBeenCalledTimes(2);
});

it("成功、別の入力、別のツールが間に入ったら連続した同じ失敗に数えない", async () => {
  const calls = reply("tool_use", [
    toolUse("toolu_a", "lookup", { parcel: "A17" }),
    toolUse("toolu_b", "lookup", { parcel: "B21" }),
    toolUse("toolu_c", "lookup", { parcel: "A17" }),
    toolUse("toolu_d", "estimate", { parcel: "A17" }),
    toolUse("toolu_e", "lookup", { parcel: "A17" }),
    toolUse("toolu_f", "notice", {}),
    toolUse("toolu_g", "lookup", { parcel: "A17" }),
  ]);
  const fail = () => {
    throw new Error("見つかりません");
  };
  const { send, options } = setup([
    calls,
    reply("end_turn", [text("記録がありません。")]),
  ]);

  expect(
    await runAgent(
      send,
      { lookup: fail, estimate: fail, notice: () => "通常運行" },
      options,
    ),
  ).toMatchObject({
    subtype: "success",
    numTurns: 2,
  });
});

it("同じ未知のツールが1つの応答内で続けて失敗したら止まる", async () => {
  const { send, options } = setup([
    reply("tool_use", [
      toolUse("toolu_a", "toString", {}),
      toolUse("toolu_b", "toString", {}),
    ]),
  ]);
  const result = await runAgent(send, {}, options);

  expect(result).toMatchObject({
    subtype: "error_during_execution",
    result: null,
    numTurns: 1,
  });
  expect(result.messages.at(-1).content).toEqual([
    expect.objectContaining({ tool_use_id: "toolu_a", is_error: true }),
    expect.objectContaining({ tool_use_id: "toolu_b", is_error: true }),
  ]);
});

it.each([
  [{ maxTurns: 2 }, "error_max_turns"],
  [{ maxBudgetUsd: 0.25 }, "error_max_budget_usd"],
  [{ maxTurns: 2, maxBudgetUsd: 0.25 }, "error_max_budget_usd"],
])(
  "送信の上限を確かめ、届いた応答の費用と履歴は残す (%j)",
  async (limits, subtype) => {
    const lookup = reply(
      "tool_use",
      [toolUse("toolu_scan", "lookup", { parcel: "A17" })],
      3,
    );
    const { send, options } = setup([paused, lookup], limits);
    const result = await runAgent(send, { lookup: () => "輸送中" }, options);

    expect(result).toMatchObject({
      subtype,
      result: null,
      numTurns: 2,
      totalCostUsd: 0.25,
    });
    expect(result.messages.map(({ role }) => role)).toEqual([
      "user",
      "assistant",
      "assistant",
      "user",
    ]);
    expect(send).toHaveBeenCalledTimes(2);
  },
);

it("最後の送信で end_turn が届けば、上限に達していても成功を返す", async () => {
  const { send, options } = setup([reply("end_turn", [text("配送中です。")])], {
    maxTurns: 1,
    maxBudgetUsd: 0.0625,
  });
  expect(await runAgent(send, {}, options)).toMatchObject({
    subtype: "success",
    result: "配送中です。",
    numTurns: 1,
    totalCostUsd: 0.0625,
  });
});

it("扱いを決めていない停止理由では本文を回答にしない", async () => {
  const partial = reply("max_tokens", [text("配送状況は")]);
  const { send, options } = setup([partial]);
  const result = await runAgent(send, {}, options);

  expect(result).toMatchObject({
    subtype: "error_during_execution",
    result: null,
    numTurns: 1,
  });
  expect(result.messages.at(-1)).toEqual({
    role: "assistant",
    content: partial.content,
  });
});
