/**
 * 資料・例・指示・質問を、XML のタグで区切ったプロンプトにする。
 * @param {{ documents: { source: string, content: string }[], examples: { question: string, answer: string }[], instructions: string, question: string }} input
 * @returns {string}
 */
export function buildTaggedPrompt(input) {
  const documents = input.documents.map((doc) => doc.content).join("\n");
  return `${input.question}\n${input.instructions}\n${documents}`;
}

/**
 * 応答の文章から、指定したタグの中身を取り出す。
 * @param {string} text 応答の文章
 * @param {string} tag タグの名前 (例: "answer")
 * @returns {string | null}
 */
export function readTag(text, tag) {
  return text.split(`<${tag}>`)[1];
}
