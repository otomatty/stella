---
sourceRefs: [SRC-claude-code-agent-sdk-overview-20261031, SRC-claude-code-sdk-hosting-20261126, SRC-claude-managed-agents-20261118, SRC-claude-managed-agent-environment-20261126]
id: 6-4-2
title: 動かす場所を選ぶ
takeaway: "自分で運用するなら Agent SDK、長時間の作業を任せるなら Managed Agents を選びます。"
introduces: [Managed Agents, サンドボックス]
requires: [Agent SDK, Messages API, セッション, イベント]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# 動かす場所を選ぶ
<!-- ノート: ループを動かす場所と、ツールを実行する場所を確かめます。 -->
---
# 社内ツールを使う夜間の集計
集計は画面を閉じたあとも続きます。ツールには社内でしか開けない台帳を読ませたいです。
<!-- ノート: 長時間の処理をどこに任せるかと、台帳を読むツールをどこで動かすかを考えます。 -->
---
# ループを誰が運用するかで選ぶ
自分で運用するなら Agent SDK、長時間の作業を任せるなら Managed Agents を選びます。
<!-- ノート: Agent SDK を使うチームは、SDK が動くプロセスと状態の保存先を運用します。 -->
---
# 持つ制御と運用を比べる
| 手段 | ループを動かす仕組み |
| --- | --- |
| Messages API | 自分で書いたループ |
| Agent SDK | 自分で運用するプロセス内の SDK |
| Managed Agents | Anthropic が運用するサービス |
<!-- ノート: やり取りを一手ずつ制御する案件では Messages API でループを書けます。 -->
---
# ツールを社内で動かす場合
Managed Agents のサンドボックス（隔離した実行環境）を自社基盤に置けます。会話とツールの結果は Anthropic に届きます。
<!-- ノート: サンドボックスの場所を変えても、Claude とループは Anthropic 側で動きます。ツールが返す内容の扱いも確認します。 -->
---
<!-- _class: summary -->
# まとめ
自分で運用するなら Agent SDK、長時間の作業を任せるなら Managed Agents を選びます。
<!-- ノート: 自分で運用するなら Agent SDK、長時間の作業を任せるなら Managed Agents を選びます。 -->
