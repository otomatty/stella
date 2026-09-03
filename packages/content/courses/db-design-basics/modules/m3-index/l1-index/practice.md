# レッスン3-1 演習 — インデックス

対象トピック: 3-1-1 〜 3-1-4

## 手元で試す

紙の上で考える演習です。次のテーブルと、よく実行されるSQLを見てください。

```text
orders
| id | customer_id | status  | created_at   | total |

よく実行されるSQL
A) SELECT * FROM orders WHERE id = 100;
B) SELECT * FROM orders WHERE customer_id = 5;
C) SELECT * FROM orders WHERE status = 'paid';
D) SELECT * FROM orders WHERE created_at >= '2026-04-01';
E) SELECT c.name, o.total FROM orders o
     INNER JOIN customers c ON o.customer_id = c.id;
```

1. すでにインデックスがある(作らなくてよい)のはどのSQLですか
2. インデックスを作ると効果が大きいのはどれですか
3. 効果が小さいと考えられるのはどれですか。理由も書いてください
4. 作ると決めた列について、`CREATE INDEX` を書いてください

`status` の値は `paid` / `unpaid` の2種類で、半分ずつ存在するものとします。

## 演習問題

### 問1(基本)

インデックスが無い列で検索したとき、データベースは何をしますか。

### 問2(基本)

`orders` の `customer_id` にインデックスを作るSQLを書いてください。

### 問3(応用)

「速くなるなら全部の列にインデックスを作ればよい」という考えの問題点を説明してください。

### 問4(応用)

値が `paid` と `unpaid` の2種類しかない `status` 列にインデックスを作っても、あまり速くならないことがあります。理由を説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

先頭の行から順に、全行を調べます(全表走査)。

行数に比例して時間がかかるため、開発中の少ないデータでは気づかず、本番の件数で問題になります。

</details>

<details>
<summary>問2の解答例</summary>

```sql
CREATE INDEX idx_orders_customer
ON orders (customer_id);
```

外部キーの列は `JOIN` で繰り返し使われるので、インデックスの候補になりやすい列です。

</details>

<details>
<summary>問3の解答例</summary>

インデックスは書き込みのたびに更新されるため、追加・更新・削除が遅くなります。

インデックスが5個あれば、1行の追加で6か所(本体+目次5つ)を更新することになります。検索が多い列に絞って作り、迷ったら作らないのが基本です。

</details>

<details>
<summary>問4の解答例</summary>

値が2種類しかなく、条件に合う行が全体の半分ほどになるためです(選択性が低い)。

目次を引いても結局は大量の行を読むことになり、全表走査と大きく変わりません。インデックスは、少数の行に絞り込める列で効果を発揮します。

</details>

## 確認クイズ

### Q1. インデックスが無い列での検索の動きはどれですか。

- A. 先頭から全行を順に調べる
- B. ランダムに一部だけ調べる
- C. エラーになる

<details>
<summary>答え</summary>

**A** — 全表走査です。行数に比例して遅くなります。

</details>

### Q2. 主キーの列について正しいものはどれですか。

- A. 自動でインデックスが作られる
- B. インデックスは作れない
- C. 手動で作らないと検索が遅い

<details>
<summary>答え</summary>

**A** — だから `WHERE id = 1` は最初から速く動きます。

</details>

### Q3. インデックスを増やしたときに起きることはどれですか。

- A. 書き込み(追加・更新・削除)が遅くなる
- B. テーブルの列が増える
- C. 検索結果が変わる

<details>
<summary>答え</summary>

**A** — 本体と一緒に目次も更新するためです。検索結果そのものは変わりません。

</details>

### Q4. インデックスの効果が大きい列はどれですか。

- A. `JOIN` や `WHERE` でよく使い、少数に絞り込める列
- B. 値が2種類しかない列
- C. めったに検索しない列

<details>
<summary>答え</summary>

**A** — 使用頻度と選択性の両方が高い列に作ります。

</details>

### Q5. インデックスを作るかどうか迷ったときの既定の判断はどれですか。

- A. とりあえず作る
- B. 迷ったら作らない(後から追加できる)
- C. すべての列に作る

<details>
<summary>答え</summary>

**B** — 後から追加できますが、不要なものは判断が付かず消しにくくなります。

</details>
