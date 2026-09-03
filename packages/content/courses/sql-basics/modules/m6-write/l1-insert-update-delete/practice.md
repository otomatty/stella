# レッスン6-1 演習 — データを書き込む

対象トピック: 6-1-1 〜 6-1-5

このレッスンはデータを変える操作を扱います。**必ず練習用のテーブルで試してください。**

## ハンズオン

次のテーブルがあるとして、SQLを書きながら読み進めてください(手元で実行できる環境がある場合は、練習用のデータベースで試します)。

```text
products
| id | name       | price |
|----|------------|-------|
| 1  | ノート     | 200   |
| 2  | ボールペン | 120   |
| 3  | 消しゴム   | 90    |
```

1. 新しい商品を1件追加してみましょう。

```sql
INSERT INTO products (name, price)
VALUES ('定規', 150);
```

2. 追加されたことを確かめます。

```sql
SELECT * FROM products;
```

3. 価格を変更します。**先に対象をSELECTで確かめてから** 実行してください。

```sql
SELECT * FROM products WHERE name = '定規';
UPDATE products SET price = 180 WHERE name = '定規';
```

4. 追加した行を消します。ここでも同じ手順を踏みます。

```sql
SELECT * FROM products WHERE name = '定規';
DELETE FROM products WHERE name = '定規';
```

5. トランザクションを使うと、確認してから確定できます。

```sql
BEGIN;
UPDATE products SET price = 0 WHERE id = 1;
SELECT * FROM products WHERE id = 1;
ROLLBACK;
SELECT * FROM products WHERE id = 1;   -- 元に戻っている
```

## 演習問題

### 問1(基本)

`products` に「マーカー / 250円」の行を追加するSQLを書いてください。

### 問2(基本)

`id` が 2 の商品の価格を 130 に変更するSQLを書いてください。

### 問3(応用)

価格が 100 未満の商品をすべて削除するSQLを書いてください。実行前に確認するためのSQLも書いてください。

### 問4(応用)

次のSQLを実行すると何が起きますか。危険な理由と、正しい書き方を説明してください。

```sql
UPDATE products SET price = 0;
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```sql
INSERT INTO products (name, price)
VALUES ('マーカー', 250);
```

列の並びと値の並びを同じ順にします。`id` を書いていないので、既定の値(自動採番など)が入ります。

</details>

<details>
<summary>問2の解答例</summary>

```sql
UPDATE products
SET price = 130
WHERE id = 2;
```

`SET` で変える内容、`WHERE` で対象の行を指定します。どちらも欠かせません。

</details>

<details>
<summary>問3の解答例</summary>

```sql
-- 1. 対象を確認する
SELECT * FROM products WHERE price < 100;

-- 2. 同じ WHERE のまま削除する
DELETE FROM products WHERE price < 100;
```

先に `SELECT` で件数と中身を確かめ、想定どおりなら同じ条件で `DELETE` に書き換えます。

</details>

<details>
<summary>問4の解答例</summary>

- 何が起きるか: `WHERE` が無いので、**テーブルの全行**の価格が0になります。
- 危険な理由: 文法として正しいためエラーにならず、実行した瞬間に全件が書き換わります。
- 正しい書き方: 対象を `WHERE` で指定します。実行前に `SELECT * FROM products WHERE ...;` で確認し、可能なら `BEGIN` で始めて確認後に `COMMIT` します。

</details>

## 確認クイズ

### Q1. テーブルに新しい行を追加するSQL文はどれですか。

- A. `INSERT`
- B. `UPDATE`
- C. `SELECT`

<details>
<summary>答え</summary>

**A** — `INSERT INTO テーブル名 (列) VALUES (値)` の形で追加します。

</details>

### Q2. `UPDATE products SET price = 250 WHERE id = 1;` の `WHERE` の役割はどれですか。

- A. 変更後の値を指定する
- B. 書き換える対象の行を指定する
- C. 変更を確定する

<details>
<summary>答え</summary>

**B** — 値を決めるのは `SET`、対象を決めるのが `WHERE` です。

</details>

### Q3. `DELETE` が消す単位はどれですか。

- A. 行
- B. 列
- C. テーブル全体だけ

<details>
<summary>答え</summary>

**A** — 消えるのは行です。列の値だけを空にしたいときは `UPDATE` で `NULL` を入れます。

</details>

### Q4. `DELETE FROM products;` を実行するとどうなりますか。

- A. エラーになる
- B. 何も起きない
- C. テーブルの全行が消える

<details>
<summary>答え</summary>

**C** — `WHERE` が無いと全行が対象です。文法としては正しいのでエラーになりません。

</details>

### Q5. トランザクションについて正しいものはどれですか。

- A. `BEGIN` で始めた変更は、`COMMIT` で確定、`ROLLBACK` で取り消せる
- B. 実行したSQLはすべて即座に確定する
- C. `SELECT` の結果を保存する仕組み

<details>
<summary>答え</summary>

**A** — 確定するまで他からは見えないので、確認してから確定できます。

</details>
