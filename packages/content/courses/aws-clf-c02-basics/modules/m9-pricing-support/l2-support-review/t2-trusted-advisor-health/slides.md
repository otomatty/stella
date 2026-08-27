---
id: 9-2-2
title: 助言と健康診断
takeaway: "Trusted Advisorは改善の助言を、Health Dashboardは自分の環境に影響する障害情報を知らせる"
introduces: [Trusted Advisor, Health Dashboard]
requires: [コスト最適化, 高可用性, サポートプラン, CloudWatch]
header: "AWS Cloud Practitioner 入門"
---

<!-- _class: lead -->

# 9-2-2
# 助言と健康診断

AWS Cloud Practitioner 入門 — Module 9 / レッスン9-2

<!-- ノート: AWS側からの情報提供2種。役割の違いで覚えるトピックです。 -->

---

## なぜ必要か

- 「もっと安全に・安くできるのに気づいていない」設定が必ずある
- AWS側の障害が自分に影響しているのか知りたいときもある
- どちらもAWS自身が教えてくれる仕組みがある

<!-- ノート: つかみ。助言(改善)と告知(障害)は別の道具、と予告。 -->

---

## 結論

**Trusted Advisorは改善の助言を、Health Dashboardは自分の環境に影響する障害情報を知らせる**

- **Trusted Advisor** = ベストプラクティスとの差を点検して助言
- **Health Dashboard** = AWS側のイベントの、自分への影響を表示

<!-- ノート: 結論。advisorは助言者、healthは健康状態、と名前どおり。 -->

---

## 最小の例

| | Trusted Advisor | Health Dashboard |
| --- | --- | --- |
| 教えてくれること | コスト・セキュリティ等の改善点 | 障害・メンテの自分への影響 |
| 例 | 「使っていないEBSがあります」 | 「東京リージョンで障害、あなたのEC2に影響」 |

<!-- ノート: 点検の観点(コスト・性能・セキュリティ・耐障害・サービス上限)は5分類、と口頭で。 -->

---

## 試験での聞かれ方

- 「ベストプラクティスに照らした改善推奨」→ Trusted Advisor
- 「自分のリソースに影響するAWS側のイベント通知」→ Health Dashboard
- チェック自体は全利用者が使える。上位プランでは組織横断やAPI経由などの追加機能が付く

<!-- ノート: 補強枠。以前は全項目チェックが上位プラン限定だったが現在は開放済み。提供条件は変わりうるので最新は公式で、と一言添える。 -->

---

<!-- _class: summary -->

## まとめ

**Trusted Advisorは改善の助言を、Health Dashboardは自分の環境に影響する障害情報を知らせる**

<!-- ノート: 再掲のみ。次は自力で調べるときの情報源、と口頭で引き。 -->
