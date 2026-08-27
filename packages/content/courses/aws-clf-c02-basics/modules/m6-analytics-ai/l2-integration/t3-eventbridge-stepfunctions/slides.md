---
id: 6-2-3
title: イベントで自動につなぐ
takeaway: "EventBridgeは出来事をきっかけに処理をつなぎ、Step Functionsは複数の処理の順番を管理する"
introduces: [EventBridge, Step Functions, イベント駆動]
requires: [Lambda, SQS, SNS]
header: "AWS Cloud Practitioner 入門"
---

<!-- _class: lead -->

# 6-2-3
# イベントで自動につなぐ

AWS Cloud Practitioner 入門 — Module 6 / レッスン6-2

<!-- ノート: 統合レッスンの締め。きっかけ役と段取り役の2つを覚えるトピックです。 -->

---

## なぜ必要か

- 「ファイルが届いたら処理を始める」を、人が見張って起動するのは無駄
- 複数の処理を順番どおりに流す「段取り」も、コードで書くと複雑になる
- きっかけ役と段取り役、それぞれに道具がある

<!-- ノート: つかみ。見張り当番と進行表、の2役を予告。 -->

---

## 結論

**EventBridgeは出来事をきっかけに処理をつなぎ、Step Functionsは複数の処理の順番を管理する**

- **イベント駆動** = 出来事(イベント)をきっかけに処理が動く設計
- **EventBridge** = イベントの受け付けと振り分けの係
- **Step Functions** = 複数ステップの流れ(ワークフロー)の進行係

<!-- ノート: 結論。きっかけ=EventBridge、段取り=Step Functions、の1語対応。 -->

---

## 最小の例

| 場面 | 使う |
| --- | --- |
| 「注文成立」の出来事が起きたらLambdaを動かす | EventBridge |
| 毎晩2時に集計処理を起動する | EventBridge(スケジュール) |
| 「検品→請求→発送」を順番に、失敗したら再試行 | Step Functions |

<!-- ノート: スケジュール起動もEventBridgeの守備範囲、が3行目。 -->

---

## 試験での聞かれ方

- 「イベントに応じてサービス同士を連携」→ EventBridge
- 「複数のLambdaを順序立てて実行するワークフロー」→ Step Functions
- ためる=SQS、配る=SNS、きっかけ=EventBridge、段取り=Step Functions

<!-- ノート: 補強枠。統合4点セットの1語まとめでレッスンを締める。 -->

---

<!-- _class: summary -->

## まとめ

**EventBridgeは出来事をきっかけに処理をつなぎ、Step Functionsは複数の処理の順番を管理する**

<!-- ノート: 再掲のみ。明日は配点30%のセキュリティに1日使う、と口頭で引き。 -->
