---
sourceRefs: [SRC-claude-sdk-hooks-20261118, SRC-claude-sdk-hook-callbacks-20261126, SRC-claude-code-sdk-permissions-20261031, SRC-claude-sdk-hook-failure-20261126, SRC-claude-sdk-settings-sources-20261126, SRC-claude-code-sdk-permission-rules-20261031, SRC-claude-code-hook-types-20261126]
---
# レッスン8-7 エージェントを仕組みで止める

## このレッスンの目標

- [ ] Agent SDK のツール呼び出しを、実行前のフックで拒否できます。
- [ ] 複数の許可や拒否が重なったとき、どこで判定が決まるか説明できます。
- [ ] フックの失敗時に操作を止める設定を選べます。

## 8-7-1 SDK でもフックで止める

> **Agent SDK でも、必ず止めたい呼び出しは PreToolUse のフックで拒否します。**

帳票の確認を任せるエージェントに、編集を試みた時点で止まる仕組みを付けます。
プロンプトや CLAUDE.md、Skill は、モデルに作業の進め方を教えるために使います。
必ず守る規則は、ハーネス（エージェントを動かす側の仕組み）に置きます。

6-3 で使った `query()` の `options.hooks` に、実行前のフックを登録します。
`matcher` は対象を絞る条件です。この例では `Write` と `Edit` に一致します。

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";

query({
  prompt: "監査用の帳票に不足している項目を報告してください",
  options: {
    hooks: {
      PreToolUse: [{
        matcher: "Write|Edit",
        hooks: [async () => ({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: "帳票の確認中は編集できません",
          },
        })],
      }],
    },
  },
});
```

例はフックの登録部分です。実行時は 6-3 と同じように `query()` の返すメッセージを読みます。
コールバック（イベント時に呼ばれる関数）は `(input, toolUseID, { signal })` を受け取れます。
対象の引数は `input` で調べます。止めるときは理由も返します。

| フックの返り値 | 何を伝えるか |
| --- | --- |
| `permissionDecision: "deny"` | 呼び出しを拒否する |
| `permissionDecision: "defer"` | 今のターンを終え、外部で承認を待てるようにする |
| `permissionDecision: "ask"` | 確認を求める |
| `permissionDecision: "allow"` | 呼び出しの許可を求める |
| `{}` | このフックでは決めない |

複数のフックの判定は、拒否、保留、確認、許可の順に優先されます。
`updatedInput` で引数の変更もできます。
実行後の `PostToolUse` は監査の記録や `additionalContext` による情報の補足に使います。
実行済みの操作はその時点で止められません。

`Write|Edit` が調べるのは、その名前のツールだけです。
帳票の保護が目的なら、Bash など別の書き込み経路も含めて、使えるツールを絞ります。

`settingSources` を省くと、SDK はユーザー・プロジェクト・ローカルの設定を読みます。
リポジトリの `.claude/settings.json` にあるフックも動くため、実行時に読み込む設定を確かめます。
これら 3 つの読み込み元を切り離すには `settingSources: []` を指定します。

## 8-7-2 許可は順に判定される

> **ツールの許可は、フック・拒否・確認・権限モード・許可ルール・canUseTool の順に判定します。**

8-3 では、ルール同士の優先順を学びました。SDK では、その前後にも判定があります。
すべての段階に進むとは限りません。拒否や自動承認が決まった時点で、後続の判定を終えます。

| 順 | 調べるもの | 一致したときの動き |
| --- | --- | --- |
| 1 | 実行前のフック | 拒否を返したらここで止まる |
| 2 | 拒否のルール | 拒否する |
| 3 | 確認のルール | 確認に回す。確認を出さないモードでは拒否する |
| 4 | 権限モード | モードに応じて自動承認するか、判定を続ける |
| 5 | 許可のルール | 条件が合えば承認する |
| 6 | `canUseTool` | 承認が必要な呼び出しをアプリの関数で審査する |

フックが許可を返しても、拒否と確認のルールは調べます。
`bypassPermissions` でもフックの拒否と拒否ルールは効きます。
TypeScript でそのモードを使うには `allowDangerouslySkipPermissions: true` も必要です。

たとえば `allowedTools` で自動承認された呼び出しは、`canUseTool` まで届きません。
すべての呼び出しを調べるなら、対象を絞らない `PreToolUse` に検査を置きます。

人が待機しない実行では、`allowedTools` で必要な承認を先に与え、
`permissionMode: "dontAsk"` で確認が必要な操作を拒否できます。
確認なしで使える読み取りなどは通ります。外したいツールは `disallowedTools` に指定します。

## 8-7-3 フックが失敗したとき

> **フックが失敗しても操作を止めるには、失敗時に遮断する設定を付けます。**

帳票の編集前に承認記録を調べるフックを考えます。
関数が例外を投げると、既定では呼び出しが通常の権限判定へ進みます。
承認記録を読めない場合も止めたいので、フックを登録する matcher に `onFailure: "block"` を指定します。
この項目には、TypeScript 版の Agent SDK v0.3.317 以降が必要です。

```ts
query({ prompt: "承認された帳票を更新してください", options: {
  hooks: {
    PreToolUse: [{
      matcher: "Edit",
      hooks: [checkApproval],
      onFailure: "block",
    }],
  },
} });
```

`checkApproval` は、承認されていない編集に拒否を返す関数です。
記録の読み取りに失敗したら例外を伝えます。`{}` を返して失敗を隠すと、設定は働きません。
テストでは意図的に例外を出し、呼び出しが拒否され、帳票の内容も変わらないことを確かめます。

フックを待たずに先へ進む非同期の出力は、通知や記録に使います。
遮断するフックは、判定が返るまで実行を待つようにします。
Claude Code の `auto` や、プロンプト型・エージェント型のフックはモデルが判断します。
例外なく守る規則は、拒否ルールやコードで条件を決めるフックに置きます。

## もっと知りたい人へ

- [SDK でフックの対象と返り値を指定する（英語）](https://code.claude.com/docs/en/agent-sdk/hooks#configure-hooks)
- [ツール呼び出しを審査する順序（英語）](https://code.claude.com/docs/en/agent-sdk/permissions#how-permissions-are-evaluated)
- [フックが失敗したときに止める設定（英語）](https://code.claude.com/docs/en/agent-sdk/hooks#block-the-action-when-a-callback-fails)

知識問題で、このレッスンの内容を確かめます。
