---
sourceRefs: [SRC-claude-code-agent-sdk-overview-20261031, SRC-claude-code-agent-loop-20261031, SRC-claude-code-agent-loop-control-20261031, SRC-claude-code-sdk-subagents-20261031, SRC-claude-code-sdk-subagents-create-20261031, SRC-claude-code-sdk-sessions-20261031]
---
# レッスン6-3 Agent SDK でエージェントを動かす

## このレッスンの目標

- [ ] Agent SDK のループと、止める条件・結果の確かめ方を説明できます。
- [ ] サブエージェントに渡る情報と、任せる利点を説明できます。
- [ ] セッションを控えて、作業を再開する方法を選べます。

## 6-3-1 エージェントのループ

> **Agent SDK は、ツールの実行と結果の受け渡しを繰り返すループを持っています。**

Messages API と Client SDK では、ツール使用のループはアプリが書きます(Client SDK のツールランナーに任せることもできます)。Agent SDK は、Claude Code のエージェントを自分のアプリに組み込むライブラリで、ループ・最初から入っているツール(ファイルの読み書き・検索・コマンドの実行など)・権限の確認・セッションを持っています。

`query()` を呼ぶと、ループは次の順で進みます。

1. プロンプトを受け取る(system・ツールの定義・会話の履歴と一緒に)
2. Claude が状況を見て、文を返すか、ツールの呼び出しを求める
3. SDK が求められたツールを実行し、結果を Claude に返す
4. ツールの呼び出しのない応答が来るまで、2 と 3 を繰り返す
5. 最後の応答のあとに、答え・使ったトークン・費用・セッションの ID を持つ `ResultMessage` を返す

```js
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "認証のモジュールを読み、直すべき点を挙げて",
  options: { allowedTools: ["Read", "Grep", "Glob"], maxTurns: 20, maxBudgetUsd: 1 },
})) {
  if (message.type === "result") {
    if (message.subtype === "success") console.log(message.result);
    else console.error(`止まりました: ${message.subtype}`);
  }
}
```

ループを止める条件は、どちらも既定では上限がありません。長く動くエージェントには上限を決めます。

| 設定 | 止める条件 | 届いたときの `subtype` |
| --- | --- | --- |
| `maxTurns` | 回数 | `error_max_turns` |
| `maxBudgetUsd` | 見積もった費用(サブエージェントの分も含む) | `error_max_budget_usd` |

`ResultMessage` の `subtype` には、ほかに `success`(普通に終わった)・`error_during_execution`(取り消しなどで途中で止まった)などがあります。答えの `result` は `success` のときにしか入らないので、読む前に `subtype` を確かめます。どの `subtype` にも、費用・使ったトークン・回数・セッションの ID が入っています。

## 6-3-2 サブエージェントに渡す

> **サブエージェントは自分の会話で動くので、要る情報をプロンプトに書いて渡します。**

サブエージェントは、親のエージェントが仕事の一部を任せる、別のエージェントです。`query()` の `agents` に定義し、親は `Agent` のツールで呼び出します。親が任せるかどうかは、各サブエージェントの `description` を見て Claude が決めるので、いつ使うかを具体的に書きます。

```js
for await (const message of query({
  prompt: "認証のモジュールのセキュリティを確かめて",
  options: {
    allowedTools: ["Read", "Grep", "Glob", "Agent"],
    agents: {
      "code-reviewer": {
        description: "コードの品質とセキュリティを確かめるときに使う。",
        prompt: "あなたはコードを確かめる担当です。…",
        tools: ["Read", "Grep", "Glob"],
      },
    },
  },
})) {
  if (message.type === "result" && message.subtype === "success") console.log(message.result);
}
```

サブエージェントに任せる利点は 4 つです。

| 利点 | 中身 |
| --- | --- |
| コンテキストを分ける | 途中のツールの呼び出しと結果はサブエージェントの中にとどまり、親に返るのは最後の報告だけ |
| 同時に動かせる | 独立した仕事を同時に進め、いちばん遅いものの時間で終わる |
| 専用の指示を持たせる | 担当に合わせた system を持たせられ、親の指示を余計な情報で増やさない |
| ツールを絞る | 読むだけの担当には読むツールだけを渡し、思わぬ書き換えを防ぐ |

サブエージェントは自分の会話で始まり、親の会話を受け取りません(親の会話を写して始める fork を除く)。

| 受け取る | 受け取らない |
| --- | --- |
| 自分の system(定義の `prompt`)と、呼び出すときのプロンプト | 親の会話の履歴とツールの結果 |
| プロジェクトの CLAUDE.md | 親の system |
| ツールの定義(親から受け継ぐか、`tools` で絞ったもの) | |

親から渡せるのは呼び出すときのプロンプトの文字列だけなので、ファイルの場所・エラーの内容・決めたことなど、サブエージェントに要る情報はそこに書きます。

## 6-3-3 作業を再開する

> **続きの作業は、セッションの ID を控えておき、resume で再開します。**

セッションは、エージェントの作業中に SDK が積み重ねる会話の履歴です。プロンプト・ツールの呼び出しと結果・応答のすべてが入ります。セッションに戻ると、エージェントは前に読んだファイルや決めたことを覚えたまま続きを始めます。

| したいこと | 使うもの |
| --- | --- |
| 1 回で終わる仕事 | 何も要らない(1 回の `query()` で必要なだけ回る) |
| 同じプロセスで会話を続ける | `continue: true` |
| そのフォルダーの最新のセッションに戻る | `continue: true` |
| 決まったセッションに戻る | 控えた ID を `resume` に渡す |
| 元を残したまま別のやり方を試す | fork(写しを作る) |

セッションの ID は、`ResultMessage` の `session_id` から控えます。失敗で終わったときにも入っているので、`error_max_turns` で止まった作業を、上限を上げて再開することもできます。

```js
for await (const message of query({
  prompt: "提案した修正を入れて",
  options: { resume: sessionId, allowedTools: ["Read", "Edit", "Glob", "Grep"] },
})) {
  if (message.type === "result" && message.subtype === "success") console.log(message.result);
}
```

セッションのファイルは、作ったマシンの中に保存されます。CI や使い捨てのコンテナのように別のマシンで再開するときは、セッションの保存先を共有する仕組み(session store)を使うか、セッションのファイルを移します。

## もっと知りたい人へ

- [Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview) — Agent SDK とほかの道具の違い(英語)
- [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop) — ループの進み方、止める条件、結果の確かめ方(英語)
- [Subagents in the SDK](https://code.claude.com/docs/en/agent-sdk/subagents) — サブエージェントの定義と、受け継ぐもの(英語)
- [Work with sessions](https://code.claude.com/docs/en/agent-sdk/sessions) — continue・resume・fork の選び方(英語)

知識問題で、このレッスンの内容を確かめます。
