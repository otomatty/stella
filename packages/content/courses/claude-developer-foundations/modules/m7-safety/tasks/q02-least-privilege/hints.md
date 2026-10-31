## ヒント1 方針

`Set` に作業ごとのツールを足していくと、重なりを除きつつ、最初に出た順を保てます。知らない作業は `JOB_TOOLS[job]` が `undefined` になるので、そこでエラーにします。MCP のツールは `Object.entries(task.mcp ?? {})` で回し、サーバー名を `replace(/[. ]/g, "_")` でそろえてから名前を作ります。最後に、`Bash(` で始まるツールがあるかどうかで `disallowedTools` を決めます。

## ヒント2 手がかりのコード

```js
const allowed = new Set();
for (const job of task.jobs) {
  const tools = JOB_TOOLS[job];
  if (!tools) throw new Error(`知らない作業の種類です: ${job}`);
  for (const tool of tools) allowed.add(tool);
}
const usesBash = [...allowed].some((tool) => tool.startsWith("Bash("));
```
