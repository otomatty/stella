---
id: 4-1-3
title: テーブル名.列名で列を区別する
takeaway: "複数テーブルを使うときは、テーブル名.列名 の形でどの列かを区別する"
introduces: [修飾]
requires: [JOIN, 列]
header: "SQL入門"
---

<!-- _class: lead -->

# 4-1-3
# テーブル名.列名で列を区別する

SQL入門 — Module 4 / レッスン4-1

<!-- ノート: 前の動画でONに出てきた、テーブル名を頭に付けた書き方。あれが何だったのかをここで確定させます。 -->

---

## なぜ必要か

- customers にも orders にも、id という同じ名前の列がある
- JOIN でつないだ後、ただ id と書いたら、どちらの id か分からない

<!-- ノート: つかみ。同姓の人が2人いる職場で「田中さん」と呼ぶと2人振り向く、のような例。どちらか特定できないと困る。 -->

---

## 結論

**複数テーブルを使うときは、テーブル名.列名 の形でどの列かを区別する**

- この書き方を **修飾** と呼ぶ(テーブル名を頭に付けて特定すること)
- `customers.id` = customers テーブルの id 列

<!-- ノート: 結論。読み方は「customersのid」。ドットを「の」と読むと日本語のまま理解できる。 -->

---

## 最小のコード

```sql
SELECT customers.name, orders.item
FROM orders
INNER JOIN customers
  ON orders.customer_id = customers.id;
```

<!-- ノート: 前の動画のコードを修飾付きで書き直した形。nameとitemは片方にしかない列なので修飾なしでも動くが、付けておくとどの列か一目で分かる。 -->

---

## 修飾しないとどうなるか

```sql
SELECT id FROM orders INNER JOIN customers
  ON orders.customer_id = customers.id;
```

- 両方のテーブルに id 列がある → どちらか決められずエラー
- `orders.id` か `customers.id` と修飾すれば動く

<!-- ノート: 失敗例。エラーメッセージには「曖昧(ambiguous)」という単語が出る。JOINを書いていてこの単語を見たら、修飾忘れを疑う。 -->

---

<!-- _class: summary -->

## まとめ

**複数テーブルを使うときは、テーブル名.列名 の形でどの列かを区別する**

<!-- ノート: 結論の再掲だけ。これでJOINの読み書きに必要な道具は揃ったことを伝えて締める。 -->
