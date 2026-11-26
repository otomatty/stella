export function renderStream(events) {
  let text = "";
  for (const event of events) {
    switch (event.type) {
      case "content_block_delta":
        if (event.delta.type === "text_delta") text += event.delta.text;
        break;
      case "content_block_stop":
        return { text, status: "complete", detail: null };
      case "message_start":
      case "content_block_start":
      case "message_delta":
      case "message_stop":
      case "ping":
      case "error":
        break;
      default:
        throw new Error(`知らないイベント: ${event.type}`);
    }
  }
  return { text, status: "complete", detail: null };
}
