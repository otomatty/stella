/**
 * ツールで取った外の文章を、データとして tool_result に入れる。
 * @param {string} toolUseId 結果を返す tool_use ブロックの id
 * @param {{ source: string } & Record<string, string>} item 外から取った内容 (出どころの source と、本文などの項目)
 * @returns {{ type: "tool_result", tool_use_id: string, content: { type: "text", text: string }[] }}
 */
export function wrapUntrusted(toolUseId, item) {
  return {
    type: "tool_result",
    tool_use_id: toolUseId,
    content: [
      {
        type: "text",
        text: `次のメールを要約してください。\n<email>${item.body}</email>`,
      },
    ],
  };
}

/**
 * tool_result の並びと、アプリからの指示を、1 つの user の発言にする。
 * @param {object[]} results tool_result の配列
 * @param {string} [instruction] アプリからの指示
 * @returns {{ role: "user", content: object[] }}
 */
export function toolResultTurn(results, instruction) {
  const [first, ...rest] = results;
  const withInstruction = {
    ...first,
    content: [...first.content, { type: "text", text: instruction }],
  };
  return { role: "user", content: [withInstruction, ...rest] };
}
