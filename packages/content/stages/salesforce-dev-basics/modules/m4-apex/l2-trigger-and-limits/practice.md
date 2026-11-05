# レッスン4-2 演習 — トリガとガバナ制限

対象トピック: 4-2-1 〜 4-2-4

## 手元で試す

Developer Edition 組織で、トリガを作って束で呼ばれることを体験します。

1. **トリガを作る** — 設定 → オブジェクトマネージャ →`点検`→「トリガ」→「新規」。次を貼り付けて保存します

```apex
trigger InspectionTrigger on Inspection__c (before insert) {
  for (Inspection__c item : Trigger.new) {
    System.debug('件数: ' + Trigger.new.size());
    if (item.Result__c == null) { item.Result__c = '要再点検'; }
  }
}
```

2. **1 件で試す** — 画面から点検を 1 件作り、結果が自動で埋まることを確かめます
3. **束で試す** — 匿名実行で 250 件をまとめて作ります。レッスン1-1 で点検のレコード名を
   **自動採番**にしてあるので、名前を入れなくても保存できます(テキストのままだと `Name` が
   必須項目で、この `insert` は `REQUIRED_FIELD_MISSING` で止まります)

```apex
List<Inspection__c> rows = new List<Inspection__c>();
for (Integer i = 0; i < 250; i++) { rows.add(new Inspection__c()); }
insert rows;
```

4. **ログを見る** — 開発者コンソールの Logs から、`件数:` の出力が 200 と 50 に分かれていることを確かめます
5. **後片付け** — 作ったレコードとトリガは削除しておきます

```text
確かめること
- 250 件を 1 回で insert しても、トリガは 200 件と 50 件の 2 回に分かれて呼ばれる
- before insert なので、値を書き換えるだけで保存されている(update を書いていない)
```

## 演習問題

### 問1(基本)

`before insert` と `after insert` のどちらを使うべきか、次の 2 つについて答えてください。

1. 保存する点検レコードの「結果」項目が空なら既定値を入れる
2. 点検が作られたら、ひもづく点検明細を 1 件自動で作る

### 問2(基本)

次のトリガの問題点を 1 文で指摘してください。

```apex
trigger OrderTrigger on Order__c (before insert) {
  Order__c order = Trigger.new[0];
  order.Status__c = '受付';
}
```

### 問3(応用)

次のトリガを、一括処理の作法に沿って書き直してください。書き直したコードと、SOQL の回数がどう変わるかを説明してください。

```apex
trigger OrderTrigger on Order__c (before insert) {
  for (Order__c order : Trigger.new) {
    Account acc = [SELECT Name FROM Account WHERE Id = :order.AccountId__c];
    order.AccountName__c = acc.Name;
  }
}
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

1 は `before insert` です。保存される前の値を書き換えるだけなので、DML は要りません。2 は `after insert` です。子レコードを作るには親の ID が確定している必要があり、ID が付くのは保存後だからです。

</details>

<details>
<summary>問2の解答例</summary>

`Trigger.new[0]` と先頭 1 件だけを処理しているため、束で呼ばれたときに残りのレコードが処理されません。

</details>

<details>
<summary>問3の解答例</summary>

先に必要な取引先の ID を集め、1 回の SOQL でまとめて取り、マップで引きます。

```apex
trigger OrderTrigger on Order__c (before insert) {
  Set<Id> accountIds = new Set<Id>();
  for (Order__c order : Trigger.new) { accountIds.add(order.AccountId__c); }
  Map<Id, Account> accounts = new Map<Id, Account>(
    [SELECT Name FROM Account WHERE Id IN :accountIds]);
  for (Order__c order : Trigger.new) {
    order.AccountName__c = accounts.get(order.AccountId__c).Name;
  }
}
```

元のコードは 200 件の束で SOQL が 200 回走り、上限の 100 回を超えて止まります。書き直した形なら、件数に関わらず SOQL は 1 回です。

</details>

## 確認クイズ

### Q1. `before insert` トリガの中で自分のレコードの項目を書き換えたあと、必要なものはどれですか。

- A. `insert` を呼ぶ
- B. `update` を呼ぶ
- C. 何も呼ばなくてよい

<details>
<summary>答え</summary>

**C** — 保存される前の値を触っているだけなので、そのまま保存されます。ここで DML を呼ぶと同じトリガが再び走ります。

</details>

### Q2. 1,000 件をまとめて `insert` したとき、トリガはどう呼ばれますか。

- A. 1 件ずつ 1,000 回
- B. 最大 200 件ずつの束で複数回
- C. 1,000 件まとめて 1 回

<details>
<summary>答え</summary>

**B** — 200 件ずつ 5 回に分かれます。`Trigger.new` に 200 件入る前提で書きます。

</details>

### Q3. `Trigger.new[0]` だけを処理するトリガの問題はどれですか。

- A. 構文エラーになる
- B. 先頭の 1 件しか処理されず、残りは無言で処理されない
- C. 必ず例外になる

<details>
<summary>答え</summary>

**B** — 画面から 1 件保存するテストは通ってしまうため、取り込みを流すまで気づけません。

</details>

### Q4. ループの中で SOQL を呼ぶコードへの対処として、正しいものはどれですか。

- A. `try` / `catch` で例外を捕まえる
- B. 上限の引き上げを申請する
- C. 必要な ID を先に集め、ループの外で 1 回だけ問い合わせる

<details>
<summary>答え</summary>

**C** — ガバナ制限の例外は捕まえられず、上限も引き上げられません。書き方を直す以外に手はありません。

</details>

### Q5. ガバナ制限を超えたとき、そのトランザクションのデータ変更はどうなりますか。

- A. 成功した分だけ残る
- B. すべて巻き戻る
- C. 一時領域に保存され、あとで再開できる

<details>
<summary>答え</summary>

**B** — ロールバックされます。「一部だけ入る」ことを期待した設計はできません。

</details>
