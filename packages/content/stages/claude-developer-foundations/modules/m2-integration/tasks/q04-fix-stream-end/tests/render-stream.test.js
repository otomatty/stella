import { describe, expect, it } from "vitest";
import { renderStream } from "../src/render-stream.js";

function block(index, contentBlock, ...deltas) {
  return [
    { type: "content_block_start", index, content_block: contentBlock },
    ...deltas.map((delta) => ({ type: "content_block_delta", index, delta })),
    { type: "content_block_stop", index },
  ];
}

function textBlock(index, ...parts) {
  return block(
    index,
    { type: "text", text: "" },
    ...parts.map((text) => ({ type: "text_delta", text })),
  );
}

function endMessage(stopReason) {
  return [
    {
      type: "message_delta",
      delta: {
        stop_reason: stopReason,
        stop_sequence: stopReason === "stop_sequence" ? "[終了]" : null,
      },
      usage: { output_tokens: 24 },
    },
    { type: "message_stop" },
  ];
}

describe("問い合わせ画面に出す本文と状態", () => {
  it("本文が 1 ブロックの正常な応答を表示する", () => {
    expect(
      renderStream([
        ...textBlock(0, "北口の", "案内所です。"),
        ...endMessage("end_turn"),
      ]),
    ).toEqual({ text: "北口の案内所です。", status: "complete", detail: null });
  });

  it("考える過程を表示せず、後続のテキストを表示する", () => {
    const thinking = block(
      0,
      { type: "thinking", thinking: "", signature: "" },
      { type: "thinking_delta", thinking: "拠点を照合する。" },
      { type: "signature_delta", signature: "test-signature" },
    );
    expect(
      renderStream([
        ...thinking,
        ...textBlock(1, "北口です。"),
        ...endMessage("end_turn"),
      ]),
    ).toEqual({ text: "北口です。", status: "complete", detail: null });
  });

  it("テキストの 2 ブロックを届いた順につなぐ", () => {
    expect(
      renderStream([
        ...textBlock(0, "受け取り場所は、"),
        ...textBlock(1, "北口の案内所です。"),
        ...endMessage("stop_sequence"),
      ]),
    ).toEqual({
      text: "受け取り場所は、北口の案内所です。",
      status: "complete",
      detail: null,
    });
  });

  it.each(["max_tokens", "model_context_window_exceeded"])(
    "%s では上限で切れたと表示する",
    (reason) => {
      expect(
        renderStream([...textBlock(0, "受け取りには"), ...endMessage(reason)]),
      ).toEqual({ text: "受け取りには", status: "truncated", detail: null });
    },
  );

  it("拒否は拒否として表示する", () => {
    expect(
      renderStream([
        ...textBlock(0, "本人確認が必要です。"),
        ...endMessage("refusal"),
      ]),
    ).toEqual({
      text: "本人確認が必要です。",
      status: "refused",
      detail: null,
    });
  });

  it("ツール入力の差分を本文に入れず、分類外の理由を控える", () => {
    expect(
      renderStream([
        ...textBlock(0, "場所を調べます。"),
        ...block(
          1,
          {
            type: "tool_use",
            id: "toolu_test",
            name: "lookup_desk",
            input: {},
          },
          { type: "input_json_delta", partial_json: '{"gate":"north"}' },
        ),
        ...endMessage("tool_use"),
      ]),
    ).toEqual({
      text: "場所を調べます。",
      status: "unknown",
      detail: "tool_use",
    });
  });

  it("本文を受け取っている途中のエラーをその時点の本文と返す", () => {
    const events = [
      ...textBlock(0, "受け取り場所は、").slice(0, -1),
      {
        type: "error",
        error: { type: "overloaded_error", message: "現在混み合っています" },
      },
    ];
    expect(renderStream(events)).toEqual({
      text: "受け取り場所は、",
      status: "failed",
      detail: "overloaded_error",
    });
  });

  it("停止理由が届いても応答の終端がなければ中断とする", () => {
    const events = [...textBlock(0, "北口です。"), endMessage("end_turn")[0]];
    expect(renderStream(events)).toEqual({
      text: "北口です。",
      status: "interrupted",
      detail: null,
    });
  });

  it("ping と将来のイベントを読み飛ばす", () => {
    const [start, first, second, stop] = textBlock(0, "北口の", "案内所です。");
    expect(
      renderStream([
        start,
        first,
        { type: "ping" },
        { type: "future_event" },
        second,
        stop,
        ...endMessage("end_turn"),
      ]),
    ).toEqual({ text: "北口の案内所です。", status: "complete", detail: null });
  });
});
