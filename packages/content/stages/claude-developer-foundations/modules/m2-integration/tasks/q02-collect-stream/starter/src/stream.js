/**
 * ストリーミングのイベントの列から、本文と止まった理由を組み立てる。
 * @param {{ type: string, index?: number, delta?: object }[]} events 届いた順のイベント
 * @returns {{ text: string, stopReason: string | null }}
 */
export function collectStream(events) {
  let text = "";
  for (const event of events) {
    if (event.type === "content_block_delta") {
      text += event.delta.text;
    }
  }
  return { text, stopReason: null };
}
