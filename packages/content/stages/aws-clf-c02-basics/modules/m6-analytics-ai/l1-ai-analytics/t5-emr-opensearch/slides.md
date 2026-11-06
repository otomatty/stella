---
id: 6-1-5
title: EMRとOpenSearchの持ち場
takeaway: "オープンソースの枠組みで大規模データを加工するのがEMR、ログの全文検索と可視化がOpenSearch Service"
introduces: [EMR, OpenSearch Service]
requires: [S3, Athena, Redshift, SQL]
header: "AWS Cloud Practitioner 入門"
---

<!-- _class: lead -->

# 6-1-5
# EMRとOpenSearchの持ち場

AWS Cloud Practitioner 入門 — Module 6 / レッスン6-1

<!-- ノート: 分析の川の絵に、選択肢で登場する2つの持ち場を足すトピックです。 -->

---

## なぜ必要か

- SparkやHadoopといったオープンソースの分析基盤を、そのまま使いたい現場がある
- 「エラーログを全文検索したい」はSQLの集計とは別の用事
- どちらも試験の選択肢に名前で登場する

<!-- ノート: つかみ。AthenaとRedshiftでは受け持てない用事が2つ残っています。 -->

---

## 結論

**オープンソースの枠組みで大規模データを加工するのがEMR、ログの全文検索と可視化がOpenSearch Service**

- **EMR** = SparkやHadoopなどの分析基盤をマネージドで動かす大規模データ処理サービス
- **OpenSearch Service** = ログや文書を全文検索し、ダッシュボードで見るサービス

<!-- ノート: 結論。EMRは「枠組みの名前」、OpenSearchは「検索」が合図です。 -->

---

## 最小の例

| サービス | 一言 | 向く場面 |
| --- | --- | --- |
| **EMR** | オープンソース分析基盤の間借り | Spark/Hadoopで大規模データを加工 |
| **OpenSearch Service** | ログの全文検索 | エラーログの横断検索・監視ダッシュボード |
| Athena | S3をSQLで調べる | その場限りの集計(前トピック) |

<!-- ノート: SQLで集計ならAthena/Redshift、キーワードで探すならOpenSearch、枠組み名が出たらEMR。 -->

---

## 試験での聞かれ方

- 「Apache SparkやHadoopを使った大規模データ処理をマネージドで」→ EMR
- 「大量のログをほぼリアルタイムに検索・分析したい」→ OpenSearch Service
- 「S3のデータにその場でSQLを実行したい」→ Athena(混同注意)

<!-- ノート: 補強枠。オープンソースの製品名が問題文に出たら、それを動かす場所=EMRです。 -->

---

<!-- _class: summary -->

## まとめ

**オープンソースの枠組みで大規模データを加工するのがEMR、ログの全文検索と可視化がOpenSearch Service**

<!-- ノート: 再掲のみ。次のレッスンはサービス同士をつなぐ部品です、と口頭で引き。 -->
