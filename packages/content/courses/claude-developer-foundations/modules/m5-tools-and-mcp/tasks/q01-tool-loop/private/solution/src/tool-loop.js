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
export async function runToolLoop({ send, request, handlers, maxTurns = 5 }) {
  const messages = [...request.messages];
  for (let turn = 1; turn <= maxTurns; turn++) {
    const message = await send({ ...request, messages: [...messages] });
    messages.push({ role: "assistant", content: message.content });
    if (message.stop_reason !== "tool_use") {
      return {
        stopReason: message.stop_reason,
        text: textOf(message.content),
        messages,
        turns: turn,
      };
    }
    const results = [];
    for (const block of message.content) {
      if (block.type === "tool_use") results.push(await run(block, handlers));
    }
    messages.push({ role: "user", content: results });
  }
  return { stopReason: "max_turns", text: "", messages, turns: maxTurns };
}

async function run(block, handlers) {
  const handler = handlers[block.name];
  if (!handler) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      is_error: true,
      content: `知らないツールです: ${block.name}`,
    };
  }
  return {
    type: "tool_result",
    tool_use_id: block.id,
    content: await handler(block.input),
  };
}

function textOf(content) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}
