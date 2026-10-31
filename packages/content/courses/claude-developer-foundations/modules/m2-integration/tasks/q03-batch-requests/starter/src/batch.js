/**
 * 問い合わせの一覧から、Message Batches API に送るリクエストの束を作る。
 * @param {{ id: string, body: string }[]} tickets 問い合わせの一覧
 * @param {{ model: string, maxTokens: number, system: string }} options
 * @returns {{ custom_id: string, params: object }[]}
 */
export function buildBatchRequests(tickets, options) {
  return tickets.map((ticket, index) => ({
    custom_id: String(index),
    params: {
      model: options.model,
      max_tokens: options.maxTokens,
      messages: [{ role: "user", content: ticket.body }],
    },
  }));
}

/**
 * バッチの結果を custom_id で引けるようにする。
 * @param {{ custom_id: string, result: { type: string, message?: { content: object[] } } }[]} results
 * @returns {Map<string, { ok: true, text: string } | { ok: false, reason: string }>}
 */
export function matchResults(results) {
  return new Map(results.map((item) => [item.custom_id, item.result]));
}
