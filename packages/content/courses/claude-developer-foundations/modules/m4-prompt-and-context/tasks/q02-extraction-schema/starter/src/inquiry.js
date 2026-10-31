/** 問い合わせのメールから取り出す項目の JSON スキーマ。 */
export const inquirySchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string" },
    plan: { type: "string" },
    wants_demo: { type: "boolean" },
    preferred_date: { type: "string", minLength: 10 },
  },
  required: ["name", "plan"],
};

/**
 * 問い合わせのメールから項目を取り出すリクエストを作る。
 * @param {{ model: string, maxTokens: number, email: string }} input
 * @returns {object}
 */
export function buildInquiryRequest(input) {
  return {
    model: input.model,
    max_tokens: input.maxTokens,
    system: `次の形の JSON で答えてください: ${JSON.stringify(inquirySchema)}`,
    messages: [{ role: "user", content: input.email }],
  };
}

/**
 * 構造化出力の応答を、問い合わせの項目として読む。
 * @param {{ stop_reason: string, content: { type: string, text?: string }[] }} message
 * @returns {{ ok: true, data: object } | { ok: false, reason: string }}
 */
export function readInquiry(message) {
  return { ok: true, data: JSON.parse(message.content[0].text) };
}
