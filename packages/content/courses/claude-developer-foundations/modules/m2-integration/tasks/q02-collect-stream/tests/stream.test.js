import { describe, expect, test } from "vitest";
import { collectStream } from "../src/stream.js";

const start = {
  type: "message_start",
  message: { content: [], stop_reason: null },
};
const blockStart = (index, type) => ({
  type: "content_block_start",
  index,
  content_block:
    type === "text"
      ? { type, text: "" }
      : { type, id: "toolu_01", name: "find_order", input: {} },
});
const textDelta = (index, text) => ({
  type: "content_block_delta",
  index,
  delta: { type: "text_delta", text },
});
const blockStop = (index) => ({ type: "content_block_stop", index });
const messageDelta = (stopReason) => ({
  type: "message_delta",
  delta: { stop_reason: stopReason, stop_sequence: null },
  usage: { output_tokens: 15 },
});
const stop = { type: "message_stop" };

describe("collectStream", () => {
  test("本文の差分を届いた順につなぎ、止まった理由を返す", () => {
    const events = [
      start,
      blockStart(0, "text"),
      textDelta(0, "注文 A-1024 は"),
      textDelta(0, "明日届きます。"),
      blockStop(0),
      messageDelta("end_turn"),
      stop,
    ];
    expect(collectStream(events)).toEqual({
      text: "注文 A-1024 は明日届きます。",
      stopReason: "end_turn",
    });
  });

  test("ping や知らない種類のイベントは読み飛ばす", () => {
    const events = [
      start,
      { type: "ping" },
      blockStart(0, "text"),
      textDelta(0, "確認します。"),
      { type: "future_event", payload: {} },
      blockStop(0),
      messageDelta("end_turn"),
      stop,
    ];
    expect(collectStream(events)).toEqual({
      text: "確認します。",
      stopReason: "end_turn",
    });
  });

  test("ツールの入力の差分は本文に入れない", () => {
    const events = [
      start,
      blockStart(0, "text"),
      textDelta(0, "注文を調べます。"),
      blockStop(0),
      blockStart(1, "tool_use"),
      {
        type: "content_block_delta",
        index: 1,
        delta: { type: "input_json_delta", partial_json: '{"id": "A-' },
      },
      {
        type: "content_block_delta",
        index: 1,
        delta: { type: "input_json_delta", partial_json: '1024"}' },
      },
      blockStop(1),
      messageDelta("tool_use"),
      stop,
    ];
    expect(collectStream(events)).toEqual({
      text: "注文を調べます。",
      stopReason: "tool_use",
    });
  });

  test("テキストのブロックが 2 つあれば、続けてつなぐ", () => {
    const events = [
      start,
      blockStart(0, "text"),
      textDelta(0, "前半。"),
      blockStop(0),
      blockStart(1, "text"),
      textDelta(1, "後半。"),
      blockStop(1),
      messageDelta("max_tokens"),
      stop,
    ];
    expect(collectStream(events)).toEqual({
      text: "前半。後半。",
      stopReason: "max_tokens",
    });
  });

  test("message_delta がまだ届いていなければ、止まった理由は null", () => {
    const events = [start, blockStart(0, "text"), textDelta(0, "途中まで")];
    expect(collectStream(events)).toEqual({
      text: "途中まで",
      stopReason: null,
    });
  });
});
