const CUSTOM_ID = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * 問い合わせの一覧から、Message Batches API に送るリクエストの束を作る。
 * @param {{ id: string, body: string }[]} tickets 問い合わせの一覧
 * @param {{ model: string, maxTokens: number, system: string }} options
 * @returns {{ custom_id: string, params: object }[]}
 */
export function buildBatchRequests(tickets, options) {
  const seen = new Set();
  return tickets.map((ticket) => {
    const customId = `ticket-${ticket.id}`;
    if (!CUSTOM_ID.test(customId))
      throw new Error(`custom_id に使えない ID です: ${ticket.id}`);
    if (seen.has(customId))
      throw new Error(`問い合わせの ID が重なっています: ${ticket.id}`);
    seen.add(customId);
    return {
      custom_id: customId,
      params: {
        model: options.model,
        max_tokens: options.maxTokens,
        system: options.system,
        messages: [{ role: "user", content: ticket.body }],
      },
    };
  });
}

/**
 * バッチの結果を custom_id で引けるようにする。
 * @param {{ custom_id: string, result: { type: string, message?: { content: object[] } } }[]} results
 * @returns {Map<string, { ok: true, text: string } | { ok: false, reason: string }>}
 */
export function matchResults(results) {
  return new Map(
    results.map((item) => [item.custom_id, outcomeOf(item.result)]),
  );
}

function outcomeOf(result) {
  if (result.type !== "succeeded") return { ok: false, reason: result.type };
  const text = result.message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  return { ok: true, text };
}
