# レッスン3-1 演習 — 並べ替えと件数の制限

対象トピック: 3-1-1 〜 3-1-3

## ハンズオン

このレッスンのコード演習は3本あります。レッスン一覧から順に VS Code で開いてください。

1. 「演習: 昇順で取り出す」 — ORDER BY で小さい順に並べる
2. 「演習: 絞り込んで並べ替える」 — WHERE と ORDER BY を組み合わせる
3. 「演習: 上位だけ取り出す」 — ORDER BY 〜 DESC LIMIT で上位N件に絞る

演習には次の orders テーブル(注文の記録)が用意されています。

| id | item | amount |
| --- | --- | --- |
| 1 | コーヒー | 300 |
| 2 | ケーキセット | 800 |
| 3 | サンドイッチ | 450 |
| 4 | パーティープレート | 2400 |
| 5 | クッキー | 200 |

取り組む前に、ターミナルタブで次を試してみましょう(採点には影響しません)。

```sql
SELECT * FROM orders ORDER BY amount;
```

写経できたら、`ORDER BY amount DESC` に変えて向きが逆になることと、`LIMIT 3` を足して件数が絞られることを確かめてください。

## 演習問題

### 問1(基本)

orders テーブルから `item` と `amount` を、`amount` の小さい順に取り出すSQL文を書いてください。

### 問2(基本)

orders テーブルから `item` と `amount` を、`amount` の大きい順に取り出すSQL文を書いてください。

### 問3(応用)

orders テーブルから、金額が大きい注文の上位2件の `item` を取り出すSQL文を書いてください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```sql
SELECT item, amount FROM orders ORDER BY amount;
```

昇順は既定なので、`ORDER BY amount` だけで小さい順になります。先頭はクッキー(200)です。

</details>

<details>
<summary>問2の解答例</summary>

```sql
SELECT item, amount FROM orders ORDER BY amount DESC;
```

大きい順にしたいので `DESC` を付けます。先頭はパーティープレート(2400)です。

</details>

<details>
<summary>問3の解答例</summary>

```sql
SELECT item FROM orders ORDER BY amount DESC LIMIT 2;
```

「上位2件」= 大きい順に並べてから先頭2件です。結果はパーティープレートとケーキセットになります。並べ替えずに `LIMIT 2` だけ書くと、どの行が返るか保証されません。

</details>

## 確認クイズ

### Q1. ORDER BY を書かなかったとき、結果の並び順はどうなりますか。

- A. 必ず id の小さい順になる
- B. 並び順は保証されない
- C. 必ず名前の五十音順になる

<details>
<summary>答え</summary>

**B** — 指定しない限り、並び順は保証されません。たまたま id 順に見えても偶然です。順番に意味があるなら必ず ORDER BY を書きます。

</details>

### Q2. ORDER BY amount とだけ書いたときの並び順はどれですか。

- A. amount の小さい順(昇順)
- B. amount の大きい順(降順)
- C. amount が同じ行だけ残る

<details>
<summary>答え</summary>

**A** — 既定は昇順(小さい順)です。大きい順にしたいときだけ DESC を付けます。

</details>

### Q3. 金額が大きい順に上位3件を取り出す書き方はどれですか。

- A. SELECT item FROM orders ORDER BY amount LIMIT 3;
- B. SELECT item FROM orders ORDER BY amount DESC LIMIT 3;
- C. SELECT item FROM orders LIMIT 3 ORDER BY amount DESC;

<details>
<summary>答え</summary>

**B** — 大きい順は `DESC`、件数は最後に `LIMIT 3` です。A は小さい順の3件になり、C は語順が違うためエラーになります。

</details>

### Q4. LIMIT 2 の意味として正しいものはどれですか。

- A. 2行目以降を取り出す
- B. 先頭から2件だけを取り出す
- C. 列を2つだけ取り出す

<details>
<summary>答え</summary>

**B** — LIMIT は「先頭から何件か」を指定します。行を数えるのであって、列の数は変わりません。

</details>
