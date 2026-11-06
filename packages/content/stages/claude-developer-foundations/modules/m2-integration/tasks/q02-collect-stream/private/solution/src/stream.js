/**
 * ストリーミングのイベントの列から、本文と止まった理由を組み立てる。
 * @param {{ type: string, index?: number, delta?: object }[]} events 届いた順のイベント
 * @returns {{ text: string, stopReason: string | null }}
 */
export function collectStream(events) {
  let text = "";
  let stopReason = null;
  for (const event of events) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      text += event.delta.text;
    } else if (event.type === "message_delta" && event.delta.stop_reason) {
      stopReason = event.delta.stop_reason;
    }
  }
  return { text, stopReason };
}
