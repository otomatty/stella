---
id: 9-1-3
title: コストを見える化する
takeaway: "過去の分析はCost Explorer、事前の見積もりはPricing Calculator、超過の見張りはBudgets"
introduces: [Cost Explorer, Budgets, Pricing Calculator, コスト配分タグ]
requires: [従量課金, 無料利用枠, TCO]
header: "AWS Cloud Practitioner 入門"
---

<!-- _class: lead -->

# 9-1-3
# コストを見える化する

AWS Cloud Practitioner 入門 — Module 9 / レッスン9-1

<!-- ノート: コスト3道具を時間軸(過去・未来・見張り)で区別するトピックです。 -->

---

## なぜ必要か

- 従量課金は便利だが、月末の請求書で驚くのは避けたい
- 「先月何に使った?」「来月いくらになる?」「超えそうなら教えて」
- この3つの問いに、それぞれ道具がある

<!-- ノート: つかみ。家計簿・見積書・使いすぎアラートの3点セット。 -->

---

## 結論

**過去の分析はCost Explorer、事前の見積もりはPricing Calculator、超過の見張りはBudgets**

- 時間軸で覚える: 過去 → Cost Explorer / 未来 → Pricing Calculator / 見張り → Budgets

<!-- ノート: 結論。3つとも名前が素直(explore/calculate/budget)。 -->

---

## 最小の例

| 問い | 道具 |
| --- | --- |
| 先月、何にいくら使った? | **Cost Explorer**(グラフで分析) |
| この構成だと月いくら? | **Pricing Calculator**(事前見積もり) |
| 予算を超えそうなら知らせて | **Budgets**(しきい値で通知) |

<!-- ノート: 表の左の言い回しが試験の問題文にほぼそのまま出る。 -->

---

## 部署ごとに分けるにはタグ

- **コスト配分タグ** = リソースに付ける「部署」「プロジェクト」のラベル
- タグで集計すれば、部署別・案件別の内訳が出せる
- 「どのチームのコストか分けたい」→ タグ付けが答えの軸

<!-- ノート: 補強枠。タグ運用は問われやすい。付けてから集計、の順番。 -->

---

<!-- _class: summary -->

## まとめ

**過去の分析はCost Explorer、事前の見積もりはPricing Calculator、超過の見張りはBudgets**

<!-- ノート: 再掲のみ。次は複数アカウントの請求をまとめる話、と口頭で引き。 -->
