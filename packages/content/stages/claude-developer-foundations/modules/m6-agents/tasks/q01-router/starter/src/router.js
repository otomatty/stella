/**
 * 分類の結果を、決めた種類の名前にそろえる。どれにも当てはまらなければ null。
 * @param {string} label 分類の呼び出しが返した文字列
 * @param {string[]} categories 決めた種類の名前 (小文字)
 * @returns {string | null}
 */
export function parseCategory(label, categories) {
  return categories.includes(label) ? label : null;
}

/**
 * 問い合わせを分類し、種類ごとの指示とモデルで答えさせる。
 * @param {string} text 問い合わせの本文
 * @param {{
 *   classify: (text: string) => Promise<string>,
 *   send: (request: object) => Promise<{ content: { type: string, text?: string }[] }>,
 *   routes: Record<string, { model: string, system: string, maxTokens: number }>,
 *   fallback: string,
 * }} options
 * @returns {Promise<{ category: string, model: string, text: string, fellBack: boolean }>}
 */
export async function routeInquiry(text, options) {
  const route = options.routes[options.fallback];
  const message = await options.send({
    model: route.model,
    max_tokens: route.maxTokens,
    messages: [{ role: "user", content: text }],
  });
  return {
    category: options.fallback,
    model: route.model,
    text: message.content[0].text,
    fellBack: false,
  };
}
