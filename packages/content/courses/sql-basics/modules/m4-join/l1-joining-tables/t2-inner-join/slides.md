---
id: 4-1-2
title: INNER JOINでテーブルをつなぐ
takeaway: "INNER JOIN ... ON で、IDが一致する行どうしをつなげて取り出せる"
introduces: [JOIN, INNER JOIN, ON, 結合]
requires: [ID, SELECT, FROM]
header: "SQL入門"
---

<!-- _class: lead -->

# 4-1-2
# INNER JOINでテーブルをつなぐ

SQL入門 — Module 4 / レッスン4-1

<!-- ノート: テーブルを分けたら、今度はつなげて見る番です。この研修で一番大きな山場ですが、書き方の型は1つだけです。 -->

---

## なぜ必要か

- orders には customer_id という番号しか入っていない
- 注文一覧の画面には、番号ではなく顧客の名前を出したい

<!-- ノート: つかみ。customer_id: 1 と表示されても誰のことか分からない。customers にある名前と組み合わせて見たい、という動機を作る。 -->

---

## 結論

**INNER JOIN ... ON で、IDが一致する行どうしをつなげて取り出せる**

- テーブルどうしをつなげることを **結合**(JOIN)と呼ぶ
- `ON` に「どの列が一致したらつなぐか」を書く

<!-- ノート: 結論。JOINは結合の英語。ONがつなぎ方の条件で、今回はordersのcustomer_idとcustomersのidが一致したらつなぐ、と読む。 -->

---

## 最小のコード

```sql
SELECT name, item FROM orders INNER JOIN customers ON orders.customer_id = customers.id;
```

| name | item |
| --- | --- |
| 佐藤 | コーヒー |
| 鈴木 | ケーキセット |
| 佐藤 | クッキー |

<!-- ノート: FROMのテーブルにINNER JOINで相手をつなぐ。ONのorders.customer_idのような、テーブル名を頭に付けた書き方の意味は次の動画で扱うので、ここでは型として写す。 -->

---

## つながる様子

| orders.customer_id | | customers.id | name |
| --- | --- | --- | --- |
| 1 | → | 1 | 佐藤 |
| 2 | → | 2 | 鈴木 |
| 1 | → | 1 | 佐藤 |

- IDが一致した行どうしが、横に1行につながる

<!-- ノート: 図解代わりの表。注文3件それぞれが、IDの一致する顧客の行と手をつなぐイメージ。佐藤さんは2回登場する点に触れる。 -->

---

<!-- _class: summary -->

## まとめ

**INNER JOIN ... ON で、IDが一致する行どうしをつなげて取り出せる**

<!-- ノート: 結論の再掲だけ。両方のテーブルに同じ名前の列があったらどう書くのか、という問いを残して締める。 -->
