# レッスン4-1 JOINでテーブルをつなぐ

## このレッスンの目標

- [ ] データを複数のテーブルに分けて持つ理由を説明できる
- [ ] INNER JOIN と LEFT JOIN を使い分けて、2つのテーブルをつなげられる
- [ ] 結合した結果に WHERE や ORDER BY を組み合わせられる

## 4-1-1 データは複数のテーブルに分けて持つ

> **同じ情報を繰り返し書かないよう、データは複数のテーブルに分けて持つ**

注文の表に顧客の名前や住所まで毎回書くと、同じ情報が何度も並びます。同じ情報を何度も書いてしまうことを **重複** と呼びます。

| id | 顧客名 | 住所 | item |
| --- | --- | --- | --- |
| 1 | 佐藤 | 東京都… | コーヒー |
| 2 | 鈴木 | 千葉県… | ケーキセット |
| 3 | 佐藤 | 東京都… | クッキー |

この形だと、佐藤さんが引っ越したら2行とも直すことになります。1行でも直し忘れると、どちらが正しいのか分からなくなります。

そこで、顧客は customers テーブルに1回だけ書き、注文からは番号で指します。行を1つに特定するための番号を **ID** と呼びます。

customers(顧客)

| id | name |
| --- | --- |
| 1 | 佐藤 |
| 2 | 鈴木 |

orders(注文)

| id | customer_id | item |
| --- | --- | --- |
| 1 | 1 | コーヒー |

orders の `customer_id` は「顧客IDが1の人」、つまり佐藤さんを指しています。名前を書く代わりにIDで指すのがポイントです。

## 4-1-2 INNER JOINでテーブルをつなぐ

> **INNER JOIN ... ON で、IDが一致する行どうしをつなげて取り出せる**

テーブルを分けると、orders には customer_id という番号しか残りません。注文一覧の画面には番号ではなく名前を出したいので、customers とつなげて見る必要があります。テーブルどうしをつなげることを **結合**(JOIN)と呼びます。

```sql
SELECT name, item FROM orders INNER JOIN customers ON orders.customer_id = customers.id;
```

| name | item |
| --- | --- |
| 佐藤 | コーヒー |
| 鈴木 | ケーキセット |
| 佐藤 | クッキー |

読み方は次のとおりです。

- `FROM orders INNER JOIN customers` — orders に customers をつなぐ
- `ON orders.customer_id = customers.id` — customer_id と id が一致した行どうしをつなぐ

`ON` が「どの列が一致したらつなぐか」の条件です。IDが一致した行どうしが横に1行につながり、佐藤さんのように注文が2件ある顧客は結果に2回登場します。

## 4-1-3 テーブル名.列名で列を区別する

> **複数テーブルを使うときは、テーブル名.列名 の形でどの列かを区別する**

customers にも orders にも、id という同じ名前の列があります。JOIN でつないだ後にただ `id` と書くと、どちらの id か決められずエラーになります。

```sql
SELECT id FROM orders INNER JOIN customers ON orders.customer_id = customers.id;
-- エラー: id が曖昧(ambiguous)
```

そこで `テーブル名.列名` の形で書きます。テーブル名を頭に付けて列を特定することを **修飾** と呼びます。ドットを「の」と読むと、`customers.id` は「customers の id」と日本語のまま理解できます。

```sql
SELECT customers.name, orders.item
FROM orders
INNER JOIN customers
  ON orders.customer_id = customers.id;
```

`name` や `item` のように片方のテーブルにしかない列は修飾なしでも動きますが、付けておくとどのテーブルの列か一目で分かります。

## 4-1-4 LEFT JOINで左の行を全部残す

> **LEFT JOIN は左のテーブルの行を全部残し、相手がいない部分は NULL になる**

INNER JOIN は、一致する相手がいる行しか残しません。まだ一度も注文していない高橋さんは、INNER JOIN の結果から消えてしまいます。「全顧客の一覧」を作りたいときは、それでは困ります。

```sql
SELECT name, item
FROM customers
LEFT JOIN orders
  ON customers.id = orders.customer_id;
```

| name | item |
| --- | --- |
| 佐藤 | コーヒー |
| 佐藤 | クッキー |
| 鈴木 | ケーキセット |
| 高橋 | NULL |

「左」とは `FROM` に書いたテーブルのことです。顧客の一覧が主役なので、この例では FROM が customers になっています。相手が見つからなくても左の行は消えず、埋まらない部分が NULL になります。

| | 結果に残る行 | 相手がいない行 |
| --- | --- | --- |
| INNER JOIN | 一致した行だけ | 消える |
| LEFT JOIN | 左は全部 | NULL で残る |

消えて困るなら LEFT JOIN、一致した行だけでよいなら INNER JOIN、と使い分けてください。

## 4-1-5 結合した結果も絞り込める

> **JOIN した結果もひとつの表なので、WHERE や ORDER BY がそのまま使える**

JOIN が作るのは、つながった行が並んだ「ひとつの表」です。表に使える道具は、その結果にもすべて使えます。新しい構文はありません。

```sql
SELECT name, item
FROM orders
INNER JOIN customers ON orders.customer_id = customers.id
WHERE name = '佐藤'
ORDER BY item;
```

| name | item |
| --- | --- |
| 佐藤 | クッキー |
| 佐藤 | コーヒー |

長いSQL文は、次の順で読み解きます。

1. `FROM` + `JOIN` — 表をつなぐ
2. `WHERE` — 行を絞る
3. `ORDER BY` — 並べ替える

まず表を作り、絞り、並べる。この読み方は、この先どんなに文が長くなっても通用します。

## もっと知りたい人へ

- JOIN は「まずひとつの表になる」と捉えるのが上達の近道です。結果を紙に書き出してから WHERE を当てる練習をすると、複雑な文も読めるようになります
- 実務では3つ以上のテーブルをつなぐこともあります。書き方は同じで、INNER JOIN ... ON を必要なぶんだけ続けます。まずは2つのテーブルで型を固めましょう

---

演習は [practice.md](practice.md) にあります。
