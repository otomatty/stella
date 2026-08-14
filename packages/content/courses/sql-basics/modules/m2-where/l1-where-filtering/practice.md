# レッスン2-1 演習 — WHEREで行を絞り込む

対象トピック: 2-1-1 〜 2-1-5

## ハンズオン

レッスン一覧の「演習: WHERE で行を絞り込む」を VS Code で開いてください。

演習には次の products テーブルが用意されています。

| id | name | price | stock |
| --- | --- | --- | --- |
| 1 | コーヒー | 300 | 20 |
| 2 | サンドイッチ | 450 | 0 |
| 3 | ケーキ | 500 | 5 |
| 4 | クッキー | 200 | 35 |
| 5 | 紅茶 | 350 | 0 |

課題は「`price` が300以上で、かつ `stock` が1以上の行を取り出す」です。取り組む前に、ターミナルタブで次を試してみましょう(採点には影響しません)。

```sql
SELECT * FROM products;
```

写経できたら、次の改造をしてみましょう。

1. `WHERE price >= 300` だけを付けて、何行残るか確かめる
2. 条件を `WHERE stock = 0` に変えて、売り切れの商品だけを取り出す
3. `AND` で2つの条件をつなぎ、課題の形に仕上げる

## 演習問題

### 問1(基本)

products テーブルから、売り切れ(`stock` が 0)の商品の `name` を取り出すSQL文を書いてください。

### 問2(基本)

products テーブルから、`price` が300以上500未満の商品の `name` と `price` を取り出すSQL文を書いてください。

### 問3(応用)

products テーブルから、「`price` が250以下、または `stock` が30以上」の商品の `name` を取り出すSQL文を書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```sql
SELECT name FROM products WHERE stock = 0;
```

「売り切れ」を `stock = 0` という条件に翻訳します。結果はサンドイッチと紅茶です。

</details>

<details>
<summary>問2の解答例</summary>

```sql
SELECT name, price FROM products WHERE price >= 300 AND price < 500;
```

「300以上」は `>=`、「500未満」は `<` です。境目の値を含むかどうかで記号を選びます。結果はコーヒーと紅茶とサンドイッチです。

</details>

<details>
<summary>問3の解答例</summary>

```sql
SELECT name FROM products WHERE price <= 250 OR stock >= 30;
```

「または」なので `OR` でつなぎます。クッキーは両方の条件を満たしますが、結果に出るのは1回だけです。

</details>

## 確認クイズ

### Q1. WHERE の役割として正しいものはどれですか。

- A. 取り出す列を選ぶ
- B. 条件に合う行だけに絞り込む
- C. 結果の見出しを付け直す

<details>
<summary>答え</summary>

**B** — WHERE は行を選びます。列を選ぶのは SELECT、見出しを付け直すのは AS の役割です。

</details>

### Q2. 「price が300以上」を表す条件はどれですか。

- A. price > 300
- B. price >= 300
- C. price = 300

<details>
<summary>答え</summary>

**B** — 「以上」は境目の300を含むので `>=` です。`>` だと300ちょうどの行が外れてしまいます。

</details>

### Q3. 「price が300以上で、かつ stock が1以上」の行を取り出す書き方はどれですか。

- A. WHERE price >= 300 OR stock >= 1
- B. WHERE price >= 300 AND stock >= 1
- C. WHERE price >= 300, stock >= 1

<details>
<summary>答え</summary>

**B** — 「かつ」は `AND` でつなぎます。`OR` だとどちらか一方を満たす行まで残り、カンマ区切りはエラーになります。

</details>

### Q4. discount_price が NULL の行を取り出す書き方はどれですか。

- A. WHERE discount_price = NULL
- B. WHERE discount_price IS NULL
- C. WHERE discount_price != NULL

<details>
<summary>答え</summary>

**B** — NULL は値ではないので比較演算子では調べられません。`= NULL` はエラーにならないまま1行も返さないので、特に注意してください。

</details>
