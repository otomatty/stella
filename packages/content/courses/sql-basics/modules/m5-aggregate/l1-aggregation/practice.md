# レッスン5-1 演習 — 集計してまとめる

対象トピック: 5-1-1 〜 5-1-4

## ハンズオン

このレッスンのコード演習は2本です。レッスン一覧から VS Code で開いてください。

1. 「演習: GROUP BY で集計する」
2. 「演習: HAVING で集計結果を絞る」

演習には次の orders テーブルが用意されています。

| id | customer | amount |
| --- | --- | --- |
| 1 | alice | 100 |
| 2 | alice | 250 |
| 3 | bob | 120 |
| 4 | carol | 300 |
| 5 | carol | 80 |
| 6 | carol | 40 |

課題に取り組む前に、ターミナルタブで次を試してみましょう(採点には影響しません)。

```sql
SELECT COUNT(*) FROM orders;
```

写経できたら、次の改造をしてみましょう。

1. `COUNT(*)` を `SUM(amount)` や `AVG(amount)` に変えて、結果の数字がどう変わるか確かめる
2. 末尾(セミコロンの前)に `WHERE amount >= 200` を足して、数える対象が絞られることを確かめる
3. `SELECT customer, COUNT(*) FROM orders GROUP BY customer;` で、結果が顧客ごとの3行になることを確かめる

## 演習問題

### 問1(基本)

orders テーブルの `amount` の合計をひとつの数字で取り出すSQL文を書いてください。

### 問2(基本)

顧客ごとの `amount` の合計を、`customer` と合計の2列で取り出すSQL文を書いてください。合計には `total` という別名を付けてください。

### 問3(応用)

問2の結果のうち、合計が200以上の顧客だけに絞ったSQL文を書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```sql
SELECT SUM(amount) FROM orders;
```

合計は集計関数 `SUM` です。6行の `amount` がひとつの数字(890)にまとまります。

</details>

<details>
<summary>問2の解答例</summary>

```sql
SELECT customer, SUM(amount) AS total FROM orders GROUP BY customer;
```

`GROUP BY customer` で同じ顧客の行がグループになり、グループごとに `SUM` が働きます。

</details>

<details>
<summary>問3の解答例</summary>

```sql
SELECT customer, SUM(amount) AS total
FROM orders
GROUP BY customer
HAVING SUM(amount) >= 200;
```

集計した結果への条件なので、WHERE ではなく `HAVING` に書きます。bob(合計120)だけが消えます。

</details>

## 確認クイズ

### Q1. orders テーブルの行数をひとつの数字で取り出すSQL文はどれですか。

- A. SELECT COUNT(*) FROM orders;
- B. SELECT * FROM orders;
- C. SELECT SUM(*) FROM orders;

<details>
<summary>答え</summary>

**A** — 行の数を数えるのは `COUNT(*)` です。`SELECT *` は行をそのまま全部取り出すだけで、数えてはくれません。

</details>

### Q2. AVG(amount) が返すものはどれですか。

- A. amount の合計
- B. amount の平均
- C. amount が一番大きい行

<details>
<summary>答え</summary>

**B** — `AVG` は平均を返す集計関数です。合計は `SUM`、最大は `MAX` です。

</details>

### Q3. SELECT customer, COUNT(*) AS cnt FROM orders GROUP BY customer; の結果は何行になりますか(orders は上の6行のテーブルとします)。

- A. 1行
- B. 3行
- C. 6行

<details>
<summary>答え</summary>

**B** — グループの数がそのまま結果の行数になります。customer は alice・bob・carol の3種類なので3行です。

</details>

### Q4. 「amount の合計が300以上の顧客だけ」に絞る条件を書く場所はどれですか。

- A. WHERE — 集計の前に行を絞るから
- B. HAVING — 集計した結果を絞るから
- C. ORDER BY — 結果を並べ替えるから

<details>
<summary>答え</summary>

**B** — 合計は集計してみないと分からないので、集計の後に効く `HAVING` に書きます。WHERE は集計の前に個々の行を絞る場所です。

</details>
