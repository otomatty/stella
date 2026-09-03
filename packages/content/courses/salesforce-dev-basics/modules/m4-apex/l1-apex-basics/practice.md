# レッスン4-1 演習 — Apex の基本

対象トピック: 4-1-1 〜 4-1-4

## 手元で試す

開発者コンソールの「匿名実行」で、Apex を動かします(Developer Edition 組織で行ってください)。

1. **匿名実行を開く** — 開発者コンソール →「Debug」→「Open Execute Anonymous Window」
2. **レコードを 1 件作る** — 次を貼り付けて実行し、取引先タブに `匿名実行テスト` が増えることを確かめます

```apex
Account acc = new Account(Name = '匿名実行テスト');
insert acc;
System.debug('作成した ID: ' + acc.Id);
```

3. **DML を忘れてみる** — `insert acc;` の行を消して実行し、画面にレコードが増えないことを確かめます。エラーは出ません
4. **リストでまとめて作る** — 次を実行し、3 件が 1 回の `insert` で作られることを確かめます

```apex
List<Account> rows = new List<Account>();
for (Integer i = 0; i < 3; i++) {
  rows.add(new Account(Name = 'まとめて作成 ' + i));
}
insert rows;
```

5. **後片付け** — 作ったレコードは削除しておきます

```text
確かめること
- insert を書かないと、変数を作っただけでは何も保存されない
- insert の後、acc.Id に値が入っている
```

## 演習問題

### 問1(基本)

`Account` を 1 件作り、名前を `北星建設`、電話を `011-333-4444` にして保存する Apex を書いてください。

### 問2(基本)

同僚のコードが「項目を書き換えたのに画面に反映されない」と言っています。原因として何を疑いますか。1 文で答えてください。

### 問3(応用)

次のコードは 500 件のレコードを作ります。何が問題で、どう直しますか。直したコードも書いてください。

```apex
for (Integer i = 0; i < 500; i++) {
  Account acc = new Account(Name = '取引先 ' + i);
  insert acc;
}
```

## 解答例と解説

<details>
<summary>問1の解答例</summary>

```apex
Account acc = new Account(Name = '北星建設', Phone = '011-333-4444');
insert acc;
```

`new` で作った時点ではメモリの中の話なので、`insert` を忘れると保存されません。

</details>

<details>
<summary>問2の解答例</summary>

変数を書き換えただけで DML(`update`)を呼んでいないことを疑います。

</details>

<details>
<summary>問3の解答例</summary>

ループの中で `insert` を呼んでいるため、DML が 500 回走り、上限の 150 回を超えて途中で止まります。リストにためて、ループの外で 1 回だけ `insert` します。

```apex
List<Account> rows = new List<Account>();
for (Integer i = 0; i < 500; i++) {
  rows.add(new Account(Name = '取引先 ' + i));
}
insert rows;
```

DML は 1 件でもリストでも 1 回と数えられるので、これで回数は 1 になります。

</details>

## 確認クイズ

### Q1. Apex が動く場所として正しいものはどれですか。

- A. 利用者のブラウザの中
- B. Salesforce のサーバー上
- C. 開発者の PC 上

<details>
<summary>答え</summary>

**B** — サーバー上で動くので、手元のデバッガで途中を覗くことはできません。

</details>

### Q2. `Account acc = new Account(Name = '富士商事');` を実行しただけのとき、データベースはどうなっていますか。

- A. 取引先が 1 件作られている
- B. 何も作られていない
- C. 下書き状態で保存されている

<details>
<summary>答え</summary>

**B** — 変数を作っただけです。DML(`insert`)を呼んで初めて保存されます。

</details>

### Q3. 外部 ID を鍵にして「あれば更新、無ければ作成」を行う DML はどれですか。

- A. `insert`
- B. `update`
- C. `upsert`

<details>
<summary>答え</summary>

**C** — 取り込み処理の定石です。`insert` を使うと流すたびに重複が増えます。

</details>

### Q4. 200 件のレコードを保存するとき、DML の回数を最も少なくできる書き方はどれですか。

- A. ループの中で 1 件ずつ `insert` する
- B. リストにためて、ループの外で 1 回 `insert` する
- C. 100 件ずつ 2 回に分けて `insert` する

<details>
<summary>答え</summary>

**B** — DML は 1 件でもリストでも 1 回と数えられます。まとめたほうが常に得です。

</details>

### Q5. ガバナ制限が数え直される単位はどれですか。

- A. 1 つのクラスごと
- B. 1 つのトランザクションごと
- C. 1 日ごと

<details>
<summary>答え</summary>

**B** — ユーザの 1 回の操作が 1 トランザクションです。巻き戻る単位も同じです。

</details>
