# レッスン6-1 データを書き込む

## このレッスンの目標

- [ ] `INSERT` / `UPDATE` / `DELETE` でデータを書き込める
- [ ] `WHERE` の書き忘れが全行に効くことを理解し、確認手順を踏める
- [ ] トランザクションで変更を確定・取り消しできる

## 6-1-1 INSERTで行を追加する

> **INSERT INTO テーブル名 (列) VALUES (値) で、テーブルに新しい行を追加する**

ここまでは、既にあるデータを取り出すだけでした。しかし実際のシステムでは、申し込みや登録によってデータが増えていきます。

```sql
INSERT INTO products (name, price)
VALUES ('ノート', 200);
```

- **INSERT** — 行を追加するSQL文
- **VALUES** — 追加する値を並べる場所

読み方の鍵は、**列の並びと値の並びが同じ順で対応する** ことです。`(name, price)` と書いたら、`('ノート', 200)` の1つ目が `name`、2つ目が `price` になります。

書いていない列には、テーブルに設定された既定の値か `NULL` が入ります。

なお、列名を省略して `INSERT INTO products VALUES (...)` と書く方法もありますが、テーブルの列が増えたときに壊れます。**列名は必ず書いてください。**

## 6-1-2 UPDATEで既存の行を書き換える

> **UPDATE テーブル名 SET 列 = 値 WHERE 条件 で、条件に合う行の値を書き換える**

価格の改定や住所の変更など、既にある行の値を直したい場面があります。消して入れ直すのでは、その行の他の列の値まで失われてしまいます。

```sql
UPDATE products
SET price = 250
WHERE id = 1;
```

- **UPDATE** — 行の値を書き換えるSQL文
- **SET** — どの列をどの値にするかを書く場所

`SET` は複数の列をまとめて書けます。

```sql
UPDATE products
SET price = 250, name = 'ノートA'
WHERE id = 1;
```

そして重要なのが `WHERE` です。SELECT で使ってきた `WHERE` が、そのまま「どの行を書き換えるか」の指定になります。

## 6-1-3 DELETEで行を消す

> **DELETE FROM テーブル名 WHERE 条件 で、条件に合う行を消す**

退会した会員や取り消された注文の行を残したままにすると、集計の結果が実態と合わなくなります。

```sql
DELETE FROM products
WHERE id = 1;
```

**DELETE** が消すのは **行の単位** です。「この列の値だけを消す」ということはできません。列の値を空にしたいときは、`UPDATE` でその列に `NULL` を入れます(下は、任意入力の `note` 列を持つテーブルがある場合の例です。この講座の `products` にはこの列はありません)。

```sql
UPDATE customers SET note = NULL WHERE id = 1;
```

実務では、行を実際に消さず「削除済み」の印を付ける設計もよく使われます。過去の注文履歴などは、消してしまうと後から集計できなくなるためです。どちらの設計を選ぶかは、次の講座(データベース設計入門)で扱います。

## 6-1-4 WHEREを忘れると全行に効く

> **UPDATEとDELETEでWHEREを書き忘れると、テーブルの全行が対象になる**

`WHERE` を書き忘れても、SQLはエラーになりません。文法として正しいからです。そして、**テーブルの全行** が対象になります。

```sql
DELETE FROM products;          -- 全行が消える
UPDATE products SET price = 0; -- 全行の価格が0になる
```

これは実際に起きている事故です。防ぐのは注意力ではなく、手順です。

```sql
-- 1. 消す前に、対象をSELECTで見る
SELECT * FROM products WHERE id = 1;

-- 2. 同じ WHERE のまま DELETE に書き換える
DELETE FROM products WHERE id = 1;
```

**まず `SELECT` で対象を目で確かめ、同じ `WHERE` のまま書き換える。** この順番を習慣にしてください。件数が想定と違えば、その時点で気づけます。

## 6-1-5 トランザクションなら取り消せる

> **BEGINで始めた変更は、COMMITで確定するかROLLBACKで取り消せる**

実行した瞬間に確定してしまうと、間違いに気づいても戻せません。また、複数の更新のうち1つだけ失敗すると、中途半端な状態が残ります(振込で出金だけ済んで入金が失敗する、など)。

- **トランザクション** — まとめて確定・取り消しできる作業のかたまり
- **COMMIT** — 変更を確定する
- **ROLLBACK** — 変更を取り消す

```sql
BEGIN;
UPDATE products SET price = 250 WHERE id = 1;
SELECT * FROM products WHERE id = 1;   -- 結果を確かめる

ROLLBACK;   -- 取り消す(COMMIT なら確定)
```

`BEGIN` から `COMMIT` までの変更は、確定するまで他の利用者からは見えません。だから途中の中途半端な状態を誰にも見せずに済みます。

本番のデータを直すときは、**BEGIN → 実行 → SELECT で確認 → COMMIT** が基本の手順です。想定と違えば `ROLLBACK` で戻せます。前のトピックの `SELECT` による事前確認と組み合わせれば、書き込みの事故はかなり防げます。

## もっと知りたい人へ

- [SQLite Language — INSERT / UPDATE / DELETE](https://www.sqlite.org/lang.html) — 書き込み系の公式リファレンス
- [SQLite Language — TRANSACTION](https://www.sqlite.org/lang_transaction.html) — トランザクションの公式リファレンス

---

演習は [practice.md](practice.md) にあります。
