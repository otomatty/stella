# レビューの観点

- 作業の種類に要るツールだけを、重ねずに最初に出た順で並べているか
- `Bash` そのものではなく、`Bash(npm test)` だけを許可しているか
- MCP のツールを `mcp__<サーバー名>__<ツール名>` で 1 つずつ書き、サーバー名の `.` と空白を `_` にしているか
- `*` を含む MCP のツールと、ツールのない MCP サーバーをエラーにしているか
- `permissionMode` を `"dontAsk"` にしているか(`bypassPermissions` や `acceptEdits` にしていないか)
- Bash の要らない作業で `disallowedTools` に `Bash` を入れているか
- 知らない作業の種類と、空の `jobs` をエラーにしているか
- 受け取った設定を書き換えていないか(`JOB_TOOLS` の配列に `push` していないか)
- 説明欄が、`allowedTools` だけでは足りない理由と `*` を使わない理由を、自分のコードに即して述べているか

よくある違反: `flatMap` の結果に重なりを残す、`JOB_TOOLS[job]` を `push` で書き換える、MCP を `mcp__github__*` でまとめる、サーバー名をそろえない、`disallowedTools` をいつも空にする、知らない作業を黙って飛ばす。
