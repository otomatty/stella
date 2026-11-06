---
sourceRefs: [SRC-claude-code-agent-loop-20261031, SRC-claude-code-agent-loop-control-20261031, SRC-claude-code-agent-sdk-overview-20261031]
id: 6-3-1
title: エージェントのループ
takeaway: "Agent SDK は、ツールの実行と結果の受け渡しを繰り返すループを持っています。"
introduces: [query, ResultMessage]
requires: [Agent SDK, ツール使用のループ]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# エージェントのループ
<!-- ノート: Agent SDK で、エージェントがどう動くかを確かめます。 -->
---
# ループを自分で書いた
ファイルを読むツール・書くツールを定義し、ツール使用のループを自分で書いていました。権限の確認まで作るのは大仕事でした。
<!-- ノート: Messages API と Client SDK では、ループはアプリが書きます。 -->
---
# ループは SDK が回す
Agent SDK は、ツールの実行と結果の受け渡しを繰り返すループを持っています。
<!-- ノート: ファイルの読み書きやコマンドの実行のようなツールも、最初から入っています。 -->
---
# query で動かす
```js
for await (const message of query({ prompt, options: { maxTurns: 20 } })) {
  if (message.type === "result" && message.subtype === "success") show(message.result);
}
```
<!-- ノート: 最後に ResultMessage が届きます。subtype が success のときだけ、result に答えが入ります。 -->
---
# 止める条件
- maxTurns: 回数の上限 → error_max_turns
- maxBudgetUsd: 費用の上限 → error_max_budget_usd
<!-- ノート: どちらも既定では上限がありません。長く動くエージェントには上限を決めておきます。 -->
---
<!-- _class: summary -->
# まとめ
Agent SDK は、ツールの実行と結果の受け渡しを繰り返すループを持っています。
<!-- ノート: 大きな仕事は、別のエージェントに任せることもできます。 -->
