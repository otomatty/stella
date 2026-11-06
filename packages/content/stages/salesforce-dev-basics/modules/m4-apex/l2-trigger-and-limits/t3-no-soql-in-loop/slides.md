---
id: 4-2-3
title: ループの中にSOQLとDMLを置かない
takeaway: "SOQL と DML はループの外に出し、ループの中では変数だけを触る"
introduces: [ループ, マップ]
requires: [SOQL, DML, トリガ, Trigger.new, リスト, 一括処理, ガバナ制限, バッチサイズ, 変数, 親レコード]
header: "Salesforce開発入門"
---

<!-- _class: lead -->

# 4-2-3
# ループの中にSOQLとDMLを置かない

Salesforce開発入門 — Module 4 / レッスン4-2

<!-- ノート: レビューでいちばん指摘される点です。この講座で1つだけ持ち帰るならこれ、というトピックです。 -->

---

## なぜ必要か

- 200 件の束の中で 1 件ずつ親を取りに行くと、SOQL が 200 回になる
- 上限は 100 回なので、途中で止まる

<!-- ノート: つかみ。4-2-2の束と0-1-2の上限が、ここで正面からぶつかる。数字を並べて見せると納得が早い。 -->

---

## 結論

**SOQL と DML はループの外に出し、ループの中では変数だけを触る**

- **ループ** — リストの要素を 1 つずつ処理するくり返し
- **マップ** — 鍵と値の組で持っておく入れ物

<!-- ノート: 結論を言い切る。マップは「先にまとめて取ってきたものを引くための索引」として使う、と役割で説明する。 -->

---

## 危ない書き方

```apex
for (Order__c order : Trigger.new) {
  Account acc = [SELECT Name FROM Account WHERE Id = :order.AccountId__c];
  order.AccountName__c = acc.Name;
}
```

- ループの回数だけ SOQL が走る

<!-- ノート: 失敗例のコード。件数に比例してSOQLが増える形。開発組織の数件では動いてしまうのが厄介なところ。 -->

---

## まとめて取ってから回す

```apex
Map<Id, Account> accounts = new Map<Id, Account>(
  [SELECT Name FROM Account WHERE Id IN :accountIds]);
for (Order__c order : Trigger.new) {
  order.AccountName__c = accounts.get(order.AccountId__c).Name;
}
```

- SOQL は 1 回。ループの中は変数の操作だけ

<!-- ノート: 対比枠。修正形。IN句にリストを渡してまとめて取り、Mapで引く。この「先に集める → 回す」が一括処理の型だと締める。 -->

---

<!-- _class: summary -->

## まとめ

**SOQL と DML はループの外に出し、ループの中では変数だけを触る**

<!-- ノート: 結論の再掲だけ。守れなかったときに何が起きるのか、という問いを残して締める。 -->
