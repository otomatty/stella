---
id: 6-1-2
title: UPDATEで既存の行を書き換える
takeaway: "UPDATE テーブル名 SET 列 = 値 WHERE 条件 で、条件に合う行の値を書き換える"
introduces: [UPDATE, SET]
requires: [テーブル, 行, WHERE, 条件, INSERT]
header: "SQL入門"
---

<!-- _class: lead -->

# 6-1-2
# UPDATEで既存の行を書き換える

SQL入門 — Module 6 / レッスン6-1

<!-- ノート: WHERE が必須の場面です。次のトピックの危険性の伏線になります。 -->

---

## なぜ必要か

- 価格の改定や住所の変更で、既にある行の値を直したい
- 消して入れ直すのでは、他の列の値まで失われる

<!-- ノート: つかみ。DELETE + INSERT ではなく UPDATE を使う理由を示します。 -->

---

## 結論

**UPDATE テーブル名 SET 列 = 値 WHERE 条件 で、条件に合う行の値を書き換える**

- **UPDATE** — 行の値を書き換えるSQL文
- **SET** — どの列をどの値にするかを書く場所

<!-- ノート: 結論を先に言い切ります。WHERE が結論の一部に入っていることを強調します。 -->

---

## どの行かをWHEREで決める

```sql
UPDATE products
SET price = 250
WHERE id = 1;
```

- `SET` は複数書ける(`SET price = 250, name = 'ノートA'`)
- `WHERE` で指定した行だけが変わる

<!-- ノート: SELECT で使っていた WHERE が、そのまま対象の指定に使えると伝えます。 -->

---

<!-- _class: summary -->

## まとめ

**UPDATE テーブル名 SET 列 = 値 WHERE 条件 で、条件に合う行の値を書き換える**

<!-- ノート: 結論の再掲だけ。次は行を消します。 -->
