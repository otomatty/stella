/** MCP の tools/list に渡す結果を作る。scopes は認証層が確認した権限。 */
export function listTools(scopes) {
  // 検索を選ぶための説明と入力スキーマを足してください。
  const tools = scopes.includes("stock:read") ? [{ name: "find_stock" }] : [];
  return { resultType: "complete", tools };
}

/** resources/read に渡す結果を作る。text はサーバーが用意した分類表。 */
export function readResource(uri, text) {
  // 要求された URI と本文の種類を確かめてください。
  return { resultType: "complete", contents: [{ uri, text }] };
}

/** tools/call に渡す結果を作る。lookup は品番を受け、個数か null を返す。 */
export function callTool(params, scopes, lookup) {
  if (!scopes.includes("stock:read")) throw new Error("forbidden");
  // いまは名前と引数を調べず、台帳の値をそのまま文字列にしています。
  const count = lookup(params.arguments.sku);
  return {
    resultType: "complete",
    content: [{ type: "text", text: String(count) }],
  };
}
