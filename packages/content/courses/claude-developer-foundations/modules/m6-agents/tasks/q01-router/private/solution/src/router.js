/**
 * 分類の結果を、決めた種類の名前にそろえる。どれにも当てはまらなければ null。
 * @param {string} label 分類の呼び出しが返した文字列
 * @param {string[]} categories 決めた種類の名前 (小文字)
 * @returns {string | null}
 */
export function parseCategory(label, categories) {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[.。、,!！?？]+$/u, "");
  return categories.includes(normalized) ? normalized : null;
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
  const { classify, send, routes, fallback } = options;
  if (!routes[fallback])
    throw new Error(`fallback の行き先が routes にありません: ${fallback}`);
  const parsed = parseCategory(await classify(text), Object.keys(routes));
  const category = parsed ?? fallback;
  const route = routes[category];
  const message = await send({
    model: route.model,
    max_tokens: route.maxTokens,
    system: route.system,
    messages: [{ role: "user", content: text }],
  });
  return {
    category,
    model: route.model,
    text: message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(""),
    fellBack: parsed === null,
  };
}
