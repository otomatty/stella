const statusByReason = new Map([
  ["end_turn", "complete"],
  ["stop_sequence", "complete"],
  ["max_tokens", "truncated"],
  ["model_context_window_exceeded", "truncated"],
  ["refusal", "refused"],
]);

export function renderStream(events) {
  let text = "";
  let reason = null;

  for (const event of events) {
    switch (event.type) {
      case "content_block_delta":
        if (event.delta.type === "text_delta") text += event.delta.text;
        break;
      case "message_delta":
        reason = event.delta.stop_reason ?? reason;
        break;
      case "message_stop": {
        const status = statusByReason.get(reason);
        return status
          ? { text, status, detail: null }
          : { text, status: "unknown", detail: reason };
      }
      case "error":
        return { text, status: "failed", detail: event.error.type };
    }
  }

  return { text, status: "interrupted", detail: null };
}
