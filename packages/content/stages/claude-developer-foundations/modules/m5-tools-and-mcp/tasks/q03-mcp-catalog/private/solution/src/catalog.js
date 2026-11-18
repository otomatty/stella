const STOCK_SCOPE = "stock:read";
const TOOL_NAME = "find_stock";
const GUIDE_URI = "catalog://warehouse/categories";
const SKU_PATTERN = "^[A-Z]-[0-9]{3}$";

export function listTools(scopes) {
  const tools = [];
  if (scopes.includes(STOCK_SCOPE)) {
    tools.push({
      name: TOOL_NAME,
      description: "品番から現在の在庫数を調べます。在庫は変更しません。",
      inputSchema: {
        type: "object",
        properties: { sku: { type: "string", pattern: SKU_PATTERN } },
        required: ["sku"],
        additionalProperties: false,
      },
    });
  }
  return { resultType: "complete", tools };
}

export function readResource(uri, text) {
  if (uri !== GUIDE_URI) throw new Error("unknown_resource");
  return {
    resultType: "complete",
    contents: [{ uri, mimeType: "text/plain", text }],
  };
}

function toolError(text) {
  return {
    resultType: "complete",
    isError: true,
    content: [{ type: "text", text }],
  };
}

export function callTool(params, scopes, lookup) {
  if (!scopes.includes(STOCK_SCOPE)) throw new Error("forbidden");
  if (params.name !== TOOL_NAME) throw new Error("unknown_tool");
  const args = params.arguments;
  if (
    !args ||
    Object.keys(args).length !== 1 ||
    typeof args.sku !== "string" ||
    !new RegExp(SKU_PATTERN).test(args.sku)
  ) {
    return toolError("sku に A-123 形式の品番を 1 つ指定してください。");
  }
  const count = lookup(args.sku);
  if (count === null) return toolError(`品番 ${args.sku} は未登録です。`);
  return {
    resultType: "complete",
    content: [{ type: "text", text: JSON.stringify({ sku: args.sku, count }) }],
  };
}
