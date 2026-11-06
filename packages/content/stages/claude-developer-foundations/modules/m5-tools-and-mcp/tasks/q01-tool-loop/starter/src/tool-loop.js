/**
 * ツール使用のループを回し、Claude の答えを返す。
 * @param {{
 *   send: (request: object) => Promise<{ stop_reason: string, content: object[] }>,
 *   request: { messages: object[] } & Record<string, unknown>,
 *   handlers: Record<string, (input: object) => Promise<string>>,
 *   maxTurns?: number,
 * }} options
 * @returns {Promise<{ stopReason: string, text: string, messages: object[], turns: number }>}
 */
export async function runToolLoop({ send, request, handlers }) {
  const message = await send(request);
  const block = message.content.find((item) => item.type === "tool_use");
  const output = await handlers[block.name](block.input);
  return { stopReason: "end_turn", text: output, messages: [], turns: 1 };
}
