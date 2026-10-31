/**
 * 会話の履歴と新しい発言から、Messages API に送るリクエストを組み立てる。
 * @param {{ role: "user" | "assistant", content: string }[]} history これまでのやり取り
 * @param {string} userText 利用者の新しい発言
 * @param {{ model: string, system: string, maxTokens: number }} options
 * @returns {object} Messages API のリクエスト
 */
export function buildRequest(history, userText, options) {
  return {
    model: options.model,
    max_tokens: options.maxTokens,
    messages: [],
  };
}

/**
 * 応答の content から、テキストのブロックの文字だけをつないで返す。
 * @param {{ content: { type: string, text?: string }[] }} response Messages API の応答
 * @returns {string}
 */
export function textOf(response) {
  return response.content[0]?.text ?? "";
}
