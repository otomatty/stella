# レッスン5-1 演習 — テストとデバッグ

対象トピック: 5-1-1 〜 5-1-4

## 手元で試す

Developer Edition 組織で、テストクラスを書いて実行します。

1. **対象のクラスを作る** — 設定 →「Apex クラス」→「新規」で次を保存します

```apex
public with sharing class AccountService {
  public static Integer countByIndustry(String industry) {
    return [SELECT COUNT() FROM Account WHERE Industry = :industry];
  }
}
```

2. **テストクラスを作る** — もう 1 つクラスを作ります

```apex
@isTest
private class AccountServiceTest {
  @isTest
  static void countsManufacturing() {
    List<Account> rows = new List<Account>();
    for (Integer i = 0; i < 3; i++) {
      rows.add(new Account(Name = 'テスト商事 ' + i, Industry = 'Manufacturing'));
    }
    insert rows;
    Integer actual = AccountService.countByIndustry('Manufacturing');
    Assert.areEqual(3, actual, '作成した件数と一致していない');
  }
}
```

3. **実行する** — 開発者コンソール →「Test」→「New Run」で実行し、成功することを確かめます
4. **カバー率を見る** — 設定 →「Apex テスト実行」または開発者コンソールの Overall Code Coverage で、`AccountService` のカバー率を確かめます
5. **わざと落とす** — 期待値の `3` を `4` に変え、失敗時のメッセージが出ることを確かめます
6. **ログを読む** — テスト実行後の Logs を開き、`SOQL_EXECUTE_BEGIN` と `LIMIT_USAGE` を探します

```text
確かめること
- テストで insert した取引先は、実行後に組織へ残っていない
- 期待値を変えると、Assert のメッセージがそのまま失敗理由として出る
```

## 演習問題

### 問1(基本)

テストクラスに付ける注釈と、その付ける場所を答えてください。

### 問2(基本)

同僚のテストは「対象のメソッドを呼ぶだけ」で、カバー率は 85% あります。このテストで守れているものと、守れていないものを 1〜2 文で説明してください。

### 問3(応用)

4-2-2 で扱った「先頭 1 件しか処理しないトリガ」を、テストで見つけるにはどう書けばよいですか。テストの方針を 2〜3 文で説明してください。

## 解答例と解説

<details>
<summary>問1の解答例</summary>

`@isTest` を、テストクラスの宣言とテストメソッドの宣言の 2 か所に付けます。

</details>

<details>
<summary>問2の解答例</summary>

守れているのはカバー率、つまりリリースの関門を通せることだけです。期待した値になっているかを確かめていないので、ふるまいが壊れても気づけません。アサーションを足す必要があります。

</details>

<details>
<summary>問3の解答例</summary>

テストデータを 1 件ではなく 200 件作り、リストでまとめて `insert` します。そのうえで、全件が期待どおり処理されたかをアサーションで確かめます。1 件だけのテストでは先頭 1 件が処理されて通ってしまうため、束で呼ばれる状況を作らないと見つかりません。

</details>

## 確認クイズ

### Q1. Apex を本番組織へリリースするために必要なコードカバー率はどれですか。

- A. 50% 以上
- B. 75% 以上
- C. 100%

<details>
<summary>答え</summary>

**B** — 目安ではなく関門です。74% ではリリースが止まります。加えて、デプロイするトリガはどれも最低 1 行のカバレッジが必要で、全体が 75% を超えていても素通しのトリガが 1 つあれば止まります。

</details>

### Q2. Apex テストとデータの関係として正しいものはどれですか。

- A. 組織にある既存のレコードをそのまま使える
- B. 既定では組織のデータを見ないので、必要なレコードはテストの中で作る
- C. テストで作ったレコードは本番組織に残る

<details>
<summary>答え</summary>

**B** — 組織ごとにデータが違うため、既存データに頼るテストは移した先で壊れます。テストで作ったレコードは実行後に残りません。

</details>

### Q3. アサーションが 1 つも無いテストについて、正しいものはどれですか。

- A. カバー率は稼げるが、ふるまいが壊れても気づけない
- B. カバー率にも数えられない
- C. 実行時にエラーになる

<details>
<summary>答え</summary>

**A** — 通ったことと正しいことは違います。カバー率は関門を通る数字にすぎません。

</details>

### Q4. トリガが束で正しく動くことを確かめるテストとして、いちばん適切なものはどれですか。

- A. レコードを 1 件だけ作って保存する
- B. レコードを 200 件作り、リストでまとめて保存する
- C. レコードを作らずにメソッドだけ呼ぶ

<details>
<summary>答え</summary>

**B** — 先頭 1 件しか処理しないコードは、1 件のテストでは通ってしまいます。

</details>

### Q5. ループの中で SOQL を呼んでいないかを確かめたいとき、デバッグログで見るべきものはどれですか。

- A. `FATAL_ERROR` だけを見る
- B. `SOQL_EXECUTE_BEGIN` の回数と `LIMIT_USAGE` を見る
- C. ログでは確かめられない

<details>
<summary>答え</summary>

**B** — クエリが何回走ったかと、上限をどこまで使ったかが数字で出ます。ループの中の SOQL を見つける最短経路です。

</details>
