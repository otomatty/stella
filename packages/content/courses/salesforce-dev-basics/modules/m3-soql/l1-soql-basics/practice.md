# レッスン3-1 演習 — レコードを取り出す

対象トピック: 3-1-1 〜 3-1-4

## 手元で試す

開発者コンソールのクエリエディタで、SOQL を実際に流します。

1. **開発者コンソールを開く** — 右上の歯車の隣、または設定の検索から「開発者コンソール」を開きます。下部の「Query Editor」タブを使います
2. **基本形を流す** — `SELECT Id, Name FROM Account` を実行し、結果が表で返ることを確かめます。`SELECT * FROM Account` は書けないことも試してください
3. **絞り込む** — `SELECT Name FROM Account WHERE Name LIKE '富士%'` のように条件を足して、返る件数が減ることを確かめます
4. **親をたどる** — 商談を 1 件作ってから `SELECT Name, Account.Name FROM Opportunity` を実行し、取引先名が一緒に返ることを確かめます
5. **子を取る** — `SELECT Name, (SELECT Name FROM Opportunities) FROM Account` を実行し、取引先の行の中に商談がぶら下がることを確かめます

```text
確かめること
- SELECT * はエラーになる
- 親をたどるときは Account、子を取るときは Opportunities と、名前が違う
```

## 演習問題

### 問1(基本)

取引先オブジェクト(`Account`)から、業種(`Industry`)が `Manufacturing` のレコードの名前と電話番号を取り出す SOQL を書いてください。

### 問2(基本)

商談(`Opportunity`)の一覧に、ひもづく取引先の電話番号も含めて取り出す SOQL を書いてください。

### 問3(応用)

同僚が「取引先を全件取ってから、1 件ずつループの中で商談を問い合わせている」というコードを書きました。何が問題で、どう書き直しますか。SOQL の形も添えて 2〜3 文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```apex
SELECT Name, Phone FROM Account WHERE Industry = 'Manufacturing'
```

文字列はシングルクォートで囲みます。項目は名指しし、`*` は使えません。

</details>

<details>
<summary>問2の解答例</summary>

```apex
SELECT Name, Account.Phone FROM Opportunity
```

子から親へはドット表記でたどります。JOIN 句は書きません。

</details>

<details>
<summary>問3の解答例</summary>

取引先の件数だけ SOQL が走るので、件数が増えると問い合わせ回数の上限に当たります。親から子はサブクエリで一度に取れるので、`SELECT Name, (SELECT Name, Amount FROM Opportunities) FROM Account` の形にすれば、クエリは 1 回で済みます。加えて WHERE で対象を絞ると、取得行数も抑えられます。

</details>

## 確認クイズ

### Q1. SOQL について正しいものはどれですか。

- A. `SELECT *` で全項目を取り出せる
- B. 取り出す項目は必ず名指しする
- C. 項目を省略すると自動で全項目が返る

<details>
<summary>答え</summary>

**B** — 取得量に上限がある基盤なので、必要な項目だけを運ぶ設計になっています。

</details>

### Q2. 商談から、ひもづく取引先の名前を取り出す書き方はどれですか。

- A. `SELECT Name, Account.Name FROM Opportunity`
- B. `SELECT Name FROM Opportunity JOIN Account`
- C. `SELECT Name, (SELECT Name FROM Account) FROM Opportunity`

<details>
<summary>答え</summary>

**A** — 子から親へはドット表記です。SOQL に JOIN 句はありません。

</details>

### Q3. 取引先と、その取引先にひもづく商談をまとめて取り出す書き方はどれですか。

- A. `SELECT Name, Opportunity.Name FROM Account`
- B. `SELECT Name, (SELECT Name FROM Opportunities) FROM Account`
- C. `SELECT Name FROM Account, Opportunity`

<details>
<summary>答え</summary>

**B** — 親から子はサブクエリです。丸かっこの中には子リレーション名(複数形)を書きます。

</details>

### Q4. カスタムのリレーション項目 `Store__c` を通じて、親の名前をたどる書き方はどれですか。

- A. `Store__c.Name`
- B. `Store__r.Name`
- C. `Store.Name`

<details>
<summary>答え</summary>

**B** — 項目そのものを指すときは `__c`、親をたどるときは `__r` です。取り違えは初学者が必ずやります。

</details>

### Q5. WHERE を書かずに全件を取り出すクエリの問題として、いちばん適切なものはどれですか。

- A. 構文エラーになって実行できない
- B. データの少ない開発組織では動くが、件数が増えた本番で上限に当たる
- C. 取得した結果が自動で 200 件に丸められる

<details>
<summary>答え</summary>

**B** — すぐには壊れないのが厄介なところです。件数が増えて初めて落ちます。

</details>
