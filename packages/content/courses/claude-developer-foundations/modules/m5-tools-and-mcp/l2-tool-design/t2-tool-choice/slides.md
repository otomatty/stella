---
sourceRefs: [SRC-claude-docs-tool-use-when-20261031, SRC-claude-docs-tool-choice-20261031]
id: 5-2-2
title: ツールを使う場面を決める
takeaway: "ツールを使うかどうかは、tool_choice と system の指示で調整します。"
introduces: [tool_choice]
requires: [ツール, system]
header: "Claude Developer資格対策"
---
<!-- _class: lead -->
# ツールを使う場面を決める
<!-- ノート: Claude がツールを呼ぶかどうかを、アプリから調整する方法です。 -->
---
# 調べずに答えた
在庫を調べてから答えてほしいのに、Claude がツールを呼ばずに「在庫はあると思います」と答えました。
<!-- ノート: 既定では、ツールを使うかどうかを Claude が決めます。 -->
---
# 2 つで調整する
ツールを使うかどうかは、tool_choice と system の指示で調整します。
<!-- ノート: system に「答える前に、ツールで調べてください」と書くと、ツールを使う場面が増えます。 -->
---
# tool_choice の値
- auto(既定): 使うかを Claude が決める
- any・tool: ツールを必ず使わせる
- none: ツールを使わせない
<!-- ノート: Opus 5.5・Sonnet 5.5 などの最新のモデルでは、any と tool は 400 エラーになります。auto と system の指示で導きます。 -->
---
<!-- _class: summary -->
# まとめ
ツールを使うかどうかは、tool_choice と system の指示で調整します。
<!-- ノート: 決まった形の答えだけが要るなら、構造化出力を使う方法もあります。 -->
