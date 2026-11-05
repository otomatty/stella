/**
 * 応答の止まった理由 (stop_reason) から、アプリが次にすることを決める。
 * @param {{ content: object[], stop_reason: string, stop_details?: { explanation?: string | null } | null }} response
 *   Messages API の応答
 * @returns {object} 次にすること (README の表を参照)
 */
export function readReply(response) {
  switch (response.stop_reason) {
    case "end_turn":
    case "stop_sequence":
      return { kind: "done", text: textOf(response) };
    case "max_tokens":
    case "model_context_window_exceeded":
      return { kind: "truncated", text: textOf(response) };
    case "tool_use":
      return { kind: "tool", calls: toolCallsOf(response) };
    case "refusal":
      return {
        kind: "refused",
        explanation: response.stop_details?.explanation ?? null,
      };
    default:
      return { kind: "unexpected", stopReason: response.stop_reason };
  }
}

function textOf(response) {
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

function toolCallsOf(response) {
  return response.content
    .filter((block) => block.type === "tool_use")
    .map((block) => ({ id: block.id, name: block.name, input: block.input }));
}
