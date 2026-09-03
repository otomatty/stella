---
id: 6-1-4
title: WHEREを忘れると全行に効く
takeaway: "UPDATEとDELETEでWHEREを書き忘れると、テーブルの全行が対象になる"
introduces: [全行]
requires: [UPDATE, DELETE, WHERE, SELECT, 条件]
header: "SQL入門"
---

<!-- _class: lead -->

# 6-1-4
# WHEREを忘れると全行に効く

SQL入門 — Module 6 / レッスン6-1

<!-- ノート: 実際の事故がいちばん多い場所です。書き方ではなく手順を教えます。 -->

---

## なぜ必要か

- `WHERE` を書き忘れても、SQLはエラーにならない
- 意図せず全件を書き換えてしまった、という事故が実際に起きている

<!-- ノート: つかみ。文法として正しいから止まらない、という点が怖さの正体です。 -->

---

## 結論

**UPDATEとDELETEでWHEREを書き忘れると、テーブルの全行が対象になる**

- **全行** — テーブルに入っているすべての行

<!-- ノート: 結論を先に言い切ります。脅かすのではなく、手順を作るための事実として扱います。 -->

---

## 先にSELECTで対象を確かめる

```sql
-- 1. 消す前に、対象をSELECTで見る
SELECT * FROM products WHERE id = 1;

-- 2. 同じ WHERE のまま DELETE に書き換える
DELETE FROM products WHERE id = 1;
```

- 危ない例: `DELETE FROM products;` は全行が消える

<!-- ノート: SELECT で確かめてから書き換える手順を、口頭でも繰り返します。 -->

---

<!-- _class: summary -->

## まとめ

**UPDATEとDELETEでWHEREを書き忘れると、テーブルの全行が対象になる**

<!-- ノート: 結論の再掲だけ。次は、間違えたときに戻せる仕組みです。 -->
