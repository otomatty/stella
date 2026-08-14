# レッスン4-1 演習 — JOINでテーブルをつなぐ

対象トピック: 4-1-1 〜 4-1-5

## ハンズオン

このレッスンのコード演習は2本です。レッスン一覧から VS Code で開いてください。

1. 「演習: INNER JOIN で結合する」
2. 「演習: LEFT JOIN で全員を残す」

演習には次の2つのテーブルが用意されています。

customers

| id | name |
| --- | --- |
| 1 | 佐藤 |
| 2 | 鈴木 |
| 3 | 高橋 |

orders

| id | customer_id | item |
| --- | --- | --- |
| 1 | 1 | コーヒー |
| 2 | 2 | ケーキセット |
| 3 | 1 | クッキー |

課題に取り組む前に、ターミナルタブで次を試してみましょう(採点には影響しません)。

```sql
SELECT name, item FROM orders INNER JOIN customers ON orders.customer_id = customers.id;
```

写経できたら、次の改造をしてみましょう。

1. `INNER JOIN` を `LEFT JOIN` に、`FROM orders` を `FROM customers` に変えて、高橋さんの行がどうなるか確かめる
2. `SELECT` の列を `customers.name, orders.item` と修飾した形に書き換えて、結果が変わらないことを確かめる
3. 末尾(セミコロンの前)に `WHERE name = '佐藤'` を足して、結合結果が絞り込めることを確かめる

## 演習問題

### 問1(基本)

orders と customers を INNER JOIN でつなぎ、注文ごとに `item` と `name` をこの順番で取り出すSQL文を書いてください。

### 問2(基本)

問1の文の `SELECT` の列を、テーブル名.列名 の形で修飾して書き直してください。

### 問3(応用)

注文が1件もない顧客も含めて、全顧客の `name` と注文の `item` を取り出すSQL文を書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```sql
SELECT item, name FROM orders INNER JOIN customers ON orders.customer_id = customers.id;
```

`ON` には「orders の customer_id と customers の id が一致したらつなぐ」という条件を書きます。

</details>

<details>
<summary>問2の解答例</summary>

```sql
SELECT orders.item, customers.name
FROM orders
INNER JOIN customers
  ON orders.customer_id = customers.id;
```

`item` と `name` は片方のテーブルにしかないので修飾なしでも動きますが、修飾するとどの列か一目で分かります。

</details>

<details>
<summary>問3の解答例</summary>

```sql
SELECT name, item
FROM customers
LEFT JOIN orders
  ON customers.id = orders.customer_id;
```

「全顧客」が主役なので、customers を `FROM`(左)に置いて LEFT JOIN します。注文のない高橋さんは `item` が NULL の行として残ります。

</details>

## 確認クイズ

### Q1. 注文テーブルに顧客の住所を毎回書かず、customers テーブルに分けて持つ一番の理由はどれですか。

- A. 同じ情報の重複をなくし、変更漏れを防ぐため
- B. テーブルの数が多いほど処理が速くなるため
- C. 1つのテーブルに入れられる列の数に上限があるため

<details>
<summary>答え</summary>

**A** — 同じ情報を繰り返し書くと、変更のたびに全部の行を直すことになり、直し忘れで食い違いが生まれます。

</details>

### Q2. INNER JOIN の ON に書くものはどれですか。

- A. 取り出したい列の一覧
- B. どの列が一致したら行をつなぐか、という条件
- C. 結果の並び順

<details>
<summary>答え</summary>

**B** — `ON orders.customer_id = customers.id` のように、行どうしをつなぐ条件を書きます。取り出す列は SELECT に書きます。

</details>

### Q3. 両方のテーブルに id 列があるとき、JOIN した文でただ id と書くとどうなりますか。

- A. 左のテーブルの id が自動で選ばれる
- B. 両方の id が2列とも返る
- C. どちらの id か決められず、曖昧だというエラーになる

<details>
<summary>答え</summary>

**C** — どちらの列か特定できないためエラーになります。`orders.id` のようにテーブル名.列名 で修飾して区別します。

</details>

### Q4. 注文が1件もない顧客の行について、正しい説明はどれですか。

- A. INNER JOIN でも LEFT JOIN でも結果に残らない
- B. INNER JOIN では消えるが、customers を左にした LEFT JOIN なら NULL 付きで残る
- C. INNER JOIN では NULL 付きで残るが、LEFT JOIN では消える

<details>
<summary>答え</summary>

**B** — INNER JOIN は一致した行だけを残します。左の行を全部残したいときは LEFT JOIN を使い、相手がいない部分は NULL になります。

</details>
