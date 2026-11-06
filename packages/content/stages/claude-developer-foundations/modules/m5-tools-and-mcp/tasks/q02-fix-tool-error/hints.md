## ヒント1 方針

ログの 2 つのエラーは、どちらも `toToolResults` の 11 行目で、ツールの呼び出しを結果に変えずに、例外のまま投げていることから起きています。1 つの呼び出しを実行して `tool_result` を返す関数に分け、その中で「ツールがないとき」と「ツールが例外を投げたとき」を、`is_error: true` の結果にして返します。

## ヒント2 手がかりのコード

```js
try {
  return { type: "tool_result", tool_use_id: block.id, content: await tool(block.input) };
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  // reason を含む文と is_error: true を持つ tool_result を返す
}
```
