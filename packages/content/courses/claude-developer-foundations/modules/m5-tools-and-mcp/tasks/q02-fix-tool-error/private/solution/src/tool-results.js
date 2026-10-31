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
    results.push(await runTool(block, tools));
  }
  return { role: "user", content: results };
}

// 失敗は例外で止めず、is_error の結果として Claude に返す。
async function runTool(block, tools) {
  const tool = tools[block.name];
  if (!tool) return failure(block, `知らないツールです: ${block.name}`);
  try {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: await tool(block.input),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return failure(block, `ツールの実行に失敗しました: ${reason}`);
  }
}

function failure(block, message) {
  return {
    type: "tool_result",
    tool_use_id: block.id,
    is_error: true,
    content: message,
  };
}
