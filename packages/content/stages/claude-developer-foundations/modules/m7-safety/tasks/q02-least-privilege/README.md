# 要るツールだけを許可する

Agent SDK で動かす、人のいないエージェントの権限を決める関数を作ります。作業の種類から、使えるツールを作業に要るものだけに絞った設定を返します。`src/permissions.js` の `permissionsFor(task)` を直してください。いまの実装は、確認をすべて外す `bypassPermissions` を使い、MCP のツールも `*` でまとめて許可しています。

## 作るもの

`permissionsFor({ jobs, mcp })` は、`query()` の `options` に渡す `{ allowedTools, disallowedTools, permissionMode }` を返します。

作業の種類ごとに要るツールは、`JOB_TOOLS` に決めてあります(書き換えません)。

| 作業の種類 | 要るツール |
| --- | --- |
| `read`(コードを読んで答える) | `Read`・`Grep`・`Glob` |
| `edit`(コードを直す) | `Read`・`Grep`・`Glob`・`Edit` |
| `test`(テストを走らせる) | `Read`・`Grep`・`Glob`・`Bash(npm test)` |

- `allowedTools` には、`jobs` の作業に要るツールを、重ねずに、最初に出た順で並べます。
- `mcp` は、MCP サーバーの名前ごとの、使うツールの名前の配列です(省略できる)。ツールは 1 つずつ `mcp__<サーバー名>__<ツール名>` にして、作業のツールのあとに並べます。サーバー名の `.` と空白は `_` にします(`my.server` → `mcp__my_server__…`)。
- `permissionMode` は `"dontAsk"` にします。許可していない呼び出しを、確認せずに断るモードです。
- `disallowedTools` は、`Bash(…)` のツールを 1 つも許可しないときは `["Bash"]`、許可するときは `[]` にします。`dontAsk` でも、読み取りだけのコマンドは確認なしで動けるので、Bash の要らない作業では定義ごと消します。
- 次のときは、理由と名前を含むメッセージの `Error` を投げます。
  - `jobs` が空
  - `JOB_TOOLS` にない作業の種類
  - MCP のツールの名前に `*` を含む(まとめての許可はしない)
  - ツールを 1 つも書いていない MCP サーバー
- 受け取った `task` は書き換えません。

```js
permissionsFor({ jobs: ["read"], mcp: { github: ["list_issues"] } });
// => { allowedTools: ["Read", "Grep", "Glob", "mcp__github__list_issues"],
//      disallowedTools: ["Bash"], permissionMode: "dontAsk" }
```

## 説明欄に書くこと

提出の説明欄に、`allowedTools` だけでは足りずに `permissionMode` と `disallowedTools` を決めた理由と、MCP のツールを `*` で許可しない理由を、自分のコードの箇所に即して書きます。

## 確かめ方

VS Code の「STELLA: 課題を確認する」で、テスト(`tests/`)・ESLint・Prettier を実行します。API キーは要りません。テストと設定のファイルは書き換えません。

返した設定を本物の `query()` に渡し、許可していないツールが断られることを確かめるのは任意です(費用がかかります)。
