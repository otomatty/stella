/**
 * 応答の tool_use ブロックを順に実行し、結果を返す user の発言を作る。
 * @param {object[]} content 応答の content
 * @param {Record<string, (input: object) => Promise<string>>} tools ツールの名前ごとの関数
 * @returns {Promise<{ role: "user", content: object[] }>}
 */
export async function toToolResults(content, tools) {
  const results = [];
  for (const block of content) {
    if (block.type !== "tool_use") continue;
    const output = await tools[block.name](block.input);
    results.push({
      type: "tool_result",
      tool_use_id: block.id,
      content: output,
    });
  }
  return { role: "user", content: results };
}
