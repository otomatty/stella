# レッスン7-1 演習 — テーブルを作る

対象トピック: 7-1-1 〜 7-1-3

## ハンズオン

紙の上でもできる演習です。手元で実行できる環境がある場合は、練習用のデータベースで試してください。

1. 次の要件のテーブルを定義します。

```text
会員テーブル(members)
- 会員ID   : 整数。1人を特定する目印
- 氏名     : 文字列
- 入会日   : 文字列('2026-04-12' の形)
```

```sql
CREATE TABLE members (
  id        INTEGER PRIMARY KEY,
  name      TEXT,
  joined_at TEXT
);
```

2. 作ったテーブルに行を入れます。

```sql
INSERT INTO members (id, name, joined_at)
VALUES (1, '佐藤', '2026-04-01');
```

3. 主キーの制約を確かめます。同じ `id` をもう一度入れるとどうなるか、予想してから実行してください。

```sql
INSERT INTO members (id, name, joined_at)
VALUES (1, '田中', '2026-04-02');
-- => UNIQUE constraint failed: members.id
```

4. モジュール4で学んだ `JOIN` とのつながりを確かめます。注文テーブルを作り、会員IDでつなぎます。

```sql
CREATE TABLE orders (
  id        INTEGER PRIMARY KEY,
  member_id INTEGER,
  total     INTEGER
);

SELECT members.name, orders.total
FROM orders
INNER JOIN members ON orders.member_id = members.id;
```

## 演習問題

### 問1(基本)

次の要件で `books` テーブルを定義するSQLを書いてください。

```text
- 書籍ID : 整数。1冊を特定する目印
- 書名   : 文字列
- 価格   : 整数
```

### 問2(基本)

価格の列を `TEXT` にすると、後の処理でどんな困りごとが起きますか。

### 問3(応用)

主キーに付く2つの制約を挙げ、それぞれが何を防いでいるか説明してください。

### 問4(応用)

`WHERE id = 1` と書けば必ず1件に決まる、と言えるのはなぜですか。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```sql
CREATE TABLE books (
  id    INTEGER PRIMARY KEY,
  title TEXT,
  price INTEGER
);
```

1冊を特定する目印なので、書籍IDに `PRIMARY KEY` を付けます。

</details>

<details>
<summary>問2の解答例</summary>

集計の結果が、エラーにならないまま間違った値になります。

SQLite は `TEXT` の列でも `SUM` や `AVG` を計算します。ただし `'200'` は 200、`'120円'` は 120、`'abc'` は 0 と読み替えられるため、書き方がばらつくと合計が静かにずれます。エラーで気づけない分、かえって危険です。データ型を決めておくと、入れる値をそろえる約束になります(SQLite で宣言どおりに拒否させたいときは `STRICT` テーブルを使います)。

</details>

<details>
<summary>問3の解答例</summary>

- 重複を許さない: 同じ値の行が2件できることを防ぎます。
- 空(NULL)を許さない: 目印の無い行ができることを防ぎます(SQL 標準の約束)。

この2つがあるから、主キーの値で行を1件に特定できます。

なお NULL については SQLite だけ例外です。`INTEGER PRIMARY KEY` に `NULL` を入れると自動で番号が振られ、`TEXT` の主キーや複数列の主キーでは `NULL` の行が何行でも作れてしまいます。主キーの列には `NOT NULL` も書いておくと、SQLite でも拒否されます。

</details>

<details>
<summary>問4の解答例</summary>

`id` が主キーで、重複が許されないためです。

同じ `id` を持つ行は最大1件しか存在しないので、条件に合う行も1件に決まります。名前のように重複しうる列では、この保証がありません。

</details>

## 確認クイズ

### Q1. テーブルを作るSQL文はどれですか。

- A. `CREATE TABLE`
- B. `INSERT INTO`
- C. `SELECT`

<details>
<summary>答え</summary>

**A** — `CREATE TABLE` で名前と列を定義します。行を入れるのは `INSERT` です。

</details>

### Q2. 整数を入れる列に指定するデータ型はどれですか。

- A. `TEXT`
- B. `INTEGER`
- C. `REAL`

<details>
<summary>答え</summary>

**B** — `INTEGER` が整数、`TEXT` が文字列、`REAL` が小数です。

</details>

### Q3. 価格の列に `TEXT` を指定すると起きる問題はどれですか。

- A. 行を追加できなくなる
- B. 集計がエラーにならないまま、間違った値になることがある
- C. テーブルを作れなくなる

<details>
<summary>答え</summary>

**B** — SQLite は `TEXT` の列でも集計します。`'120円'` は 120、`'abc'` は 0 と読み替えられるため、書き方がばらつくと合計が静かにずれます。

</details>

### Q4. 主キーの説明として正しいものはどれですか。

- A. 行を1つに特定する列で、同じ値を2回入れられない
- B. テーブルの最初の列のこと
- C. 検索を速くするためだけの設定

<details>
<summary>答え</summary>

**A** — 同じ値を2回入れられないので、その値で行が1件に決まります(空を許さないという約束も付きますが、SQLite では `NOT NULL` を自分で書く必要があります)。

</details>

### Q5. `JOIN ... ON` でテーブルをつなぐときに目印として使われるのは、多くの場合どの列ですか。

- A. 主キー(と、それを指す列)
- B. 名前の列
- C. 日付の列

<details>
<summary>答え</summary>

**A** — 主キーは行を一意に決めるので、つなぐときの目印になります。

</details>
