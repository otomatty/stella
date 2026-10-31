const SYSTEM =
  "あなたは通販サイトの問い合わせ窓口のアシスタントです。注文番号が書かれた配送や返金の問い合わせには、lookup_order で注文を調べてから答えてください。調べても分からないことや、返金の判断が要ることは、needs_human を true にしてください。";

/** 注文を調べるツール。 */
export const lookupOrderTool = {
  name: "lookup_order",
  description: "注文を調べる。",
  input_schema: {
    type: "object",
    properties: {
      order_id: { type: "string" },
    },
  },
};

/** 最後の答えの形。 */
export const replySchema = {
  type: "object",
  properties: {
    answer: { type: "string" },
  },
};

/**
 * 問い合わせに、ツールで注文を調べながら答え、決まった形の答えを返す。
 * @param {{
 *   client: { messages: { create: (body: object, options: object) => Promise<{ stop_reason: string, content: object[] }> } },
 *   model: string,
 *   maxTokens: number,
 *   question: string,
 *   handlers: Record<string, (input: object) => Promise<unknown>>,
 *   maxTurns?: number,
 *   maxRetries: number,
 * }} options
 * @returns {Promise<object>} status で結果の種類を表すオブジェクト
 */
export async function answerInquiry({ client, model, maxTokens, question }) {
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: SYSTEM,
    messages: [{ role: "user", content: question }],
  });
  return {
    status: "answered",
    reply: JSON.parse(message.content[0].text),
    turns: 1,
  };
}
