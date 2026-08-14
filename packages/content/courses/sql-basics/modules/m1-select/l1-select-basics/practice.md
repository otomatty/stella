# レッスン1-1 演習 — SELECTでデータを取り出す

対象トピック: 1-1-1 〜 1-1-4

## ハンズオン

このレッスンから、VS Code のコード演習が始まります。レッスン一覧の「演習: 列を選んで取り出す」を VS Code で開いてください。

演習には次の products テーブルが用意されています。

| id | name | price | stock |
| --- | --- | --- | --- |
| 1 | コーヒー | 300 | 20 |
| 2 | サンドイッチ | 450 | 8 |
| 3 | クッキー | 200 | 35 |

課題に取り組む前に、ターミナルタブで次を試してみましょう(採点には影響しません)。

```sql
SELECT * FROM products;
```

写経できたら、次の改造をしてみましょう。

1. `*` を `name` に変えて、結果の列がどう変わるか確かめる
2. `SELECT name, price FROM products;` で2列を取り出す
3. `SELECT name AS 商品名 FROM products;` で見出しを変える

## 演習問題

### 問1(基本)

products テーブルから `price` の列だけを取り出すSQL文を書いてください。

### 問2(基本)

products テーブルから `name` と `stock` の2列を、この順番で取り出すSQL文を書いてください。

### 問3(応用)

products テーブルから、`name` と「`price` を2割引きした金額」を取り出すSQL文を書いてください。割引き後の金額には `セール価格` という別名を付けてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```sql
SELECT price FROM products;
```

ほしい列を `SELECT` に、テーブル名を `FROM` に書きます。

</details>

<details>
<summary>問2の解答例</summary>

```sql
SELECT name, stock FROM products;
```

列名はカンマで区切ります。結果の列は書いた順番どおりに並びます。

</details>

<details>
<summary>問3の解答例</summary>

```sql
SELECT name, price * 0.8 AS セール価格 FROM products;
```

2割引きは「元の価格の0.8倍」なので、式は `price * 0.8` です。式には `AS` で別名を付けます。

</details>

## 確認クイズ

### Q1. products テーブルから name 列だけを取り出す正しいSQL文はどれですか。

- A. SELECT products FROM name;
- B. SELECT name FROM products;
- C. FROM products SELECT name;

<details>
<summary>答え</summary>

**B** — `SELECT 列名 FROM テーブル名` の順です。ほしい列が先、テーブルが後と覚えてください。

</details>

### Q2. SELECT * FROM products; の * の意味はどれですか。

- A. すべての列を取り出す
- B. すべての行を1行にまとめる
- C. 結果を並べ替える

<details>
<summary>答え</summary>

**A** — `*` は「全列」の指定です。なお、この段階のSELECTでは行はもともと全件返っています。

</details>

### Q3. 画面に組み込むSQL文で * より列名指定が推奨される理由はどれですか。

- A. * は動作が保証されていないため
- B. 列が増えたとき余計なデータまで運ばれてしまうため
- C. 列名で書かないと別名が付けられないため

<details>
<summary>答え</summary>

**B** — `*` も正しく動きますが、テーブルに列が増えると結果も勝手に増えます。必要な列だけを明示するのが組み込みの基本です。

</details>

### Q4. SELECT price * 1.1 AS 税込 FROM products; の AS の役割はどれですか。

- A. テーブル本体の列名を「税込」に変更する
- B. 結果の見出しに「税込」という別名を付ける
- C. 計算式を実行せずに文字のまま表示する

<details>
<summary>答え</summary>

**B** — `AS` は結果の見出しを付け直すだけです。テーブル本体は変わりません。

</details>
