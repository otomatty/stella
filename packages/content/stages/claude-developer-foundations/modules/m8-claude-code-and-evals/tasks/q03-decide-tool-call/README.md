# ツールの呼び出しを順に判定する

週報のチームはテストの実行を許可し、公開コマンドは止めたいと考えています。個人が許可を追加したり、実行前のフックが許可を返したりしたときにも、どの設定で判定が決まったか説明できるようにします。レッスン 8-3 と 8-7 のあとに取り組みます。

## 作るもの

`src/decide-tool-call.js` の `decideToolCall(call, config)` を実装してください。公式ドキュメントの権限の判定順を、この課題用に単純にしたものです。コマンドの文字列やファイルのパスを読み、判定だけを返します。

| 値 | 中身 |
| --- | --- |
| `call` | `{ tool, input }`。たとえば `{ tool: "Bash", input: { command: "npm test" } }` |
| `config.hooks` | `{ matcher, run, onFailure }` の配列。たとえば `"Write\|Edit"` は `Write` と `Edit` に一致します。同期関数 `run(call)` は `"allow"`・`"deny"`・`"ask"`・`undefined` のいずれかを返すか、例外を投げます |
| `config.deny`・`config.ask`・`config.allow` | それぞれルールの文字列の配列 |
| `config.mode` | `"default"`・`"acceptEdits"`・`"dontAsk"`・`"bypassPermissions"` のいずれか |
| `config.canUseTool` | 省略できる同期関数。`call` を受け取り、`"allow"` か `"deny"` を返します |

ツール名だけのルールは、そのツールの全呼び出しに一致します。`Bash(npm run publish-*)` は `input.command` 全体、`Edit(reports/**)` は `input.file_path` 全体を照合します。この課題では `*` と `**` はどちらも任意の文字列（空文字や `/` を含む）に一致します。それ以外の文字は書かれたとおりに照合します。括弧つきのルールは、この2種類のツールを扱います。

### 判定の順

1. 一致したフックを配列の順に呼びます。`"deny"` が返ったら `decidedBy: "hook"` で拒否します。フックが例外を投げたら、`onFailure` が `"block"` のときだけ `"hook-failure"` で拒否します。それ以外の例外は結果なしとして進みます。`"allow"` と `"ask"` は覚えて、次の段へ進みます。
2. 拒否ルールに一致したら `"deny-rule"` で拒否します。フックの許可があっても拒否します。
3. 確認ルールに一致したら `"ask-rule"`、フックの確認があれば `"hook"` で確認を返します。
4. `bypassPermissions` か、`acceptEdits` で `Edit` または `Write` なら、`"mode"` で許可します。
5. 許可ルールに一致したら `"allow-rule"`、フックの許可があれば `"hook"` で許可します。
6. `canUseTool` があれば呼び、その結果を `"canUseTool"` で返します。無ければ `dontAsk` で拒否し、ほかのモードでは確認を返します。このときはどちらも `"mode"` です。

決まった時点で `{ decision, decidedBy }` を返します。`decision` は許可なら `"allow"`、拒否なら `"deny"`、確認なら `"ask"` です。たとえば `deny: ["Bash"]` と `allow: ["Bash(npm test)"]` があるとき、`npm test` の判定は `{ decision: "deny", decidedBy: "deny-rule" }` です。

この課題では確認が必要な時点で `"ask"` を返し、人との確認のやり取りは省きます。最後の段に届いた場合は、`dontAsk` でも `canUseTool` があればその関数を呼びます。

## 確認と提出

VS Code の「STELLA: 課題を確認する」で、テスト・ESLint・Prettier を実行します。テストは設定と偽のフックを渡すので、API キーは要りません。テストと設定のファイルは書き換えません。

提出の説明欄に、必ず止めたい操作を拒否ルールかフックに置く理由を書いてください。どのような場合に `canUseTool` が呼ばれないかと、指示だけに書いた場合に何が起きうるかを含めます。

## 出典

課題とテストデータは教材用に作成しています。

- 判定の順と権限モード。 [Anthropic の Agent SDK の権限設定（英語）](https://code.claude.com/docs/en/agent-sdk/permissions#how-permissions-are-evaluated)
- ルールの書き方。 [Anthropic の Claude Code の権限設定（英語）](https://code.claude.com/docs/en/permissions#permission-rule-syntax)
- フックの対象、戻り値と失敗時の扱い。 [Anthropic の Agent SDK のフック設定（英語）](https://code.claude.com/docs/en/agent-sdk/hooks#configure-hooks) ・ [コールバックの失敗時に止める設定（英語）](https://code.claude.com/docs/en/agent-sdk/hooks#block-the-action-when-a-callback-fails)
